-- ============================================================================
-- SetHub — 0009 GOVERNANCE: polls, quizzes/trivia, elections
-- ============================================================================

-- ---------------------------------------------------------------------------
-- POLLS
-- ---------------------------------------------------------------------------
create table if not exists polls (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  group_id       uuid references groups(id) on delete cascade,
  channel_id     uuid references channels(id) on delete cascade,
  question       text not null,
  description    text,
  kind           poll_kind not null default 'single',
  max_choices    int not null default 1,
  is_anonymous   boolean not null default true,
  show_live_results boolean not null default true,
  allow_change   boolean not null default true,
  status         governance_status not null default 'open',
  opens_at       timestamptz not null default now(),
  closes_at      timestamptz,
  vote_count     int not null default 0,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists polls_set_idx on polls (set_id, created_at desc);
select app.attach_touch('polls');

alter table announcements
  drop constraint if exists announcements_poll_id_fkey,
  add constraint announcements_poll_id_fkey foreign key (poll_id) references polls(id) on delete set null;

create table if not exists poll_options (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references polls(id) on delete cascade,
  label       text not null,
  description text,
  image_url   text,
  sort_order  int not null default 0,
  vote_count  int not null default 0
);

create table if not exists poll_votes (
  id            uuid primary key default gen_random_uuid(),
  poll_id       uuid not null references polls(id) on delete cascade,
  option_id     uuid not null references poll_options(id) on delete cascade,
  membership_id uuid not null references set_memberships(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (poll_id, option_id, membership_id)
);
create index if not exists poll_votes_member_idx on poll_votes (poll_id, membership_id);

create or replace function app.on_poll_vote_change()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare v_poll uuid := coalesce(new.poll_id, old.poll_id);
begin
  update poll_options o set vote_count = (
    select count(*) from poll_votes v where v.option_id = o.id
  ) where o.poll_id = v_poll;
  update polls p set vote_count = (
    select count(distinct membership_id) from poll_votes v where v.poll_id = v_poll
  ) where p.id = v_poll;
  return null;
end $$;

drop trigger if exists trg_poll_vote_change on poll_votes;
create trigger trg_poll_vote_change
  after insert or delete on poll_votes
  for each row execute function app.on_poll_vote_change();

-- Enforce the ballot rules (one vote, max choices, window open).
create or replace function app.guard_poll_vote()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare p polls; n int;
begin
  select * into p from polls where id = new.poll_id;
  if p.status <> 'open' then raise exception 'this poll is not open'; end if;
  if p.opens_at > now() then raise exception 'this poll has not opened yet'; end if;
  if p.closes_at is not null and p.closes_at < now() then raise exception 'this poll has closed'; end if;

  select count(*) into n from poll_votes
   where poll_id = new.poll_id and membership_id = new.membership_id;
  if p.kind = 'single' and n >= 1 then
    raise exception 'only one selection is allowed on this poll';
  end if;
  if p.kind = 'multiple' and n >= p.max_choices then
    raise exception 'you have used all % selections', p.max_choices;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_poll_vote on poll_votes;
create trigger trg_guard_poll_vote before insert on poll_votes
  for each row execute function app.guard_poll_vote();

-- ---------------------------------------------------------------------------
-- QUIZZES & TRIVIA
-- ---------------------------------------------------------------------------
create table if not exists quizzes (
  id              uuid primary key default gen_random_uuid(),
  set_id          uuid not null references sets(id) on delete cascade,
  department_id   uuid references set_departments(id) on delete cascade,
  event_id        uuid references events(id) on delete set null,
  title           text not null,
  description     text,
  cover_url       text,
  kind            text not null default 'quiz' check (kind in ('quiz','trivia','survey')),
  time_limit_s    int,
  question_time_s int,
  attempts_allowed int not null default 1,
  shuffle         boolean not null default true,
  show_answers    boolean not null default true,
  pass_mark       int,
  prize           text,
  status          governance_status not null default 'draft',
  opens_at        timestamptz,
  closes_at       timestamptz,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
select app.attach_touch('quizzes');

create table if not exists quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references quizzes(id) on delete cascade,
  prompt      text not null,
  image_url   text,
  kind        text not null default 'single' check (kind in ('single','multiple','true_false','text')),
  points      int not null default 1,
  explanation text,
  sort_order  int not null default 0
);

create table if not exists quiz_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  label       text not null,
  is_correct  boolean not null default false,
  sort_order  int not null default 0
);

create table if not exists quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references quizzes(id) on delete cascade,
  membership_id uuid not null references set_memberships(id) on delete cascade,
  score         numeric(8,2) not null default 0,
  max_score     numeric(8,2) not null default 0,
  duration_s    int,
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  rank          int
);
create index if not exists quiz_attempts_quiz_idx on quiz_attempts (quiz_id, score desc);

