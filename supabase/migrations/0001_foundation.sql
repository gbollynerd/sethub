-- ============================================================================
-- SetHub — 0001 FOUNDATION
-- Extensions, enums, helper schema, updated_at trigger, platform admin table.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "citext";

-- Everything security-sensitive lives in `app`, never exposed via PostgREST.
create schema if not exists app;
revoke all on schema app from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type institution_type as enum (
    'secondary_school','university','polytechnic','technical_school',
    'college_of_education','vocational','primary_school','seminary','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type school_gender as enum ('boys','girls','mixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type school_residency as enum ('day','boarding','day_and_boarding');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('unverified','pending','verified','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type membership_status as enum ('pending','active','suspended','rejected','left','removed');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Ordered loosest -> tightest for UI sorting.
  create type privacy_level as enum ('public','set_members','department','groups','admins','private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type employment_status as enum (
    'employed','self_employed','business_owner','seeking','unemployed','student','retired','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type channel_visibility as enum ('public','private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_kind as enum ('text','file','image','system','poll','event');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rsvp_status as enum ('going','maybe','not_going','waitlist','attended','no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type poll_kind as enum ('single','multiple');
exception when duplicate_object then null; end $$;

do $$ begin
  create type governance_status as enum ('draft','scheduled','open','closed','published','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type election_stage as enum ('draft','nominations','campaign','voting','counting','published','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dues_frequency as enum ('one_time','monthly','quarterly','biannual','annual','levy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending','submitted','confirmed','failed','refunded','waived','partial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('bank_transfer','card','cash','ussd','paystack','flutterwave','cheque','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ledger_direction as enum ('income','expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('proposed','approved','fundraising','in_progress','on_hold','completed','cancelled','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invite_scope as enum ('set','department','group','channel');
exception when duplicate_object then null; end $$;

do $$ begin
  create type integration_provider as enum ('whatsapp','telegram','slack','discord','email','sms','webhook','zapier','google_calendar');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_status as enum ('queued','sending','sent','failed','skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notify_channel as enum ('in_app','email','sms','whatsapp','push');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_status as enum ('open','reviewing','actioned','dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_kind as enum ('image','video','audio','document','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type export_format as enum ('csv','pdf','xlsx','json');
exception when duplicate_object then null; end $$;

do $$ begin
  create type export_status as enum ('queued','processing','ready','failed','expired');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Convenience: attach the touch trigger to a table.
create or replace function app.attach_touch(p_table regclass)
returns void language plpgsql as $$
declare t text := p_table::text;
begin
  execute format(
    'drop trigger if exists trg_touch on %s; create trigger trg_touch before update on %s
     for each row execute function app.touch_updated_at();', t, t);
end $$;

-- ---------------------------------------------------------------------------
-- PLATFORM ADMINISTRATORS (staff of SetHub itself)
-- ---------------------------------------------------------------------------
create table if not exists platform_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'admin' check (role in ('admin','superadmin','moderator','support')),
  granted_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
alter table platform_admins enable row level security;

create or replace function app.is_platform_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (select 1 from platform_admins pa where pa.user_id = p_user);
$$;

create policy platform_admins_read on platform_admins
  for select to authenticated using (app.is_platform_admin());
create policy platform_admins_write on platform_admins
  for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

grant usage on schema app to authenticated, anon;
grant execute on function app.is_platform_admin(uuid) to authenticated, anon;
