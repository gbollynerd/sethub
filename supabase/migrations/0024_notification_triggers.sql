-- ============================================================================
-- SetHub — 0024 CROSS-APP NOTIFICATION TRIGGERS
--
-- The `notifications` table, `notification_preferences` /
-- `set_notification_preferences` (mute) tables, and the `NotificationBell`
-- read-side UI (src/components/shell/topbar.tsx) already existed and are
-- fully wired — but nothing anywhere ever inserted a row into `notifications`.
-- The bell has always rendered "You are all caught up." because there was no
-- producer, only a consumer. This migration adds the producers.
--
-- Design:
--   - app.notify_set_members(...): one set-based INSERT ... SELECT that fans
--     a notification out to every active member of a set (optionally scoped
--     to a department), respecting the per-topic boolean columns on
--     notification_preferences and the per-set mute flag on
--     set_notification_preferences. Never notifies the acting user about
--     their own action.
--   - app.notify_user(...): same preference/mute checks, for a single
--     recipient (used for personal notifications like an EXCO appointment or
--     a membership approval, which aren't a set-wide fan-out).
--   - A small trigger function per event type, each SECURITY DEFINER (same
--     pattern as app.fanout_announcement()/app.can_manage_project() /
--     invite_to_exco() from earlier batches) and each wrapping its call in
--     its own BEGIN/EXCEPTION block so a bug in notification logic can NEVER
--     block or fail the underlying insert/update on events, elections,
--     polls, quizzes, projects, exco_appointments, or set_memberships —
--     those tables are live and this must be purely additive.
--
-- Event types wired in this batch: event created, election nominations
-- opened, poll opened, quiz opened, project proposed, EXCO appointment,
-- membership approved. Dues/payments notifications are intentionally left
-- for the finance batch (notification_preferences.dues/.payments already
-- exist as columns, ready for that batch to use the same helpers).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function app.notify_set_members(
  p_set_id uuid,
  p_department_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_href text,
  p_icon text,
  p_priority text,
  p_actor_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_pref_column text
) returns void language plpgsql security definer set search_path = public, app, extensions as $$
begin
  insert into notifications (
    user_id, set_id, department_id, kind, title, body, icon, href,
    actor_id, source_type, source_id, priority
  )
  select
    sm.user_id, p_set_id, p_department_id, p_kind, p_title, p_body, p_icon, p_href,
    p_actor_id, p_source_type, p_source_id, coalesce(p_priority, 'normal')
  from set_memberships sm
  left join notification_preferences np on np.user_id = sm.user_id
  left join set_notification_preferences snp on snp.membership_id = sm.id
  where sm.set_id = p_set_id
    and sm.status = 'active'
    and (p_department_id is null or sm.department_id = p_department_id)
    and (p_actor_id is null or sm.user_id <> p_actor_id)
    and coalesce(snp.muted, false) = false
    and (
      p_pref_column is null or
      case p_pref_column
        when 'announcements' then coalesce(np.announcements, true)
        when 'messages' then coalesce(np.messages, true)
        when 'mentions' then coalesce(np.mentions, true)
        when 'events' then coalesce(np.events, true)
        when 'elections' then coalesce(np.elections, true)
        when 'polls_quizzes' then coalesce(np.polls_quizzes, true)
        when 'dues' then coalesce(np.dues, true)
        when 'payments' then coalesce(np.payments, true)
        when 'projects' then coalesce(np.projects, true)
        when 'admin_actions' then coalesce(np.admin_actions, true)
        else true
      end
    );
end $$;

create or replace function app.notify_user(
  p_user_id uuid,
  p_set_id uuid,
  p_department_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_href text,
  p_icon text,
  p_priority text,
  p_actor_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_pref_column text
) returns void language plpgsql security definer set search_path = public, app, extensions as $$
declare
  v_enabled boolean := true;
  v_muted boolean := false;
begin
  if p_user_id is null or (p_actor_id is not null and p_user_id = p_actor_id) then
    return;
  end if;

  if p_pref_column is not null then
    select case p_pref_column
      when 'announcements' then announcements
      when 'messages' then messages
      when 'mentions' then mentions
      when 'events' then events
      when 'elections' then elections
      when 'polls_quizzes' then polls_quizzes
      when 'dues' then dues
      when 'payments' then payments
      when 'projects' then projects
      when 'admin_actions' then admin_actions
      else true
    end into v_enabled
    from notification_preferences where user_id = p_user_id;
    if v_enabled is null then v_enabled := true; end if;
    if not v_enabled then return; end if;
  end if;

  if p_set_id is not null then
    select coalesce(snp.muted, false) into v_muted
    from set_memberships sm
    left join set_notification_preferences snp on snp.membership_id = sm.id
    where sm.set_id = p_set_id and sm.user_id = p_user_id
    limit 1;
    if v_muted then return; end if;
  end if;

  insert into notifications (
    user_id, set_id, department_id, kind, title, body, icon, href,
    actor_id, source_type, source_id, priority
  ) values (
    p_user_id, p_set_id, p_department_id, p_kind, p_title, p_body, p_icon, p_href,
    p_actor_id, p_source_type, p_source_id, coalesce(p_priority, 'normal')
  );
end $$;

-- ---------------------------------------------------------------------------
-- Events: notify the set (or department) when a new event is created
-- ---------------------------------------------------------------------------

create or replace function app.trg_notify_new_event() returns trigger
language plpgsql security definer set search_path = public, app, extensions as $$
begin
  begin
    perform app.notify_set_members(
      new.set_id, new.department_id, 'event.created', new.title,
      'A new event was just added to the calendar.',
      '/s/' || new.set_id::text || '/events/' || new.id::text,
      'calendar', 'normal', new.created_by, 'events', new.id, 'events'
    );
  exception when others then
    raise warning 'trg_notify_new_event failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_notify_new_event on events;
create trigger trg_notify_new_event after insert on events
for each row execute function app.trg_notify_new_event();

-- ---------------------------------------------------------------------------
-- Elections: notify when nominations open (at creation, or on a later stage
-- transition — whichever happens first)
-- ---------------------------------------------------------------------------

create or replace function app.trg_notify_election_nominations() returns trigger
language plpgsql security definer set search_path = public, app, extensions as $$
begin
  begin
    perform app.notify_set_members(
      new.set_id, new.department_id, 'election.nominations_open', new.title,
      'Nominations are open — check who''s running or put yourself forward.',
      '/s/' || new.set_id::text || '/elections/' || new.id::text,
      'vote', 'normal', new.created_by, 'elections', new.id, 'elections'
    );
  exception when others then
    raise warning 'trg_notify_election_nominations failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_notify_election_nominations_ins on elections;
create trigger trg_notify_election_nominations_ins after insert on elections
for each row when (new.stage = 'nominations')
execute function app.trg_notify_election_nominations();

drop trigger if exists trg_notify_election_nominations_upd on elections;
create trigger trg_notify_election_nominations_upd after update of stage on elections
for each row when (new.stage = 'nominations' and old.stage is distinct from 'nominations')
execute function app.trg_notify_election_nominations();

-- ---------------------------------------------------------------------------
-- Polls: notify when a poll opens (poll-composer creates polls already open)
-- ---------------------------------------------------------------------------

create or replace function app.trg_notify_poll_open() returns trigger
language plpgsql security definer set search_path = public, app, extensions as $$
begin
  begin
    perform app.notify_set_members(
      new.set_id, new.department_id, 'poll.opened', new.question,
      'A new poll is open for voting.',
      '/s/' || new.set_id::text || '/community/polls/' || new.id::text,
      'poll', 'normal', new.created_by, 'polls', new.id, 'polls_quizzes'
    );
  exception when others then
    raise warning 'trg_notify_poll_open failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_notify_poll_open on polls;
create trigger trg_notify_poll_open after insert on polls
for each row when (new.status = 'open')
execute function app.trg_notify_poll_open();

-- ---------------------------------------------------------------------------
-- Quizzes: notify when a quiz opens (at creation, or on a later transition
-- from draft — quizzes/new/page.tsx currently always creates as 'draft', so
-- today this only fires once an "open quiz" action exists, but it's wired
-- and ready)
-- ---------------------------------------------------------------------------

create or replace function app.trg_notify_quiz_open() returns trigger
language plpgsql security definer set search_path = public, app, extensions as $$
begin
  begin
    perform app.notify_set_members(
      new.set_id, new.department_id, 'quiz.opened', new.title,
      'A quiz just opened — see how you do.',
      '/s/' || new.set_id::text || '/community/quizzes/' || new.id::text,
      'quiz', 'normal', new.created_by, 'quizzes', new.id, 'polls_quizzes'
    );
  exception when others then
    raise warning 'trg_notify_quiz_open failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_notify_quiz_open_ins on quizzes;
create trigger trg_notify_quiz_open_ins after insert on quizzes
for each row when (new.status = 'open')
execute function app.trg_notify_quiz_open();

drop trigger if exists trg_notify_quiz_open_upd on quizzes;
create trigger trg_notify_quiz_open_upd after update of status on quizzes
for each row when (new.status = 'open' and old.status is distinct from 'open')
execute function app.trg_notify_quiz_open();

-- ---------------------------------------------------------------------------
-- Projects: notify the originating set when a project is proposed
-- ---------------------------------------------------------------------------

create or replace function app.trg_notify_project_proposed() returns trigger
language plpgsql security definer set search_path = public, app, extensions as $$
begin
  begin
    if new.originating_set_id is null then
      return null;
    end if;
    perform app.notify_set_members(
      new.originating_set_id, null, 'project.proposed', new.title,
      'A new project was just proposed.',
      '/s/' || new.originating_set_id::text || '/projects/' || new.id::text,
      'project', 'normal', new.created_by, 'projects', new.id, 'projects'
    );
  exception when others then
    raise warning 'trg_notify_project_proposed failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_notify_project_proposed on projects;
create trigger trg_notify_project_proposed after insert on projects
for each row execute function app.trg_notify_project_proposed();

-- ---------------------------------------------------------------------------
-- EXCO appointments: notify the appointed member directly
-- ---------------------------------------------------------------------------

create or replace function app.trg_notify_exco_appointment() returns trigger
language plpgsql security definer set search_path = public, app, extensions as $$
declare
  v_user_id uuid;
  v_set_id uuid;
  v_position_name text;
begin
  begin
    if new.membership_id is null then
      return null;
    end if;
    select sm.user_id, sm.set_id into v_user_id, v_set_id
    from set_memberships sm where sm.id = new.membership_id;
    select p.name into v_position_name from exco_positions p where p.id = new.position_id;

    if v_user_id is not null and v_set_id is not null then
      perform app.notify_user(
        v_user_id, v_set_id, null, 'exco.appointed',
        'You''ve been appointed ' || coalesce(v_position_name, 'to an EXCO position'),
        'Head to the EXCO page to see your term details.',
        '/s/' || v_set_id::text || '/admin/exco',
        'shield', 'high', new.invited_by, 'exco_appointments', new.id, 'admin_actions'
      );
    end if;
  exception when others then
    raise warning 'trg_notify_exco_appointment failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_notify_exco_appointment on exco_appointments;
create trigger trg_notify_exco_appointment after insert on exco_appointments
for each row execute function app.trg_notify_exco_appointment();

-- ---------------------------------------------------------------------------
-- Membership approval: notify the member the moment they're approved
-- (matches the existing "You will get a notification the moment you are
-- approved" copy in src/app/app/pending/[setId]/page.tsx)
-- ---------------------------------------------------------------------------

create or replace function app.trg_notify_membership_approved() returns trigger
language plpgsql security definer set search_path = public, app, extensions as $$
begin
  begin
    perform app.notify_user(
      new.user_id, new.set_id, new.department_id, 'membership.approved',
      'You''re in!',
      'Your membership has been approved — welcome aboard.',
      '/s/' || new.set_id::text,
      'check', 'high', new.approved_by, 'set_memberships', new.id, 'admin_actions'
    );
  exception when others then
    raise warning 'trg_notify_membership_approved failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_notify_membership_approved on set_memberships;
create trigger trg_notify_membership_approved after update of status on set_memberships
for each row when (new.status = 'active' and old.status = 'pending')
execute function app.trg_notify_membership_approved();