create table if not exists quiz_responses (
  id           uuid primary key default gen_random_uuid(),
  attempt_id   uuid not null references quiz_attempts(id) on delete cascade,
  question_id  uuid not null references quiz_questions(id) on delete cascade,
  answer_ids   uuid[] not null default '{}',
  text_answer  text,
  is_correct   boolean,
  points       numeric(8,2) not null default 0,
  answered_at  timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ---------------------------------------------------------------------------
-- ELECTIONS
-- ---------------------------------------------------------------------------
create table if not exists elections (
  id                 uuid primary key default gen_random_uuid(),
  set_id             uuid not null references sets(id) on delete cascade,
  department_id      uuid references set_departments(id) on delete cascade,
  term_id            uuid references exco_terms(id) on delete set null,
  title              text not null,
  description        text,
  rules              text,
  stage              election_stage not null default 'draft',
  nominations_open_at  timestamptz,
  nominations_close_at timestamptz,
  voting_opens_at    timestamptz,
  voting_closes_at   timestamptz,
  is_anonymous       boolean not null default true,
  eligibility        text not null default 'active_members'
                     check (eligibility in ('active_members','verified_members','paid_up_members','department','custom')),
  eligibility_note   text,
  min_dues_paid      boolean not null default false,
  results_published_at timestamptz,
  published_by       uuid references profiles(id),
  turnout            int not null default 0,
  eligible_count     int not null default 0,
  created_by         uuid references profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
select app.attach_touch('elections');

alter table exco_appointments
  drop constraint if exists exco_appointments_elected_via_fkey,
  add constraint exco_appointments_elected_via_fkey
  foreign key (elected_via) references elections(id) on delete set null;

create table if not exists election_positions (
  id            uuid primary key default gen_random_uuid(),
  election_id   uuid not null references elections(id) on delete cascade,
  position_id   uuid references exco_positions(id) on delete set null,
  title         text not null,
  description   text,
  seats         int not null default 1,
  sort_order    int not null default 0
);

create table if not exists election_candidates (
  id                   uuid primary key default gen_random_uuid(),
  election_position_id uuid not null references election_positions(id) on delete cascade,
  membership_id        uuid not null references set_memberships(id) on delete cascade,
  manifesto            text,
  statement            text,
  photo_url            text,
  nominated_by         uuid references set_memberships(id) on delete set null,
  status               text not null default 'pending'
                       check (status in ('pending','approved','rejected','withdrawn','elected','not_elected')),
  vote_count           int not null default 0,
  reviewed_by          uuid references profiles(id),
  created_at           timestamptz not null default now(),
  unique (election_position_id, membership_id)
);

-- Ballots are split in two so anonymity is real: `election_ballots` records
-- THAT a member voted; `election_votes` records WHAT was chosen, with no link
-- back to the voter when the election is anonymous.
create table if not exists election_ballots (
  id            uuid primary key default gen_random_uuid(),
  election_id   uuid not null references elections(id) on delete cascade,
  membership_id uuid not null references set_memberships(id) on delete cascade,
  receipt       text not null default encode(gen_random_bytes(8),'hex'),
  cast_at       timestamptz not null default now(),
  unique (election_id, membership_id)
);

create table if not exists election_votes (
  id                   uuid primary key default gen_random_uuid(),
  election_id          uuid not null references elections(id) on delete cascade,
  election_position_id uuid not null references election_positions(id) on delete cascade,
  candidate_id         uuid references election_candidates(id) on delete cascade,
  ballot_id            uuid references election_ballots(id) on delete set null,
  voter_membership_id  uuid references set_memberships(id) on delete set null,  -- null when anonymous
  is_abstention        boolean not null default false,
  cast_at              timestamptz not null default now()
);
create index if not exists election_votes_pos_idx on election_votes (election_position_id, candidate_id);

create or replace function app.on_election_vote_change()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  update election_candidates c set vote_count = (
    select count(*) from election_votes v where v.candidate_id = c.id
  ) where c.id = coalesce(new.candidate_id, old.candidate_id);

  update elections e set turnout = (
    select count(*) from election_ballots b where b.election_id = e.id
  ) where e.id = coalesce(new.election_id, old.election_id);
  return null;
end $$;

drop trigger if exists trg_election_vote_change on election_votes;
create trigger trg_election_vote_change
  after insert or delete on election_votes
  for each row execute function app.on_election_vote_change();

-- Cast a whole ballot atomically: one call, one vote per position, receipt back.
-- p_choices = [{"position_id":"...","candidate_id":"...","abstain":false}, ...]
create or replace function cast_election_ballot(p_election uuid, p_choices jsonb)
returns text language plpgsql security definer set search_path = public, app as $$
declare
  e elections;
  v_member uuid;
  v_ballot election_ballots;
  c jsonb;
  v_anon boolean;
begin
  select * into e from elections where id = p_election;
  if not found then raise exception 'election not found'; end if;
  if e.stage <> 'voting' then raise exception 'voting is not currently open'; end if;
  if e.voting_opens_at is not null and now() < e.voting_opens_at then raise exception 'voting has not opened'; end if;
  if e.voting_closes_at is not null and now() > e.voting_closes_at then raise exception 'voting has closed'; end if;

  v_member := app.membership_id(e.set_id);
  if v_member is null then raise exception 'you are not an active member of this set'; end if;

  if e.department_id is not null and not app.is_department_member(e.department_id) then
    raise exception 'this election is restricted to department members';
  end if;

  if exists (select 1 from election_ballots where election_id = p_election and membership_id = v_member) then
    raise exception 'you have already voted in this election';
  end if;

  insert into election_ballots (election_id, membership_id)
  values (p_election, v_member) returning * into v_ballot;

  v_anon := e.is_anonymous;

  for c in select * from jsonb_array_elements(p_choices) loop
    insert into election_votes (
      election_id, election_position_id, candidate_id, ballot_id,
      voter_membership_id, is_abstention
    ) values (
      p_election,
      (c->>'position_id')::uuid,
      nullif(c->>'candidate_id','')::uuid,
      case when v_anon then null else v_ballot.id end,
      case when v_anon then null else v_member end,
      coalesce((c->>'abstain')::boolean, false)
    );
  end loop;

  return v_ballot.receipt;
end $$;
