-- ============================================================================
-- SetHub — 0008 EVENTS + UNIFIED CALENDAR
-- ============================================================================

create table if not exists events (
  id              uuid primary key default gen_random_uuid(),
  set_id          uuid not null references sets(id) on delete cascade,
  department_id   uuid references set_departments(id) on delete cascade,
  group_id        uuid references groups(id) on delete cascade,
  project_id      uuid,                                  -- FK added in 0011
  title           text not null,
  slug            text,
  description     text,
  category        text not null default 'general'
                  check (category in ('general','agm','reunion','dinner','fundraiser','school_visit',
                                      'trivia','election','meeting','sports','memorial','webinar','other')),
  cover_url       text,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  all_day         boolean not null default false,
  timezone        text not null default 'Africa/Lagos',
  location_name   text,
  address         text,
  city            text,
  state           text,
  country         text,
  latitude        numeric(9,6),
  longitude       numeric(9,6),
  is_virtual      boolean not null default false,
  meeting_url     text,
  meeting_provider text,
  capacity        int,
  requires_rsvp   boolean not null default true,
  rsvp_deadline   timestamptz,
  ticket_amount   numeric(14,2) not null default 0,
  audience        text not null default 'set'
                  check (audience in ('set','department','group','exco','admins','institution')),
  visibility      channel_visibility not null default 'public',
  status          governance_status not null default 'open',
  recurrence_rule text,                                  -- iCal RRULE
  recurrence_parent uuid references events(id) on delete cascade,
  reminder_offsets int[] not null default '{1440,60}',   -- minutes before start
  going_count     int not null default 0,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists events_set_time_idx  on events (set_id, starts_at);
create index if not exists events_dept_time_idx on events (department_id, starts_at);
select app.attach_touch('events');

alter table announcements
  drop constraint if exists announcements_event_id_fkey,
  add constraint announcements_event_id_fkey foreign key (event_id) references events(id) on delete set null;

create table if not exists event_rsvps (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  membership_id uuid not null references set_memberships(id) on delete cascade,
  status        rsvp_status not null default 'going',
  guests        int not null default 0 check (guests >= 0),
  note          text,
  checked_in_at timestamptz,
  checked_in_by uuid references profiles(id),
  responded_at  timestamptz not null default now(),
  unique (event_id, membership_id)
);
create index if not exists rsvps_member_idx on event_rsvps (membership_id);

create table if not exists event_attachments (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  kind         media_kind not null default 'document',
  storage_path text,
  url          text,
  file_name    text,
  created_at   timestamptz not null default now()
);

create or replace function app.on_rsvp_change()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare target uuid := coalesce(new.event_id, old.event_id);
begin
  update events e set going_count = (
    select coalesce(sum(1 + guests), 0) from event_rsvps r
     where r.event_id = target and r.status in ('going','attended')
  ) where e.id = target;
  return null;
end $$;

drop trigger if exists trg_rsvp_change on event_rsvps;
create trigger trg_rsvp_change
  after insert or update of status, guests or delete on event_rsvps
  for each row execute function app.on_rsvp_change();

-- ---------------------------------------------------------------------------
-- UNIFIED CALENDAR
-- One feed of everything with a date: events, elections, polls, quizzes, dues
-- deadlines and project milestones. Populated in 0012 once those tables exist.
-- ---------------------------------------------------------------------------
create table if not exists calendar_entries (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  source_type    text not null check (source_type in
                   ('event','election','poll','quiz','dues','project_milestone','meeting','announcement')),
  source_id      uuid not null,
  title          text not null,
  subtitle       text,
  starts_at      timestamptz not null,
  ends_at        timestamptz,
  all_day        boolean not null default false,
  color          text,
  icon           text,
  href           text,
  audience       text not null default 'set',
  created_at     timestamptz not null default now(),
  unique (source_type, source_id)
);
create index if not exists calendar_set_time_idx on calendar_entries (set_id, starts_at);
