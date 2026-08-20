-- ============================================================================
-- SetHub — 0005 ROLES, PERMISSIONS, EXCO
--
-- Three separate concepts, deliberately not collapsed:
--   OWNER  - exactly one person per set, can transfer.
--   EXCO   - elected/appointed office (President, Treasurer...). Ceremonial + real.
--   ROLES  - the permission grants that actually gate the software.
-- A person can hold any combination. Permissions are ALWAYS scoped to one set
-- (or one department inside it) and never leak across workspaces.
-- ============================================================================

-- Reference list of every permission the platform understands.
create table if not exists permissions (
  key         text primary key,
  category    text not null,
  label       text not null,
  description text,
  dept_scoped boolean not null default false,  -- can be granted at department level
  sort_order  int not null default 0
);

insert into permissions (key, category, label, dept_scoped, sort_order) values
  -- Members
  ('members.view',            'Members','View member directory',            true, 10),
  ('members.approve',         'Members','Approve join requests',            true, 11),
  ('members.remove',          'Members','Remove members',                   true, 12),
  ('members.suspend',         'Members','Suspend members',                  true, 13),
  ('members.invite',          'Members','Invite members / create invite links', true, 14),
  ('members.edit_profile',    'Members','Edit member set-profiles',          true, 15),
  ('members.view_student_id', 'Members','View student identification numbers', false, 16),
  ('members.export',          'Members','Export member list',               true, 17),
  -- Departments
  ('departments.create',      'Departments','Create departments',           false, 20),
  ('departments.edit',        'Departments','Edit departments',             true,  21),
  ('departments.archive',     'Departments','Archive departments',          false, 22),
  ('departments.manage_members','Departments','Manage department members',  true,  23),
  -- EXCO
  ('exco.assign',             'EXCO','Assign EXCO positions',               false, 30),
  ('exco.remove',             'EXCO','Remove EXCO members',                 false, 31),
  ('exco.manage_terms',       'EXCO','Manage EXCO terms',                   false, 32),
  -- Roles
  ('roles.manage',            'Administration','Create & edit roles',       false, 40),
  ('roles.assign',            'Administration','Assign roles to members',   true,  41),
  ('settings.manage',         'Administration','Manage set settings',       false, 42),
  ('ownership.transfer',      'Administration','Transfer ownership',        false, 43),
  ('audit.view',              'Administration','View the audit log',        false, 44),
  ('integrations.manage',     'Administration','Manage integrations & webhooks', true, 45),
  -- Communication
  ('channels.create',         'Communication','Create channels',            true, 50),
  ('channels.edit',           'Communication','Edit / archive channels',    true, 51),
  ('channels.delete',         'Communication','Delete channels',            true, 52),
  ('messages.moderate',       'Communication','Moderate messages',          true, 53),
  ('messages.pin',            'Communication','Pin messages',               true, 54),
  ('announcements.create',    'Communication','Create announcements',       true, 55),
  ('announcements.manage',    'Communication','Edit & delete announcements',true, 56),
  ('broadcast.send',          'Communication','Broadcast to WhatsApp/SMS/email', true, 57),
  -- Groups
  ('groups.create',           'Groups','Create groups & committees',        true, 60),
  ('groups.manage',           'Groups','Manage groups & committees',        true, 61),
  -- Events
  ('events.create',           'Events','Create events',                     true, 70),
  ('events.manage',           'Events','Edit & delete events',              true, 71),
  ('events.attendance',       'Events','Manage attendance & RSVPs',         true, 72),
  -- Governance
  ('polls.create',            'Governance','Create polls',                  true, 80),
  ('quizzes.create',          'Governance','Create quizzes & trivia',       true, 81),
  ('elections.create',        'Governance','Create elections',              false, 82),
  ('elections.manage',        'Governance','Manage candidates & eligibility',false, 83),
  ('elections.publish',       'Governance','Publish election results',      false, 84),
  -- Finance
  ('finance.view',            'Finance','View finances',                    true, 90),
  ('finance.dues_manage',     'Finance','Create & assign dues',             true, 91),
  ('finance.payments_confirm','Finance','Confirm payments',                 true, 92),
  ('finance.expenses_record', 'Finance','Record expenses',                  true, 93),
  ('finance.expenses_approve','Finance','Approve expenses',                 true, 94),
  ('finance.statements',      'Finance','Upload financial statements',      true, 95),
  ('finance.reports_publish', 'Finance','Publish financial reports',        true, 96),
  ('finance.export',          'Finance','Export financial data',            true, 97),
  ('donations.manage',        'Finance','Manage donation campaigns',        true, 98),
  -- Projects
  ('projects.propose',        'Projects','Propose projects',                false, 100),
  ('projects.create',         'Projects','Create projects',                 false, 101),
  ('projects.manage',         'Projects','Edit projects & budgets',         false, 102),
  ('projects.publish_update', 'Projects','Post project updates',            false, 103),
  -- Content
  ('albums.manage',           'Content','Manage albums & galleries',        true, 110),
  ('documents.manage',        'Content','Upload & manage documents',        true, 111),
  ('links.manage',            'Content','Manage useful links',              true, 112),
  -- Moderation
  ('moderation.reports',      'Moderation','Handle reports',                true, 120),
  ('moderation.ban',          'Moderation','Ban members',                   false, 121)
