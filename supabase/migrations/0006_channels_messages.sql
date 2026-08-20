-- ============================================================================
-- SetHub — 0006 CHANNELS & MESSAGING
-- Slack-shaped, but scoped three ways:
--   department_id null + group_id null -> set-wide channel
--   department_id set                  -> department sub-community channel
--   group_id set                       -> committee/group channel
-- ============================================================================

create table if not exists channels (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  group_id       uuid,                                   -- FK added in 0007
  name           text not null,                          -- stored without the '#'
  slug           text not null,
  topic          text,
  description    text,
  purpose        text,
  visibility     channel_visibility not null default 'public',
  is_default     boolean not null default false,          -- #general; cannot be deleted
  is_announcement boolean not null default false,         -- only admins may post
  allow_files    boolean not null default true,
  allow_reactions boolean not null default true,
  allow_threads  boolean not null default true,
  member_count   int not null default 0,
  message_count  int not null default 0,
  last_message_at timestamptz,
  archived_at    timestamptz,
  archived_by    uuid references profiles(id),
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists channels_slug_uniq
  on channels (set_id, coalesce(department_id,'00000000-0000-0000-0000-000000000000'::uuid), slug);
create index if not exists channels_set_idx  on channels (set_id) where archived_at is null;
create index if not exists channels_dept_idx on channels (department_id) where archived_at is null;
select app.attach_touch('channels');

create unique index if not exists channels_one_default
  on channels (set_id) where is_default and department_id is null;

create table if not exists channel_members (
  id            uuid primary key default gen_random_uuid(),
  channel_id    uuid not null references channels(id) on delete cascade,
  membership_id uuid not null references set_memberships(id) on delete cascade,
  role          text not null default 'member' check (role in ('member','moderator','owner')),
  is_muted      boolean not null default false,
  notify_level  text not null default 'all' check (notify_level in ('all','mentions','none')),
  last_read_at  timestamptz,
  last_read_message_id uuid,
  joined_at     timestamptz not null default now(),
  unique (channel_id, membership_id)
);
create index if not exists channel_members_member_idx on channel_members (membership_id);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  channel_id      uuid not null references channels(id) on delete cascade,
  membership_id   uuid references set_memberships(id) on delete set null,
  author_id       uuid references profiles(id) on delete set null,
  parent_id       uuid references messages(id) on delete cascade,   -- thread root
  kind            message_kind not null default 'text',
  body            text,
  body_plain      text,                                             -- search-friendly
  metadata        jsonb not null default '{}'::jsonb,               -- link previews, poll ref...
  mentions        uuid[] not null default '{}',                     -- membership ids
  mentions_everyone boolean not null default false,
  mentions_group_id uuid,
  reply_count     int not null default 0,
  reaction_count  int not null default 0,
  is_pinned       boolean not null default false,
  pinned_by       uuid references profiles(id),
  pinned_at       timestamptz,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  deleted_by      uuid references profiles(id),
  external_source integration_provider,                             -- mirrored in from WhatsApp etc.
  external_id     text,
  created_at      timestamptz not null default now()
);
create index if not exists messages_channel_idx on messages (channel_id, created_at desc);
create index if not exists messages_thread_idx  on messages (parent_id, created_at);
create index if not exists messages_author_idx  on messages (membership_id);
create index if not exists messages_search_idx  on messages using gin (body_plain gin_trgm_ops);
create index if not exists messages_pinned_idx  on messages (channel_id) where is_pinned;

