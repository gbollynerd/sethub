-- ============================================================================
-- SetHub — 0007 GROUPS / COMMITTEES + ANNOUNCEMENTS
-- ============================================================================

create table if not exists groups (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  name           text not null,
  slug           text not null,
  kind           text not null default 'committee'
                 check (kind in ('committee','interest','cohort','task_force','chapter','other')),
  description    text,
  purpose        text,
  logo_url       text,
  color          text default '#0898A0',
  visibility     channel_visibility not null default 'public',
  channel_id     uuid references channels(id) on delete set null,
  auto_channel   boolean not null default true,
  member_count   int not null default 0,
  starts_on      date,
  ends_on        date,
  archived_at    timestamptz,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (set_id, slug)
);
create index if not exists groups_set_idx on groups (set_id) where archived_at is null;
select app.attach_touch('groups');

create table if not exists group_members (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references groups(id) on delete cascade,
  membership_id uuid not null references set_memberships(id) on delete cascade,
  role          text not null default 'member' check (role in ('member','secretary','chair','admin')),
  status        text not null default 'active' check (status in ('invited','active','declined','removed')),
  invited_by    uuid references profiles(id),
  joined_at     timestamptz not null default now(),
  unique (group_id, membership_id)
);
create index if not exists group_members_member_idx on group_members (membership_id, status);

alter table channels
  drop constraint if exists channels_group_id_fkey,
  add constraint channels_group_id_fkey foreign key (group_id) references groups(id) on delete set null;
alter table invites
  drop constraint if exists invites_group_id_fkey,
  add constraint invites_group_id_fkey foreign key (group_id) references groups(id) on delete cascade;

create or replace function app.on_group_member_change()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare target uuid := coalesce(new.group_id, old.group_id);
begin
  update groups g set member_count = (
    select count(*) from group_members gm where gm.group_id = target and gm.status = 'active'
  ) where g.id = target;
  return null;
end $$;

drop trigger if exists trg_group_member_change on group_members;
create trigger trg_group_member_change
  after insert or update of status or delete on group_members
  for each row execute function app.on_group_member_change();

create or replace function app.is_group_member(p_group uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from group_members gm
      join set_memberships m on m.id = gm.membership_id
     where gm.group_id = p_group and m.user_id = p_user
       and gm.status = 'active' and m.status = 'active'
  );
$$;

-- Optionally spin up a private channel alongside the group.
create or replace function app.on_group_created()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare v_channel uuid;
begin
  if new.auto_channel then
    insert into channels (set_id, department_id, group_id, name, slug, topic, visibility, created_by)
    values (new.set_id, new.department_id, new.id, new.slug, new.slug,
            new.name || ' working channel',
            case when new.visibility = 'private' then 'private' else 'public' end::channel_visibility,
            new.created_by)
    on conflict do nothing
    returning id into v_channel;

    if v_channel is not null then
      update groups set channel_id = v_channel where id = new.id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_group_created on groups;
create trigger trg_group_created
  after insert on groups
  for each row execute function app.on_group_created();

-- ---------------------------------------------------------------------------
-- ANNOUNCEMENTS
-- ---------------------------------------------------------------------------
create table if not exists announcements (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  group_id       uuid references groups(id) on delete cascade,
  title          text not null,
  body           text not null,
  summary        text,
  cover_url      text,
  priority       text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  audience       text not null default 'set'
                 check (audience in ('set','department','group','exco','admins','custom')),
  audience_role_ids uuid[] not null default '{}',
  is_pinned      boolean not null default false,
  status         governance_status not null default 'open',
  publish_at     timestamptz not null default now(),
  expires_at     timestamptz,
  event_id       uuid,                                   -- FK added in 0008
  poll_id        uuid,                                   -- FK added in 0009
  broadcast      notify_channel[] not null default '{in_app}',
  view_count     int not null default 0,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists announcements_set_idx on announcements (set_id, publish_at desc);
create index if not exists announcements_dept_idx on announcements (department_id, publish_at desc);
select app.attach_touch('announcements');

create table if not exists announcement_attachments (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements(id) on delete cascade,
  kind            media_kind not null default 'document',
  storage_path    text,
  url             text,
  file_name       text,
  mime_type       text,
  byte_size       bigint,
  created_at      timestamptz not null default now()
);

create table if not exists announcement_reads (
  announcement_id uuid not null references announcements(id) on delete cascade,
  membership_id   uuid not null references set_memberships(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, membership_id)
);
