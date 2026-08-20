-- ============================================================================
-- SetHub — 0004 SETS, DEPARTMENTS, MEMBERSHIPS, INVITES
--
-- ARCHITECTURAL RULE (enforced by every policy in this schema):
--   One person -> one account -> MANY independent set memberships.
--   Everything school-specific hangs off `set_memberships`, never off `profiles`.
--   A university set may contain DEPARTMENTS, each a closed sub-community that
--   can still see and participate in set-wide space.
-- ============================================================================

create table if not exists sets (
  id                    uuid primary key default gen_random_uuid(),
  institution_id        uuid not null references institutions(id) on delete restrict,
  graduation_year       int  not null check (graduation_year between 1960 and 2100),
  entry_year            int  check (entry_year between 1950 and 2100),
  programme_level       text not null default 'main'
                        check (programme_level in ('main','undergraduate','postgraduate','diploma','masters','phd','part_time')),
  name                  text not null,                       -- "Class of 2012"
  slug                  text not null,
  description           text,
  motto                 text,
  logo_url              text,
  cover_url             text,
  currency              char(3) not null default 'NGN',
  timezone              text not null default 'Africa/Lagos',
  join_policy           text not null default 'request'
                        check (join_policy in ('open','request','invite_only','closed')),
  discoverable          boolean not null default true,
  departments_enabled   boolean not null default false,      -- turns on the sub-community layer
  department_required   boolean not null default false,      -- must pick one at onboarding
  owner_id              uuid references profiles(id) on delete set null,
  status                verification_status not null default 'pending',
  verified_at           timestamptz,
  verified_by           uuid references profiles(id),
  member_count          int not null default 0,
  settings              jsonb not null default '{}'::jsonb,
  archived_at           timestamptz,
  created_by            uuid references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (institution_id, slug),
  unique (institution_id, graduation_year, programme_level)
);
create index if not exists sets_institution_idx on sets (institution_id, graduation_year desc);
select app.attach_touch('sets');

