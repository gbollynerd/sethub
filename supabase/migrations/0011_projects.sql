-- ============================================================================
-- SetHub — 0011 SCHOOL-WIDE PROJECTS
-- A project belongs to the INSTITUTION, not a set. Multiple sets participate,
-- contribute money, and see the same transparent budget. Historical projects
-- (completed long before the platform existed) live here too.
-- ============================================================================

create table if not exists projects (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references institutions(id) on delete cascade,
  originating_set_id uuid references sets(id) on delete set null,
  title             text not null,
  slug              text unique,
  summary           text,
  description       text,
  cover_url         text,
  category          text not null default 'infrastructure'
                    check (category in ('infrastructure','equipment','scholarship','welfare','sports',
                                        'library','ict','renovation','endowment','event','other')),
  status            project_status not null default 'proposed',
  is_historical     boolean not null default false,        -- recorded after the fact
  year              int,                                    -- for historical entries
  starts_on         date,
  target_end_on     date,
  completed_on      date,
  currency          char(3) not null default 'NGN',
  estimated_cost    numeric(16,2) not null default 0,
  raised_amount     numeric(16,2) not null default 0,
  spent_amount      numeric(16,2) not null default 0,
  beneficiaries     text,
  location          text,
  school_liaison_name  text,
  school_liaison_role  text,
  school_liaison_phone text,
  school_liaison_email citext,
  coordinator_membership_id uuid references set_memberships(id) on delete set null,
  visibility        text not null default 'institution'
                    check (visibility in ('institution','participating_sets','public')),
  approved_by       uuid references profiles(id),
  approved_at       timestamptz,
  created_by        uuid references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists projects_institution_idx on projects (institution_id, status);
select app.attach_touch('projects');

alter table events            drop constraint if exists events_project_id_fkey,
  add constraint events_project_id_fkey foreign key (project_id) references projects(id) on delete set null;
alter table payments          drop constraint if exists payments_project_id_fkey,
  add constraint payments_project_id_fkey foreign key (project_id) references projects(id) on delete set null;
alter table expenses          drop constraint if exists expenses_project_id_fkey,
  add constraint expenses_project_id_fkey foreign key (project_id) references projects(id) on delete set null;
alter table donation_campaigns drop constraint if exists donation_campaigns_project_id_fkey,
  add constraint donation_campaigns_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;
alter table ledger_entries    drop constraint if exists ledger_entries_project_id_fkey,
  add constraint ledger_entries_project_id_fkey foreign key (project_id) references projects(id) on delete set null;

-- Which sets are in on this project.
create table if not exists project_sets (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  set_id       uuid not null references sets(id) on delete cascade,
  role         text not null default 'participant'
               check (role in ('lead','participant','observer','sponsor')),
  pledge_amount numeric(16,2) not null default 0,
  contributed_amount numeric(16,2) not null default 0,
  joined_at    timestamptz not null default now(),
  unique (project_id, set_id)
);
create index if not exists project_sets_set_idx on project_sets (set_id);

-- Budget breakdown lines — the transparency spine of a project.
create table if not exists project_budget_lines (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  label        text not null,
  category     text not null default 'other'
               check (category in ('construction','equipment','furniture','labour','materials',
                                   'transportation','professional_fees','contingency','other')),
  planned      numeric(16,2) not null default 0,
  actual       numeric(16,2) not null default 0,
  notes        text,
  sort_order   int not null default 0
);

create table if not exists project_stakeholders (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  membership_id uuid references set_memberships(id) on delete set null,
  external_name text,
  organisation  text,
  role          text not null,
  phone         text,
  email         citext,
  created_at    timestamptz not null default now()
);

create table if not exists project_updates (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  title         text not null,
  body          text,
  progress_pct  int check (progress_pct between 0 and 100),
  posted_by     uuid references profiles(id),
  created_at    timestamptz not null default now()
);

create table if not exists project_media (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  update_id    uuid references project_updates(id) on delete cascade,
  kind         media_kind not null default 'image',
  storage_path text,
  url          text,
  caption      text,
  phase        text check (phase in ('before','during','after','document','other')),
  uploaded_by  uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create table if not exists project_milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  title        text not null,
  description  text,
  due_on       date,
  completed_on date,
  sort_order   int not null default 0
);

-- Roll project money up from the shared ledger.
create or replace function app.sync_project_totals()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare v_project uuid := coalesce(new.project_id, old.project_id);
begin
  if v_project is null then return null; end if;

  update projects p set
    raised_amount = (select coalesce(sum(amount),0) from ledger_entries
                      where project_id = v_project and direction = 'income'),
    spent_amount  = (select coalesce(sum(amount),0) from ledger_entries
                      where project_id = v_project and direction = 'expense')
  where p.id = v_project;

  update project_sets ps set contributed_amount = (
    select coalesce(sum(le.amount),0)
      from ledger_entries le
     where le.project_id = v_project and le.direction = 'income' and le.set_id = ps.set_id)
  where ps.project_id = v_project;

  return null;
end $$;

drop trigger if exists trg_project_totals on ledger_entries;
create trigger trg_project_totals
  after insert or update or delete on ledger_entries
  for each row execute function app.sync_project_totals();

-- Every set that shares this project's institution can see it.
create or replace function app.can_view_project(p_project uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from projects p
     where p.id = p_project
       and (
         p.visibility = 'public'
         or (p.visibility = 'institution' and exists (
              select 1 from set_memberships m join sets s on s.id = m.set_id
               where m.user_id = p_user and m.status = 'active'
                 and s.institution_id = p.institution_id))
         or (p.visibility = 'participating_sets' and exists (
              select 1 from project_sets ps
               where ps.project_id = p.id and app.is_set_member(ps.set_id, p_user)))
         or app.is_platform_admin(p_user)
       )
  );
$$;

create or replace view project_funding_progress as
select
  p.id as project_id,
  p.title,
  p.currency,
  p.estimated_cost,
  p.raised_amount,
  p.spent_amount,
  greatest(p.estimated_cost - p.raised_amount, 0) as still_needed,
  case when p.estimated_cost > 0
       then round((p.raised_amount / p.estimated_cost) * 100, 1) else 0 end as funded_pct,
  (select count(*) from project_sets ps where ps.project_id = p.id) as participating_sets
from projects p;
