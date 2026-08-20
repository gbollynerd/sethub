-- ============================================================================
-- SetHub — 0013 NOTIFICATIONS, INTEGRATIONS (WhatsApp & co), AUDIT, MODERATION
-- ============================================================================

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS — always carry their set so the UI can say
-- "FGC Lagos — Class of 2008: new announcement".
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  set_id         uuid references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  kind           text not null,                -- 'announcement.created', 'dues.reminder', ...
  title          text not null,
  body           text,
  icon           text,
  href           text,
  actor_id       uuid references profiles(id) on delete set null,
  source_type    text,
  source_id      uuid,
  priority       text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  read_at        timestamptz,
  archived_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id) where read_at is null;

-- Per-set overrides of the global preferences in 0002.
create table if not exists set_notification_preferences (
  id            uuid primary key default gen_random_uuid(),
  membership_id uuid not null references set_memberships(id) on delete cascade,
  muted         boolean not null default false,
  channels      notify_channel[] not null default '{in_app,email}',
  overrides     jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  unique (membership_id)
);

create table if not exists push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  token       text not null unique,
  platform    text not null check (platform in ('web','ios','android')),
  device_name text,
  last_used_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INTEGRATIONS — connect a set (or one department) to WhatsApp, Telegram,
-- Slack, email lists, SMS gateways or a plain webhook, and mirror activity out.
-- ---------------------------------------------------------------------------
create table if not exists integrations (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  provider       integration_provider not null,
  label          text not null,
  external_id    text,                              -- WhatsApp group id, chat id, channel id
  external_name  text,
  invite_url     text,                              -- the WhatsApp/Telegram group join link
  config         jsonb not null default '{}'::jsonb,
  -- Credentials are stored encrypted by the application layer before insert.
  credentials    jsonb not null default '{}'::jsonb,
  direction      text not null default 'outbound'
                 check (direction in ('outbound','inbound','both')),
  events         text[] not null default
                 '{announcement.created,event.created,election.opened,dues.created,project.update}',
  channel_id     uuid references channels(id) on delete set null,  -- mirror target for inbound
  is_active      boolean not null default true,
  last_sync_at   timestamptz,
  last_error     text,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists integrations_set_idx on integrations (set_id) where is_active;
create unique index if not exists integrations_uniq on integrations (
  set_id, coalesce(department_id,'00000000-0000-0000-0000-000000000000'::uuid),
  provider, coalesce(external_id,''));
select app.attach_touch('integrations');

-- Outbound queue. A worker (Edge Function / cron) drains this.
create table if not exists integration_deliveries (
  id             uuid primary key default gen_random_uuid(),
  integration_id uuid not null references integrations(id) on delete cascade,
  set_id         uuid not null references sets(id) on delete cascade,
  event_kind     text not null,
  payload        jsonb not null default '{}'::jsonb,
  rendered_text  text,
  media_url      text,
  status         delivery_status not null default 'queued',
  attempts       int not null default 0,
  last_attempt_at timestamptz,
  external_ref   text,
  error          text,
  scheduled_for  timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create index if not exists deliveries_pending_idx
  on integration_deliveries (scheduled_for) where status in ('queued','sending');

-- Broadcasts: an admin explicitly pushing a message out of SetHub to the
-- connected WhatsApp group / SMS / email list.
create table if not exists broadcasts (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  title          text,
  body           text not null,
  media_url      text,
  channels       notify_channel[] not null default '{in_app}',
  integration_ids uuid[] not null default '{}',
  audience       text not null default 'set'
                 check (audience in ('set','department','group','exco','admins','debtors','custom')),
  audience_filter jsonb not null default '{}'::jsonb,
  recipient_count int not null default 0,
  delivered_count int not null default 0,
  status         delivery_status not null default 'queued',
  scheduled_for  timestamptz,
  sent_at        timestamptz,
  created_by     uuid not null references profiles(id),
  created_at     timestamptz not null default now()
);
create index if not exists broadcasts_set_idx on broadcasts (set_id, created_at desc);

-- Enqueue outbound messages whenever an announcement is published.
create or replace function app.fanout_announcement()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare i integrations;
begin
  for i in
    select * from integrations
     where set_id = new.set_id
       and is_active
       and direction in ('outbound','both')
       and 'announcement.created' = any(events)
       and (department_id is null or department_id = new.department_id)
  loop
    insert into integration_deliveries (integration_id, set_id, event_kind, payload, rendered_text)
    values (i.id, new.set_id, 'announcement.created',
            jsonb_build_object('announcement_id', new.id, 'title', new.title),
            '*' || new.title || '*' || chr(10) || chr(10) || left(coalesce(new.body,''), 900));
  end loop;
  return null;
end $$;

drop trigger if exists trg_fanout_announcement on announcements;
create trigger trg_fanout_announcement
  after insert on announcements
  for each row when (new.status = 'open') execute function app.fanout_announcement();

-- ---------------------------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id             bigserial primary key,
  set_id         uuid references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  actor_id       uuid references profiles(id) on delete set null,
  actor_name     text,
  action         text not null,               -- 'member.approved', 'finance.expense_added', ...
  entity_type    text,
  entity_id      uuid,
  entity_label   text,
  summary        text,
  before_data    jsonb,
  after_data     jsonb,
  ip             inet,
  user_agent     text,
  created_at     timestamptz not null default now()
);
create index if not exists audit_set_idx on audit_log (set_id, created_at desc);
create index if not exists audit_actor_idx on audit_log (actor_id, created_at desc);

create or replace function log_audit(
  p_set uuid, p_action text, p_entity_type text default null, p_entity_id uuid default null,
  p_label text default null, p_summary text default null, p_dept uuid default null,
  p_before jsonb default null, p_after jsonb default null)
returns bigint language plpgsql security definer set search_path = public, app as $$
declare v_id bigint; v_name text;
begin
  select display_name into v_name from profiles where id = auth.uid();
  insert into audit_log (set_id, department_id, actor_id, actor_name, action, entity_type,
                         entity_id, entity_label, summary, before_data, after_data)
  values (p_set, p_dept, auth.uid(), v_name, p_action, p_entity_type, p_entity_id,
          p_label, p_summary, p_before, p_after)
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- MODERATION
-- ---------------------------------------------------------------------------
create table if not exists reports (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  reporter_id    uuid not null references profiles(id) on delete cascade,
  target_type    text not null check (target_type in ('member','message','announcement','album_media','document','business','channel','comment')),
  target_id      uuid not null,
  reason         text not null check (reason in ('spam','harassment','hate','impersonation','nudity','misinformation','financial','other')),
  details        text,
  status         moderation_status not null default 'open',
  handled_by     uuid references profiles(id),
  handled_at     timestamptz,
  resolution     text,
  created_at     timestamptz not null default now()
);
create index if not exists reports_set_idx on reports (set_id, status, created_at desc);

create table if not exists blocks (
  id           uuid primary key default gen_random_uuid(),
  blocker_id   uuid not null references profiles(id) on delete cascade,
  blocked_id   uuid not null references profiles(id) on delete cascade,
  reason       text,
  created_at   timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists moderation_actions (
  id            uuid primary key default gen_random_uuid(),
  set_id        uuid references sets(id) on delete cascade,
  report_id     uuid references reports(id) on delete set null,
  target_user   uuid references profiles(id) on delete cascade,
  action        text not null check (action in ('warn','mute','suspend','remove_content','remove_member','ban','restore')),
  duration_hours int,
  reason        text,
  actor_id      uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ACTIVITY FEED (dashboard "recent activity")
-- ---------------------------------------------------------------------------
create table if not exists activity_feed (
  id            bigserial primary key,
  set_id        uuid not null references sets(id) on delete cascade,
  department_id uuid references set_departments(id) on delete cascade,
  actor_id      uuid references profiles(id) on delete set null,
  verb          text not null,
  object_type   text,
  object_id     uuid,
  object_label  text,
  href          text,
  icon          text,
  visibility    privacy_level not null default 'set_members',
  created_at    timestamptz not null default now()
);
create index if not exists activity_set_idx on activity_feed (set_id, created_at desc);

-- ---------------------------------------------------------------------------
-- SAVED SEARCHES / SEARCH LOG (powers the omni-search ranking later)
-- ---------------------------------------------------------------------------
create table if not exists search_log (
  id         bigserial primary key,
  user_id    uuid references profiles(id) on delete cascade,
  set_id     uuid references sets(id) on delete cascade,
  query      text not null,
  scope      text,
  hit_count  int,
  created_at timestamptz not null default now()
);