-- Departments inside a set. Closed sub-community, still nested in the set.
create table if not exists set_departments (
  id                        uuid primary key default gen_random_uuid(),
  set_id                    uuid not null references sets(id) on delete cascade,
  institution_department_id uuid references institution_departments(id) on delete set null,
  faculty_id                uuid references institution_faculties(id) on delete set null,
  name                      text not null,
  slug                      text not null,
  short_name                text,
  description               text,
  logo_url                  text,
  color                     text default '#0898A0',
  icon                      text,
  join_policy               text not null default 'open'
                            check (join_policy in ('open','request','invite_only','closed')),
  is_visible_to_set         boolean not null default true,   -- other departments can see it exists
  member_count              int not null default 0,
  archived_at               timestamptz,
  created_by                uuid references profiles(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (set_id, slug),
  unique (set_id, institution_department_id)
);
create index if not exists set_departments_set_idx on set_departments (set_id);
select app.attach_touch('set_departments');

-- ---------------------------------------------------------------------------
-- MEMBERSHIP — the join between a person and a set. This IS the school profile.
-- ---------------------------------------------------------------------------
create table if not exists set_memberships (
  id                    uuid primary key default gen_random_uuid(),
  set_id                uuid not null references sets(id) on delete cascade,
  user_id               uuid not null references profiles(id) on delete cascade,
  status                membership_status not null default 'pending',

  -- Set-specific profile (deliberately NOT on `profiles`)
  nickname              text,
  school_name_used      text,                 -- name they were known by in school
  student_id            text,                 -- NEVER exposed publicly; admins only
  admission_year        int,
  graduation_year       int,
  class_arm             text,                 -- "5A", "Science 2"
  course                text,                 -- "B.Sc. Computer Science"
  faculty_id            uuid references institution_faculties(id) on delete set null,
  department_id         uuid references set_departments(id) on delete set null, -- primary dept
  house_id              uuid references institution_houses(id) on delete set null,
  hostel_id             uuid references institution_hostels(id) on delete set null,
  hostel_room           text,
  was_prefect           boolean not null default false,
  prefect_position      text,
  prefect_year          int,
  sports_house          text,
  clubs                 text[] not null default '{}',
  fun_fact              text,

  -- Lifecycle
  verification          verification_status not null default 'unverified',
  verification_note     text,
  verified_by           uuid references profiles(id),
  verified_at           timestamptz,
  is_founder            boolean not null default false,
  invited_by            uuid references profiles(id),
  invite_id             uuid,
  approved_by           uuid references profiles(id),
  approved_at           timestamptz,
  suspended_until       timestamptz,
  suspension_reason     text,
  left_at               timestamptz,
  last_active_at        timestamptz,
  joined_at             timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- THE constraint: a person may belong to many sets, but only once per set.
  unique (set_id, user_id)
);
create index if not exists memberships_user_idx    on set_memberships (user_id, status);
create index if not exists memberships_set_idx     on set_memberships (set_id, status);
create index if not exists memberships_dept_idx    on set_memberships (department_id);
create index if not exists memberships_house_idx   on set_memberships (house_id);
create index if not exists memberships_hostel_idx  on set_memberships (hostel_id);
create index if not exists memberships_prefect_idx on set_memberships (set_id) where was_prefect;
select app.attach_touch('set_memberships');

-- Department membership. A person can sit in more than one (dual major, transfer).
create table if not exists department_memberships (
  id             uuid primary key default gen_random_uuid(),
  department_id  uuid not null references set_departments(id) on delete cascade,
  membership_id  uuid not null references set_memberships(id) on delete cascade,
  role           text not null default 'member' check (role in ('member','moderator','admin','coordinator')),
  status         membership_status not null default 'active',
  is_primary     boolean not null default false,
  joined_at      timestamptz not null default now(),
  approved_by    uuid references profiles(id),
  created_at     timestamptz not null default now(),
  unique (department_id, membership_id)
);
create index if not exists dept_memberships_member_idx on department_memberships (membership_id, status);
create index if not exists dept_memberships_dept_idx   on department_memberships (department_id, status);

-- Ownership history (transfer of a set).
create table if not exists set_ownership_transfers (
  id           uuid primary key default gen_random_uuid(),
  set_id       uuid not null references sets(id) on delete cascade,
  from_user    uuid references profiles(id),
  to_user      uuid not null references profiles(id),
  reason       text,
  accepted_at  timestamptz,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INVITES — shareable links / codes / QR. Set admins AND department admins can
-- issue them. Scope decides what the recipient lands in.
-- ---------------------------------------------------------------------------
create table if not exists invites (
  id             uuid primary key default gen_random_uuid(),
  scope          invite_scope not null,
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  group_id       uuid,                      -- FK added in 0007
  channel_id     uuid,                      -- FK added in 0006
  token          text not null unique default encode(gen_random_bytes(16), 'hex'),
  code           text unique,               -- short human-typeable code, e.g. UNILAG12-4KQ9
  label          text,
  email          citext,                    -- set for single-recipient email invites
  message        text,
  auto_approve   boolean not null default true,
  grant_role_id  uuid,                      -- FK added in 0005
  max_uses       int check (max_uses is null or max_uses > 0),
  use_count      int not null default 0,
  expires_at     timestamptz,
  revoked_at     timestamptz,
  revoked_by     uuid references profiles(id),
  created_by     uuid not null references profiles(id),
  created_at     timestamptz not null default now(),
  constraint invite_scope_target check (
    (scope = 'set'        and department_id is null and group_id is null and channel_id is null) or
    (scope = 'department' and department_id is not null) or
    (scope = 'group'      and group_id is not null) or
    (scope = 'channel'    and channel_id is not null)
  )
);
create index if not exists invites_set_idx   on invites (set_id, created_at desc);
create index if not exists invites_token_idx on invites (token) where revoked_at is null;

create table if not exists invite_redemptions (
  id           uuid primary key default gen_random_uuid(),
  invite_id    uuid not null references invites(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  ip           inet,
  user_agent   text,
  redeemed_at  timestamptz not null default now(),
  unique (invite_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Member counters
-- ---------------------------------------------------------------------------
create or replace function app.sync_set_member_count()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare target uuid := coalesce(new.set_id, old.set_id);
begin
  update sets s set member_count = (
    select count(*) from set_memberships m where m.set_id = target and m.status = 'active'
  ) where s.id = target;
  return null;
end $$;

drop trigger if exists trg_set_member_count on set_memberships;
create trigger trg_set_member_count
  after insert or update of status or delete on set_memberships
  for each row execute function app.sync_set_member_count();

create or replace function app.sync_department_member_count()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare target uuid := coalesce(new.department_id, old.department_id);
begin
  update set_departments d set member_count = (
    select count(*) from department_memberships dm
     where dm.department_id = target and dm.status = 'active'
  ) where d.id = target;
  return null;
end $$;

drop trigger if exists trg_dept_member_count on department_memberships;
create trigger trg_dept_member_count
  after insert or update of status or delete on department_memberships
  for each row execute function app.sync_department_member_count();

-- Keep set_memberships.department_id in step with the primary department row.
create or replace function app.sync_primary_department()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if new.is_primary then
    update department_memberships
       set is_primary = false
     where membership_id = new.membership_id and id <> new.id;
    update set_memberships set department_id = new.department_id where id = new.membership_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_primary_department on department_memberships;
create trigger trg_primary_department
  after insert or update of is_primary on department_memberships
  for each row execute function app.sync_primary_department();
