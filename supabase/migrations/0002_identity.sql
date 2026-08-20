-- ============================================================================
-- SetHub — 0002 GLOBAL IDENTITY
-- One person -> one account. Global data only. Anything school-specific lives
-- on the membership (0004), never here.
-- ============================================================================

create table if not exists profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              citext not null,
  first_name         text,
  last_name          text,
  display_name       text generated always as (
                       nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), '')
                     ) stored,
  avatar_url         text,
  cover_url          text,
  phone              text,
  phone_verified     boolean not null default false,
  date_of_birth      date,
  gender             text check (gender in ('male','female','other','undisclosed')),
  bio                text check (char_length(bio) <= 1000),
  country            text default 'Nigeria',
  state              text,
  city               text,
  timezone           text default 'Africa/Lagos',
  locale             text default 'en',
  employment         employment_status,
  profession         text,
  employer           text,
  linkedin_url       text,
  x_url              text,
  instagram_url      text,
  facebook_url       text,
  website_url        text,
  onboarded_at       timestamptz,
  last_seen_at       timestamptz,
  suspended_at       timestamptz,
  suspension_reason  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists profiles_name_trgm on profiles using gin (
  (coalesce(first_name,'') || ' ' || coalesce(last_name,'')) gin_trgm_ops);
create index if not exists profiles_email_idx on profiles (email);
select app.attach_touch('profiles');

-- Field-level privacy. Absent row => platform default (see app.default_privacy).
create table if not exists profile_privacy (
  user_id        uuid primary key references profiles(id) on delete cascade,
  date_of_birth  privacy_level not null default 'set_members',
  phone          privacy_level not null default 'set_members',
  email          privacy_level not null default 'admins',
  employment     privacy_level not null default 'set_members',
  business       privacy_level not null default 'public',
  location       privacy_level not null default 'set_members',
  hostel         privacy_level not null default 'set_members',
  house          privacy_level not null default 'set_members',
  marital_status privacy_level not null default 'private',
  socials        privacy_level not null default 'set_members',
  searchable     boolean not null default true,
  updated_at     timestamptz not null default now()
);
select app.attach_touch('profile_privacy');

-- Global notification preferences; per-set overrides live in 0013.
create table if not exists notification_preferences (
  user_id            uuid primary key references profiles(id) on delete cascade,
  channels           notify_channel[] not null default '{in_app,email}',
  announcements      boolean not null default true,
  messages           boolean not null default true,
  mentions           boolean not null default true,
  events             boolean not null default true,
  elections          boolean not null default true,
  polls_quizzes      boolean not null default true,
  dues               boolean not null default true,
  payments           boolean not null default true,
  projects           boolean not null default true,
  admin_actions      boolean not null default true,
  digest_frequency   text not null default 'daily' check (digest_frequency in ('off','realtime','daily','weekly')),
  quiet_hours_start  time,
  quiet_hours_end    time,
  updated_at         timestamptz not null default now()
);
select app.attach_touch('notification_preferences');

-- Businesses are global (a person's business follows them into every set),
-- but discovery is always scoped to sets the owner belongs to.
create table if not exists businesses (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references profiles(id) on delete cascade,
  name           text not null,
  slug           text unique,
  category       text,
  description    text,
  logo_url       text,
  cover_url      text,
  website        text,
  phone          text,
  email          citext,
  address        text,
  city           text,
  state          text,
  country        text default 'Nigeria',
  whatsapp       text,
  instagram      text,
  x_handle       text,
  linkedin       text,
  offerings      text[] not null default '{}',
  is_published   boolean not null default true,
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists businesses_owner_idx on businesses (owner_id);
create index if not exists businesses_name_trgm on businesses using gin (name gin_trgm_ops);
select app.attach_touch('businesses');

-- ---------------------------------------------------------------------------
-- Auto-provision a profile whenever an auth user is created.
-- ---------------------------------------------------------------------------
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  insert into profiles (id, email, first_name, last_name, avatar_url, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(coalesce(new.raw_user_meta_data->>'full_name',''), ' ', 1)),
    coalesce(new.raw_user_meta_data->>'last_name',  nullif(split_part(coalesce(new.raw_user_meta_data->>'full_name',''), ' ', 2), '')),
    new.raw_user_meta_data->>'avatar_url',
    new.phone
  )
  on conflict (id) do update set email = excluded.email;

  insert into profile_privacy (user_id) values (new.id) on conflict do nothing;
  insert into notification_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
