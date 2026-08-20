-- ============================================================================
-- SetHub — 0010 FINANCE
-- Dues, payments, a double-entry-lite ledger, expenses with approval, budgets,
-- statements, donation campaigns and exports. Everything is scoped to one set
-- (optionally narrowed to one department, which can run its own purse).
-- ============================================================================

create table if not exists finance_accounts (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  name           text not null,
  kind           text not null default 'bank' check (kind in ('bank','cash','wallet','gateway','project')),
  bank_name      text,
  account_name   text,
  account_number text,
  currency       char(3) not null default 'NGN',
  opening_balance numeric(16,2) not null default 0,
  is_primary     boolean not null default false,
  is_active      boolean not null default true,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
select app.attach_touch('finance_accounts');

create table if not exists finance_categories (
  id            uuid primary key default gen_random_uuid(),
  set_id        uuid not null references sets(id) on delete cascade,
  direction     ledger_direction not null,
  name          text not null,
  color         text,
  icon          text,
  is_system     boolean not null default false,
  sort_order    int not null default 0,
  unique (set_id, direction, name)
);

-- ---------------------------------------------------------------------------
-- DUES
-- ---------------------------------------------------------------------------
create table if not exists dues (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  title          text not null,
  description    text,
  frequency      dues_frequency not null default 'annual',
  amount         numeric(14,2) not null check (amount >= 0),
  currency       char(3) not null default 'NGN',
  period_label   text,                                    -- "September 2026", "2026/2027"
  period_start   date,
  period_end     date,
  due_date       date,
  grace_days     int not null default 0,
  applies_to     text not null default 'all'
                 check (applies_to in ('all','department','group','custom','exco')),
  applies_group_id uuid references groups(id) on delete set null,
  is_mandatory   boolean not null default true,
  allow_partial  boolean not null default true,
  late_fee       numeric(14,2) not null default 0,
  account_id     uuid references finance_accounts(id) on delete set null,
  status         governance_status not null default 'open',
  assigned_count int not null default 0,
  paid_count     int not null default 0,
  expected_total numeric(16,2) not null default 0,
  collected_total numeric(16,2) not null default 0,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists dues_set_idx on dues (set_id, due_date desc);
select app.attach_touch('dues');

create table if not exists dues_assignments (
  id            uuid primary key default gen_random_uuid(),
  dues_id       uuid not null references dues(id) on delete cascade,
  membership_id uuid not null references set_memberships(id) on delete cascade,
  amount_due    numeric(14,2) not null,
  amount_paid   numeric(14,2) not null default 0,
  balance       numeric(14,2) generated always as (amount_due - amount_paid) stored,
  status        payment_status not null default 'pending',
  waived_reason text,
  waived_by     uuid references profiles(id),
  due_date      date,
  last_reminder_at timestamptz,
  reminder_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (dues_id, membership_id)
);
create index if not exists dues_assign_member_idx on dues_assignments (membership_id, status);
select app.attach_touch('dues_assignments');

-- ---------------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------------
create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  set_id          uuid not null references sets(id) on delete cascade,
  department_id   uuid references set_departments(id) on delete cascade,
  membership_id   uuid references set_memberships(id) on delete set null,
  dues_id         uuid references dues(id) on delete set null,
  assignment_id   uuid references dues_assignments(id) on delete set null,
  campaign_id     uuid,                                    -- FK added below
  project_id      uuid,                                    -- FK added in 0011
  account_id      uuid references finance_accounts(id) on delete set null,
  amount          numeric(14,2) not null check (amount > 0),
  currency        char(3) not null default 'NGN',
  method          payment_method not null default 'bank_transfer',
  status          payment_status not null default 'submitted',
  reference       text,
  provider_ref    text,
  provider        text,
  payer_name      text,                                    -- for offline / anonymous
  is_anonymous    boolean not null default false,
  paid_at         timestamptz not null default now(),
  proof_path      text,
  note            text,
  confirmed_by    uuid references profiles(id),
  confirmed_at    timestamptz,
  rejected_reason text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists payments_set_idx    on payments (set_id, paid_at desc);
create index if not exists payments_member_idx on payments (membership_id, paid_at desc);
create unique index if not exists payments_provider_ref_idx on payments (provider, provider_ref)
  where provider_ref is not null;
select app.attach_touch('payments');

-- ---------------------------------------------------------------------------
-- EXPENSES
-- ---------------------------------------------------------------------------
create table if not exists expenses (
  id              uuid primary key default gen_random_uuid(),
  set_id          uuid not null references sets(id) on delete cascade,
  department_id   uuid references set_departments(id) on delete cascade,
  project_id      uuid,                                    -- FK added in 0011
  event_id        uuid references events(id) on delete set null,
  category_id     uuid references finance_categories(id) on delete set null,
  account_id      uuid references finance_accounts(id) on delete set null,
  title           text not null,
  description     text,
  amount          numeric(14,2) not null check (amount > 0),
  currency        char(3) not null default 'NGN',
  spent_on        date not null default current_date,
  vendor          text,
  method          payment_method not null default 'bank_transfer',
  reference       text,
  receipt_path    text,
  status          text not null default 'submitted'
                  check (status in ('draft','submitted','approved','rejected','paid','void')),
  approved_by     uuid references profiles(id),
  approved_at     timestamptz,
  rejected_reason text,
  recorded_by     uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists expenses_set_idx on expenses (set_id, spent_on desc);
select app.attach_touch('expenses');

-- ---------------------------------------------------------------------------
-- LEDGER — the single source of truth for balances. Written by trigger from
-- confirmed payments and approved expenses, plus manual entries.
-- ---------------------------------------------------------------------------
create table if not exists ledger_entries (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  account_id     uuid references finance_accounts(id) on delete set null,
  category_id    uuid references finance_categories(id) on delete set null,
  direction      ledger_direction not null,
  amount         numeric(14,2) not null check (amount > 0),
  currency       char(3) not null default 'NGN',
  occurred_on    date not null default current_date,
  description    text not null,
  source_type    text check (source_type in ('payment','expense','donation','manual','opening','transfer')),
  source_id      uuid,
  project_id     uuid,
  is_reconciled  boolean not null default false,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  unique (source_type, source_id)
);
create index if not exists ledger_set_idx on ledger_entries (set_id, occurred_on desc);

create or replace function app.sync_ledger_from_payment()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if new.status = 'confirmed' then
    insert into ledger_entries (set_id, department_id, account_id, direction, amount, currency,
                                occurred_on, description, source_type, source_id, project_id, created_by)
    values (new.set_id, new.department_id, new.account_id, 'income', new.amount, new.currency,
            new.paid_at::date,
            coalesce(new.note, 'Payment ' || coalesce(new.reference, left(new.id::text, 8))),
            'payment', new.id, new.project_id, new.confirmed_by)
    on conflict (source_type, source_id) do update
      set amount = excluded.amount, occurred_on = excluded.occurred_on;
  else
    delete from ledger_entries where source_type = 'payment' and source_id = new.id;
  end if;

  -- Roll the payment up into its dues assignment.
  if new.assignment_id is not null then
    update dues_assignments a
       set amount_paid = (
             select coalesce(sum(p.amount),0) from payments p
              where p.assignment_id = a.id and p.status = 'confirmed'),
           status = case
             when (select coalesce(sum(p.amount),0) from payments p
                    where p.assignment_id = a.id and p.status = 'confirmed') >= a.amount_due
               then 'confirmed'::payment_status
             when (select coalesce(sum(p.amount),0) from payments p
                    where p.assignment_id = a.id and p.status = 'confirmed') > 0
               then 'partial'::payment_status
             else 'pending'::payment_status end
     where a.id = new.assignment_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_payment_ledger on payments;
create trigger trg_payment_ledger
  after insert or update of status, amount on payments
  for each row execute function app.sync_ledger_from_payment();

create or replace function app.sync_ledger_from_expense()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if new.status in ('approved','paid') then
    insert into ledger_entries (set_id, department_id, account_id, category_id, direction, amount,
                                currency, occurred_on, description, source_type, source_id,
                                project_id, created_by)
    values (new.set_id, new.department_id, new.account_id, new.category_id, 'expense', new.amount,
            new.currency, new.spent_on, new.title, 'expense', new.id, new.project_id, new.recorded_by)
    on conflict (source_type, source_id) do update
      set amount = excluded.amount, occurred_on = excluded.occurred_on,
          description = excluded.description, category_id = excluded.category_id;
  else
    delete from ledger_entries where source_type = 'expense' and source_id = new.id;
  end if;
  return null;
end $$;

drop trigger if exists trg_expense_ledger on expenses;
create trigger trg_expense_ledger
  after insert or update of status, amount on expenses
  for each row execute function app.sync_ledger_from_expense();

-- Keep dues headline numbers current.
create or replace function app.sync_dues_totals()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare v_dues uuid := coalesce(new.dues_id, old.dues_id);
begin
  update dues d set
    assigned_count  = (select count(*) from dues_assignments a where a.dues_id = v_dues),
    paid_count      = (select count(*) from dues_assignments a where a.dues_id = v_dues and a.status = 'confirmed'),
    expected_total  = (select coalesce(sum(a.amount_due),0) from dues_assignments a where a.dues_id = v_dues),
    collected_total = (select coalesce(sum(a.amount_paid),0) from dues_assignments a where a.dues_id = v_dues)
  where d.id = v_dues;
  return null;
end $$;

drop trigger if exists trg_dues_totals on dues_assignments;
create trigger trg_dues_totals
  after insert or update or delete on dues_assignments
  for each row execute function app.sync_dues_totals();

-- ---------------------------------------------------------------------------
-- DONATION CAMPAIGNS
-- ---------------------------------------------------------------------------
create table if not exists donation_campaigns (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid references sets(id) on delete cascade,
  institution_id uuid references institutions(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  project_id     uuid,                                     -- FK added in 0011
  title          text not null,
  slug           text unique,
  story          text,
  cover_url      text,
  goal_amount    numeric(16,2) not null default 0,
  raised_amount  numeric(16,2) not null default 0,
  donor_count    int not null default 0,
  currency       char(3) not null default 'NGN',
  starts_on      date,
  ends_on        date,
  is_public      boolean not null default true,
  allow_anonymous boolean not null default true,
  status         governance_status not null default 'open',
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (set_id is not null or institution_id is not null)
);
select app.attach_touch('donation_campaigns');

alter table payments
  drop constraint if exists payments_campaign_id_fkey,
  add constraint payments_campaign_id_fkey
  foreign key (campaign_id) references donation_campaigns(id) on delete set null;

create or replace function app.sync_campaign_totals()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare v_campaign uuid := coalesce(new.campaign_id, old.campaign_id);
begin
  if v_campaign is null then return null; end if;
  update donation_campaigns c set
    raised_amount = (select coalesce(sum(p.amount),0) from payments p
                      where p.campaign_id = v_campaign and p.status = 'confirmed'),
    donor_count   = (select count(distinct coalesce(p.membership_id::text, p.reference))
                       from payments p where p.campaign_id = v_campaign and p.status = 'confirmed')
  where c.id = v_campaign;
  return null;
end $$;

drop trigger if exists trg_campaign_totals on payments;
create trigger trg_campaign_totals
  after insert or update of status, amount, campaign_id or delete on payments
  for each row execute function app.sync_campaign_totals();

-- ---------------------------------------------------------------------------
-- STATEMENTS, BUDGETS, REPORTS, EXPORTS
-- ---------------------------------------------------------------------------
create table if not exists financial_statements (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  title          text not null,
  kind           text not null default 'monthly'
                 check (kind in ('bank','monthly','quarterly','annual','audit','receipt','invoice','budget','other')),
  period_start   date,
  period_end     date,
  storage_path   text,
  file_name      text,
  mime_type      text,
  byte_size      bigint,
  summary        text,
  is_published   boolean not null default false,
  published_at   timestamptz,
  uploaded_by    uuid references profiles(id),
  created_at     timestamptz not null default now()
);
create index if not exists statements_set_idx on financial_statements (set_id, period_end desc);

create table if not exists budgets (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  project_id     uuid,
  name           text not null,
  period_start   date not null,
  period_end     date not null,
  status         text not null default 'draft' check (status in ('draft','active','closed')),
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now()
);

create table if not exists budget_lines (
  id           uuid primary key default gen_random_uuid(),
  budget_id    uuid not null references budgets(id) on delete cascade,
  category_id  uuid references finance_categories(id) on delete set null,
  label        text not null,
  direction    ledger_direction not null default 'expense',
  planned      numeric(14,2) not null default 0,
  notes        text,
  sort_order   int not null default 0
);

-- Export jobs: members request, the app renders CSV/PDF/XLSX to storage.
create table if not exists finance_exports (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  scope          text not null check (scope in
                   ('ledger','payments','dues','expenses','donations','members','statement','full_report','project')),
  format         export_format not null default 'csv',
  period_start   date,
  period_end     date,
  filters        jsonb not null default '{}'::jsonb,
  status         export_status not null default 'queued',
  row_count      int,
  storage_path   text,
  file_name      text,
  byte_size      bigint,
  error          text,
  expires_at     timestamptz default now() + interval '7 days',
  requested_by   uuid not null references profiles(id),
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index if not exists finance_exports_set_idx on finance_exports (set_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Reporting views
-- ---------------------------------------------------------------------------
create or replace view set_finance_summary as
select
  s.id as set_id,
  s.currency,
  coalesce(sum(le.amount) filter (where le.direction = 'income'), 0)  as total_income,
  coalesce(sum(le.amount) filter (where le.direction = 'expense'), 0) as total_expense,
  coalesce(sum(le.amount) filter (where le.direction = 'income'), 0)
    - coalesce(sum(le.amount) filter (where le.direction = 'expense'), 0) as balance
from sets s
left join ledger_entries le on le.set_id = s.id
group by s.id, s.currency;

create or replace view set_dues_outstanding as
select
  a.membership_id,
  m.set_id,
  m.user_id,
  count(*) filter (where a.balance > 0) as unpaid_count,
  coalesce(sum(a.balance) filter (where a.balance > 0), 0) as outstanding
from dues_assignments a
join set_memberships m on m.id = a.membership_id
group by a.membership_id, m.set_id, m.user_id;

create or replace view monthly_cashflow as
select
  set_id,
  department_id,
  date_trunc('month', occurred_on)::date as month,
  coalesce(sum(amount) filter (where direction = 'income'), 0)  as income,
  coalesce(sum(amount) filter (where direction = 'expense'), 0) as expense
from ledger_entries
group by set_id, department_id, date_trunc('month', occurred_on);