create table if not exists message_attachments (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references messages(id) on delete cascade,
  channel_id   uuid not null references channels(id) on delete cascade,
  kind         media_kind not null default 'document',
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  byte_size    bigint,
  width        int,
  height       int,
  duration_s   int,
  thumbnail_path text,
  uploaded_by  uuid references profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists attachments_channel_idx on message_attachments (channel_id, created_at desc);

create table if not exists message_reactions (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid not null references messages(id) on delete cascade,
  membership_id uuid not null references set_memberships(id) on delete cascade,
  emoji         text not null,
  created_at    timestamptz not null default now(),
  unique (message_id, membership_id, emoji)
);

create table if not exists message_reads (
  message_id    uuid not null references messages(id) on delete cascade,
  membership_id uuid not null references set_memberships(id) on delete cascade,
  read_at       timestamptz not null default now(),
  primary key (message_id, membership_id)
);

-- Direct messages between two members of the same set (kept inside the set
-- boundary on purpose — no cross-workspace DMs).
create table if not exists direct_threads (
  id          uuid primary key default gen_random_uuid(),
  set_id      uuid not null references sets(id) on delete cascade,
  member_a    uuid not null references set_memberships(id) on delete cascade,
  member_b    uuid not null references set_memberships(id) on delete cascade,
  last_message_at timestamptz,
  created_at  timestamptz not null default now(),
  check (member_a < member_b),
  unique (set_id, member_a, member_b)
);

create table if not exists direct_messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references direct_threads(id) on delete cascade,
  membership_id uuid not null references set_memberships(id) on delete cascade,
  body          text,
  metadata      jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  edited_at     timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists dm_thread_idx on direct_messages (thread_id, created_at desc);

alter table invites
  drop constraint if exists invites_channel_id_fkey,
  add constraint invites_channel_id_fkey
  foreign key (channel_id) references channels(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Counters + denormalised channel activity
-- ---------------------------------------------------------------------------
create or replace function app.on_message_change()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if tg_op = 'INSERT' then
    update channels
       set message_count = message_count + 1, last_message_at = new.created_at
     where id = new.channel_id;
    if new.parent_id is not null then
      update messages set reply_count = reply_count + 1 where id = new.parent_id;
    end if;
  elsif tg_op = 'DELETE' then
    update channels set message_count = greatest(message_count - 1, 0) where id = old.channel_id;
    if old.parent_id is not null then
      update messages set reply_count = greatest(reply_count - 1, 0) where id = old.parent_id;
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_message_change on messages;
create trigger trg_message_change
  after insert or delete on messages
  for each row execute function app.on_message_change();

create or replace function app.on_reaction_change()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  update messages m set reaction_count = (
    select count(*) from message_reactions r where r.message_id = coalesce(new.message_id, old.message_id)
  ) where m.id = coalesce(new.message_id, old.message_id);
  return null;
end $$;

drop trigger if exists trg_reaction_change on message_reactions;
create trigger trg_reaction_change
  after insert or delete on message_reactions
  for each row execute function app.on_reaction_change();

create or replace function app.on_channel_member_change()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare target uuid := coalesce(new.channel_id, old.channel_id);
begin
  update channels c set member_count = (
    select count(*) from channel_members cm where cm.channel_id = target
  ) where c.id = target;
  return null;
end $$;

drop trigger if exists trg_channel_member_change on channel_members;
create trigger trg_channel_member_change
  after insert or delete on channel_members
  for each row execute function app.on_channel_member_change();

-- ---------------------------------------------------------------------------
-- Channel visibility helper used by RLS on messages/attachments/reactions.
-- ---------------------------------------------------------------------------
create or replace function app.can_view_channel(p_channel uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1
      from channels c
     where c.id = p_channel
       and app.is_set_member(c.set_id, p_user)
       and (c.department_id is null or app.is_department_member(c.department_id, p_user))
       and (
         c.visibility = 'public'
         or exists (
           select 1 from channel_members cm
             join set_memberships m on m.id = cm.membership_id
            where cm.channel_id = c.id and m.user_id = p_user
         )
         or app.is_set_owner(c.set_id, p_user)
       )
  );
$$;

create or replace function app.can_post_in_channel(p_channel uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select app.can_view_channel(p_channel, p_user)
     and exists (
       select 1 from channels c
        where c.id = p_channel
          and c.archived_at is null
          and (not c.is_announcement
               or app.has_perm(c.set_id, 'announcements.create', c.department_id, p_user))
     );
$$;

-- Every new set gets #general and #announcements automatically.
create or replace function app.seed_set_channels(p_set uuid, p_owner uuid)
returns void language plpgsql security definer set search_path = public, app as $$
begin
  insert into channels (set_id, name, slug, topic, is_default, created_by)
  values (p_set,'general','general','Everything and anything for the set.', true, p_owner)
  on conflict do nothing;

  insert into channels (set_id, name, slug, topic, is_announcement, created_by)
  values (p_set,'announcements','announcements','Official notices from the executives.', true, p_owner)
  on conflict do nothing;
end $$;

-- Every new department gets its own #general and #announcements.
create or replace function app.seed_department_channels()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  insert into channels (set_id, department_id, name, slug, topic, visibility, is_default, created_by)
  values (new.set_id, new.id, new.slug || '-general', new.slug || '-general',
          new.name || ' — general discussion', 'private', false, new.created_by)
  on conflict do nothing;

  insert into channels (set_id, department_id, name, slug, topic, visibility, is_announcement, created_by)
  values (new.set_id, new.id, new.slug || '-announcements', new.slug || '-announcements',
          'Official ' || new.name || ' notices', 'private', true, new.created_by)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists trg_department_channels on set_departments;
create trigger trg_department_channels
  after insert on set_departments
  for each row execute function app.seed_department_channels();