on conflict (key) do update set
  category = excluded.category, label = excluded.label,
  dept_scoped = excluded.dept_scoped, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- ROLES. department_id = null -> set-wide role. Otherwise department-scoped.
-- ---------------------------------------------------------------------------
create table if not exists set_roles (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  key            text not null,
  name           text not null,
  description    text,
  color          text default '#0898A0',
  icon           text,
  permissions    text[] not null default '{}',
  is_system      boolean not null default false,   -- seeded template, cannot be deleted
  is_owner_role  boolean not null default false,   -- implicit full access
  rank           int not null default 100,         -- lower = more senior
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- NULL department_id means "set-wide", so uniqueness needs a coalesced index
-- rather than a plain UNIQUE constraint (NULLs never collide in Postgres).
create unique index if not exists set_roles_key_uniq
  on set_roles (set_id, coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid), key);
create index if not exists set_roles_set_idx on set_roles (set_id);
select app.attach_touch('set_roles');

create table if not exists member_roles (
  id             uuid primary key default gen_random_uuid(),
  membership_id  uuid not null references set_memberships(id) on delete cascade,
  role_id        uuid not null references set_roles(id) on delete cascade,
  status         text not null default 'accepted' check (status in ('invited','accepted','declined','revoked')),
  assigned_by    uuid references profiles(id),
  responded_at   timestamptz,
  expires_at     timestamptz,
  created_at     timestamptz not null default now(),
  unique (membership_id, role_id)
);
create index if not exists member_roles_member_idx on member_roles (membership_id, status);

alter table invites
  drop constraint if exists invites_grant_role_id_fkey,
  add constraint invites_grant_role_id_fkey
  foreign key (grant_role_id) references set_roles(id) on delete set null;

-- ---------------------------------------------------------------------------
-- EXCO
-- ---------------------------------------------------------------------------
create table if not exists exco_terms (
  id          uuid primary key default gen_random_uuid(),
  set_id      uuid not null references sets(id) on delete cascade,
  name        text not null,                   -- "2024 - 2026 Executive"
  starts_on   date not null,
  ends_on     date,
  is_current  boolean not null default false,
  notes       text,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  unique (set_id, name)
);
create unique index if not exists exco_terms_one_current
  on exco_terms (set_id) where is_current;

