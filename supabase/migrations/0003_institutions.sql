-- ============================================================================
-- SetHub — 0003 INSTITUTION DIRECTORY
-- Platform-managed. Institution -> many sets. Also holds the reference data a
-- set draws from: houses, hostels, faculties and departments.
-- ============================================================================

create table if not exists institutions (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  short_name     text,
  aka            text[] not null default '{}',           -- former names / abbreviations
  type           institution_type not null,
  logo_url       text,
  cover_url      text,
  description    text,
  motto          text,
  founded_year   int check (founded_year between 1700 and extract(year from now())::int),
  website        text,
  email          citext,
  phone          text,
  address        text,
  city           text,
  state          text,
  country        text not null default 'Nigeria',
  ownership      text check (ownership in ('federal','state','private','mission','community','other')),
  gender         school_gender,
  residency      school_residency,
  has_houses     boolean not null default false,
  has_hostels    boolean not null default false,
  has_faculties  boolean not null default false,
  has_departments boolean not null default false,
  has_prefects   boolean not null default false,
  status         verification_status not null default 'verified',
  created_by     uuid references profiles(id),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists institutions_name_trgm on institutions using gin (name gin_trgm_ops);
create index if not exists institutions_type_idx on institutions (type, state);
select app.attach_touch('institutions');

-- Sensible defaults per institution type, applied at creation time by the app.
create or replace function app.default_institution_flags(p_type institution_type)
returns jsonb language sql immutable as $$
  select case p_type
    when 'secondary_school' then '{"has_houses":true,"has_hostels":true,"has_prefects":true,"has_faculties":false,"has_departments":false}'::jsonb
    when 'primary_school'   then '{"has_houses":true,"has_hostels":false,"has_prefects":true,"has_faculties":false,"has_departments":false}'::jsonb
    when 'university'       then '{"has_houses":false,"has_hostels":true,"has_prefects":false,"has_faculties":true,"has_departments":true}'::jsonb
    when 'polytechnic'      then '{"has_houses":false,"has_hostels":true,"has_prefects":false,"has_faculties":true,"has_departments":true}'::jsonb
    when 'college_of_education' then '{"has_houses":false,"has_hostels":true,"has_prefects":false,"has_faculties":true,"has_departments":true}'::jsonb
    when 'technical_school' then '{"has_houses":false,"has_hostels":true,"has_prefects":false,"has_faculties":false,"has_departments":true}'::jsonb
    else '{"has_houses":false,"has_hostels":false,"has_prefects":false,"has_faculties":false,"has_departments":false}'::jsonb
  end;
$$;

-- Houses (secondary schools): Red House, King's House, ...
create table if not exists institution_houses (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references institutions(id) on delete cascade,
  name            text not null,
  color           text,
  emblem_url      text,
  motto           text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  unique (institution_id, name)
);

-- Hostels / halls of residence.
create table if not exists institution_hostels (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references institutions(id) on delete cascade,
  name            text not null,
  gender          school_gender,
  description     text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  unique (institution_id, name)
);

-- Faculties / schools / colleges (tertiary).
create table if not exists institution_faculties (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references institutions(id) on delete cascade,
  name            text not null,
  short_name      text,
  color           text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  unique (institution_id, name)
);

-- Department catalogue for the institution. A set's departments (0004) point
-- here so "Computer Science, UNILAG" means the same thing across every set.
create table if not exists institution_departments (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references institutions(id) on delete cascade,
  faculty_id      uuid references institution_faculties(id) on delete set null,
  name            text not null,
  short_name      text,
  code            text,
  degree_awarded  text,
  color           text,
  icon            text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  unique (institution_id, name)
);
create index if not exists inst_departments_inst_idx on institution_departments (institution_id, faculty_id);

-- Prefect positions offered by the institution (secondary schools).
create table if not exists institution_prefect_positions (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid references institutions(id) on delete cascade,  -- null = platform default
  name            text not null,
  rank            int not null default 100,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- "My school isn't listed" — user submissions reviewed by platform admins.
-- ---------------------------------------------------------------------------
create table if not exists school_recommendations (
  id             uuid primary key default gen_random_uuid(),
  submitted_by   uuid not null references profiles(id) on delete cascade,
  name           text not null,
  type           institution_type not null,
  city           text,
  state          text,
  country        text default 'Nigeria',
  website        text,
  founded_year   int,
  notes          text,
  evidence_url   text,
  status         verification_status not null default 'pending',
  reviewed_by    uuid references profiles(id),
  reviewed_at    timestamptz,
  review_note    text,
  institution_id uuid references institutions(id) on delete set null, -- filled on approval
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists school_recs_status_idx on school_recommendations (status, created_at desc);
select app.attach_touch('school_recommendations');

-- Approving a recommendation creates the institution and links it back.
create or replace function approve_school_recommendation(p_recommendation_id uuid)
returns uuid language plpgsql security definer set search_path = public, app as $$
declare
  r school_recommendations;
  new_id uuid;
  flags jsonb;
begin
  if not app.is_platform_admin() then
    raise exception 'only platform administrators may approve school recommendations';
  end if;

  select * into r from school_recommendations where id = p_recommendation_id for update;
  if not found then raise exception 'recommendation not found'; end if;
  if r.status = 'verified' then return r.institution_id; end if;

  flags := app.default_institution_flags(r.type);

  insert into institutions (
    name, slug, type, city, state, country, website, founded_year,
    has_houses, has_hostels, has_faculties, has_departments, has_prefects,
    created_by, status
  ) values (
    r.name,
    app.slugify(r.name) || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
    r.type, r.city, r.state, r.country, r.website, r.founded_year,
    (flags->>'has_houses')::boolean, (flags->>'has_hostels')::boolean,
    (flags->>'has_faculties')::boolean, (flags->>'has_departments')::boolean,
    (flags->>'has_prefects')::boolean,
    r.submitted_by, 'verified'
  ) returning id into new_id;

  update school_recommendations
     set status = 'verified', institution_id = new_id,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_recommendation_id;

  return new_id;
end $$;

-- Slug helper used above and by the app.
create or replace function app.slugify(p_text text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(unaccent_fallback(p_text)), '[^a-z0-9]+', '-', 'g'));
$$;

-- unaccent may not be enabled on every project; degrade gracefully.
create or replace function unaccent_fallback(p_text text)
returns text language sql immutable as $$ select p_text; $$;