create table if not exists exco_positions (
  id            uuid primary key default gen_random_uuid(),
  set_id        uuid references sets(id) on delete cascade,  -- null = platform template
  department_id uuid references set_departments(id) on delete cascade,
  name          text not null,
  description   text,
  rank          int not null default 100,
  seats         int not null default 1,
  is_system     boolean not null default false,
  default_role_id uuid references set_roles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists exco_positions_set_idx on exco_positions (set_id, rank);
create unique index if not exists exco_positions_uniq
  on exco_positions (coalesce(set_id,'00000000-0000-0000-0000-000000000000'::uuid),
                     coalesce(department_id,'00000000-0000-0000-0000-000000000000'::uuid), name);

create table if not exists exco_appointments (
  id            uuid primary key default gen_random_uuid(),
  term_id       uuid not null references exco_terms(id) on delete cascade,
  position_id   uuid not null references exco_positions(id) on delete cascade,
  membership_id uuid not null references set_memberships(id) on delete cascade,
  status        text not null default 'invited' check (status in ('invited','accepted','declined','removed','completed')),
  elected_via   uuid,                          -- FK to elections, added in 0009
  invited_by    uuid references profiles(id),
  responded_at  timestamptz,
  removed_at    timestamptz,
  removal_reason text,
  created_at    timestamptz not null default now(),
  unique (term_id, position_id, membership_id)
);
create index if not exists exco_appts_member_idx on exco_appointments (membership_id, status);

-- ---------------------------------------------------------------------------
-- CORE AUTHORISATION HELPERS
-- Every one is SECURITY DEFINER + STABLE so RLS policies can call them without
-- recursing back through RLS on the tables they read.
-- ---------------------------------------------------------------------------

create or replace function app.membership_id(p_set uuid, p_user uuid default auth.uid())
returns uuid language sql stable security definer set search_path = public, app as $$
  select m.id from set_memberships m
   where m.set_id = p_set and m.user_id = p_user and m.status = 'active'
   limit 1;
$$;

create or replace function app.is_set_member(p_set uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from set_memberships m
     where m.set_id = p_set and m.user_id = p_user and m.status = 'active'
  );
$$;

create or replace function app.is_set_owner(p_set uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (select 1 from sets s where s.id = p_set and s.owner_id = p_user);
$$;

create or replace function app.my_set_ids(p_user uuid default auth.uid())
returns setof uuid language sql stable security definer set search_path = public, app as $$
  select m.set_id from set_memberships m where m.user_id = p_user and m.status = 'active';
$$;

create or replace function app.my_department_ids(p_user uuid default auth.uid())
returns setof uuid language sql stable security definer set search_path = public, app as $$
  select dm.department_id
    from department_memberships dm
    join set_memberships m on m.id = dm.membership_id
   where m.user_id = p_user and m.status = 'active' and dm.status = 'active';
$$;

create or replace function app.is_department_member(p_dept uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from department_memberships dm
      join set_memberships m on m.id = dm.membership_id
     where dm.department_id = p_dept and m.user_id = p_user
       and m.status = 'active' and dm.status = 'active'
  );
$$;

create or replace function app.is_department_admin(p_dept uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from department_memberships dm
      join set_memberships m on m.id = dm.membership_id
     where dm.department_id = p_dept and m.user_id = p_user
       and m.status = 'active' and dm.status = 'active'
       and dm.role in ('admin','coordinator')
  );
$$;

-- Effective permission set for a person inside one set, optionally narrowed to
-- a department. Owner => everything. Set-wide roles apply everywhere in the set;
-- department roles apply only inside that department.
create or replace function app.permissions_for(p_set uuid, p_dept uuid default null, p_user uuid default auth.uid())
returns text[] language sql stable security definer set search_path = public, app as $$
  select case
    when app.is_set_owner(p_set, p_user) or app.is_platform_admin(p_user)
      then (select coalesce(array_agg(key), '{}') from permissions)
    else coalesce((
      select array_agg(distinct perm)
        from set_memberships m
        join member_roles mr on mr.membership_id = m.id and mr.status = 'accepted'
                            and (mr.expires_at is null or mr.expires_at > now())
        join set_roles r on r.id = mr.role_id
        cross join lateral unnest(r.permissions) as perm
       where m.set_id = p_set and m.user_id = p_user and m.status = 'active'
         and (r.department_id is null or r.department_id = p_dept)
    ), '{}')
  end;
$$;

create or replace function app.has_perm(p_set uuid, p_perm text, p_dept uuid default null, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select p_perm = any (app.permissions_for(p_set, p_dept, p_user))
      or (p_dept is not null and app.is_department_admin(p_dept, p_user)
          and exists (select 1 from permissions pp where pp.key = p_perm and pp.dept_scoped));
$$;

-- "Is this person any kind of administrator in this set?"
create or replace function app.is_set_admin(p_set uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select app.is_set_owner(p_set, p_user)
      or app.is_platform_admin(p_user)
      or exists (
        select 1 from set_memberships m
          join member_roles mr on mr.membership_id = m.id and mr.status = 'accepted'
          join set_roles r on r.id = mr.role_id
         where m.set_id = p_set and m.user_id = p_user and m.status = 'active'
           and r.department_id is null
           and (r.is_owner_role or cardinality(r.permissions) > 0)
      );
$$;

grant execute on all functions in schema app to authenticated;

-- ---------------------------------------------------------------------------
-- Seeding a brand new set: default roles, EXCO positions, #general, term.
-- ---------------------------------------------------------------------------
create or replace function app.seed_set_defaults(p_set uuid, p_owner uuid)
returns void language plpgsql security definer set search_path = public, app as $$
declare
  v_all text[];
  v_owner_role uuid;
  v_membership uuid;
begin
  select coalesce(array_agg(key), '{}') into v_all from permissions;

  insert into set_roles (set_id, key, name, description, permissions, is_system, is_owner_role, rank, color)
  values
    (p_set,'owner','Set Owner','Full, unrestricted control of the set.', v_all, true, true, 0, '#0898A0'),
    (p_set,'admin','Set Administrator','Full administrative control.', v_all, true, false, 5, '#0898A0'),
    (p_set,'president','President','Governance and leadership.', array[
        'members.view','members.approve','members.invite','announcements.create','announcements.manage',
        'events.create','events.manage','polls.create','exco.assign','finance.view','projects.propose',
        'projects.create','audit.view','groups.create','groups.manage','broadcast.send'], true, false, 10, '#1B1B2F'),
    (p_set,'vice_president','Vice President','Leadership support.', array[
        'members.view','members.approve','announcements.create','events.create','events.manage',
        'polls.create','finance.view','groups.manage'], true, false, 15, '#3C3A56'),
    (p_set,'general_secretary','General Secretary','Announcements, minutes, documents.', array[
        'members.view','members.invite','members.approve','announcements.create','announcements.manage',
        'events.create','events.manage','documents.manage','links.manage','audit.view','broadcast.send'], true, false, 20, '#6E6B8F'),
    (p_set,'assistant_secretary','Assistant Secretary','Secretarial support.', array[
        'members.view','announcements.create','documents.manage','events.create'], true, false, 25, '#6E6B8F'),
    (p_set,'financial_secretary','Financial Secretary','Dues and financial records.', array[
        'members.view','finance.view','finance.dues_manage','finance.payments_confirm',
        'finance.statements','finance.reports_publish','finance.export'], true, false, 30, '#0F9D74'),
    (p_set,'treasurer','Treasurer','Custody of funds and expenditure.', array[
        'members.view','finance.view','finance.expenses_record','finance.expenses_approve',
        'finance.statements','finance.reports_publish','finance.export','donations.manage'], true, false, 35, '#0F9D74'),
    (p_set,'pro','Public Relations Officer','Communications and publicity.', array[
        'members.view','announcements.create','announcements.manage','channels.create','channels.edit',
        'albums.manage','polls.create','broadcast.send','integrations.manage'], true, false, 40, '#D9791C'),
    (p_set,'welfare_officer','Welfare Officer','Member welfare.', array[
        'members.view','announcements.create','events.create','groups.manage'], true, false, 45, '#0898A0'),
    (p_set,'social_secretary','Social Secretary','Social events and engagement.', array[
        'members.view','events.create','events.manage','events.attendance','albums.manage','quizzes.create'], true, false, 50, '#F0C875'),
    (p_set,'project_coordinator','Project Coordinator','School projects.', array[
        'members.view','projects.propose','projects.create','projects.manage','projects.publish_update',
        'finance.view','documents.manage'], true, false, 55, '#1E88E5'),
    (p_set,'auditor','Auditor','Independent review of finances.', array[
        'members.view','finance.view','finance.export','audit.view'], true, false, 60, '#8B8D97'),
    (p_set,'legal_adviser','Legal Adviser','Constitution and compliance.', array[
        'members.view','documents.manage','audit.view'], true, false, 65, '#8B8D97'),
    (p_set,'electoral_officer','Electoral Officer','Runs elections.', array[
        'members.view','elections.create','elections.manage','elections.publish','polls.create'], true, false, 70, '#6E6B8F'),
    (p_set,'moderator','Moderator','Keeps conversation healthy.', array[
        'members.view','messages.moderate','messages.pin','moderation.reports'], true, false, 75, '#8B8D97'),
    (p_set,'member','Member','Ordinary member of the set.', array['members.view'], true, false, 999, '#8B8D97')
  on conflict do nothing;

  select id into v_owner_role from set_roles
   where set_id = p_set and department_id is null and key = 'owner';

  insert into exco_positions (set_id, name, rank, is_system) values
    (p_set,'President',10,true), (p_set,'Vice President',20,true),
    (p_set,'General Secretary',30,true), (p_set,'Assistant Secretary',40,true),
    (p_set,'Financial Secretary',50,true), (p_set,'Treasurer',60,true),
    (p_set,'Public Relations Officer',70,true), (p_set,'Welfare Officer',80,true),
    (p_set,'Social Secretary',90,true), (p_set,'Project Coordinator',100,true),
    (p_set,'Auditor',110,true), (p_set,'Legal Adviser',120,true)
  on conflict do nothing;

  insert into exco_terms (set_id, name, starts_on, is_current, created_by)
  values (p_set, to_char(now(),'YYYY') || ' Executive', current_date, true, p_owner)
  on conflict (set_id, name) do nothing;

  -- Owner joins their own set and takes the owner role.
  insert into set_memberships (set_id, user_id, status, is_founder, verification, approved_at, verified_at)
  values (p_set, p_owner, 'active', true, 'verified', now(), now())
  on conflict (set_id, user_id) do update set status = 'active'
  returning id into v_membership;

  if v_membership is null then
    select id into v_membership from set_memberships where set_id = p_set and user_id = p_owner;
  end if;

  insert into member_roles (membership_id, role_id, status, assigned_by)
  values (v_membership, v_owner_role, 'accepted', p_owner)
  on conflict do nothing;
end $$;

-- Department default roles, created when a department is added.
create or replace function app.seed_department_defaults(p_dept uuid, p_actor uuid)
returns void language plpgsql security definer set search_path = public, app as $$
declare v_set uuid;
begin
  select set_id into v_set from set_departments where id = p_dept;

  insert into set_roles (set_id, department_id, key, name, description, permissions, is_system, rank, color)
  values
    (v_set, p_dept, 'dept_admin', 'Department Administrator',
     'Full control of this department community.', array[
       'members.view','members.approve','members.invite','members.remove','departments.edit',
       'departments.manage_members','roles.assign','channels.create','channels.edit','channels.delete',
       'messages.moderate','messages.pin','announcements.create','announcements.manage','groups.create',
       'groups.manage','events.create','events.manage','events.attendance','polls.create','quizzes.create',
       'finance.view','finance.dues_manage','finance.payments_confirm','finance.export','albums.manage',
       'documents.manage','links.manage','moderation.reports','integrations.manage','broadcast.send'],
     true, 10, '#0898A0'),
    (v_set, p_dept, 'dept_coordinator', 'Department Coordinator',
     'Runs day-to-day department activity.', array[
       'members.view','members.invite','announcements.create','events.create','events.manage',
       'polls.create','albums.manage','documents.manage'], true, 20, '#6E6B8F'),
    (v_set, p_dept, 'dept_member', 'Department Member', 'Member of this department.',
     array['members.view'], true, 999, '#8B8D97')
  on conflict do nothing;
end $$;

create or replace function app.on_department_created()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  perform app.seed_department_defaults(new.id, new.created_by);
  return new;
end $$;

drop trigger if exists trg_department_seed on set_departments;
create trigger trg_department_seed
  after insert on set_departments
  for each row execute function app.on_department_created();
