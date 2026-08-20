-- ============================================================================
-- SetHub — 0012 ALBUMS, DOCUMENTS, LINKS + calendar synchronisation
-- ============================================================================

create table if not exists albums (
  id             uuid primary key default gen_random_uuid(),
  set_id         uuid not null references sets(id) on delete cascade,
  department_id  uuid references set_departments(id) on delete cascade,
  group_id       uuid references groups(id) on delete cascade,
  event_id       uuid references events(id) on delete set null,
  project_id     uuid references projects(id) on delete set null,
  title          text not null,
  description    text,
  cover_url      text,
  taken_on       date,
  kind           text not null default 'general'
                 check (kind in ('general','event','reunion','graduation','school_visit','exco','project','throwback')),
  visibility     privacy_level not null default 'set_members',
  allow_download boolean not null default true,
  allow_uploads  boolean not null default false,   -- members may add to it
  media_count    int not null default 0,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists albums_set_idx on albums (set_id, created_at desc);
select app.attach_touch('albums');

create table if not exists album_media (
  id            uuid primary key default gen_random_uuid(),
  album_id      uuid not null references albums(id) on delete cascade,
  kind          media_kind not null default 'image',
  storage_path  text not null,
  thumbnail_path text,
  file_name     text,
  mime_type     text,
  byte_size     bigint,
  width         int,
  height        int,
  duration_s    int,
  caption       text,
  taken_on      date,
  tagged_members uuid[] not null default '{}',
  sort_order    int not null default 0,
  uploaded_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index if not exists album_media_album_idx on album_media (album_id, sort_order);

create or replace function app.sync_album_count()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare target uuid := coalesce(new.album_id, old.album_id);
begin
  update albums a set media_count = (select count(*) from album_media m where m.album_id = target)
   where a.id = target;
  return null;
end $$;

drop trigger if exists trg_album_count on album_media;
create trigger trg_album_count after insert or delete on album_media
  for each row execute function app.sync_album_count();

-- ---------------------------------------------------------------------------
-- DOCUMENT LIBRARY
-- ---------------------------------------------------------------------------
create table if not exists document_folders (
  id            uuid primary key default gen_random_uuid(),
  set_id        uuid not null references sets(id) on delete cascade,
  department_id uuid references set_departments(id) on delete cascade,
  parent_id     uuid references document_folders(id) on delete cascade,
  name          text not null,
  description   text,
  icon          text,
  visibility    privacy_level not null default 'set_members',
  sort_order    int not null default 0,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  set_id        uuid not null references sets(id) on delete cascade,
  department_id uuid references set_departments(id) on delete cascade,
  folder_id     uuid references document_folders(id) on delete set null,
  group_id      uuid references groups(id) on delete cascade,
  project_id    uuid references projects(id) on delete set null,
  title         text not null,
  description   text,
  category      text not null default 'general'
                check (category in ('constitution','minutes','financial','project','election',
                                    'correspondence','form','historical','policy','general')),
  storage_path  text not null,
  file_name     text not null,
  mime_type     text,
  byte_size     bigint,
  version       int not null default 1,
  supersedes_id uuid references documents(id) on delete set null,
  visibility    privacy_level not null default 'set_members',
  allow_download boolean not null default true,
  download_count int not null default 0,
  uploaded_by   uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists documents_set_idx on documents (set_id, created_at desc);
create index if not exists documents_title_trgm on documents using gin (title gin_trgm_ops);
select app.attach_touch('documents');

-- ---------------------------------------------------------------------------
-- USEFUL LINKS
-- ---------------------------------------------------------------------------
create table if not exists useful_links (
  id            uuid primary key default gen_random_uuid(),
  set_id        uuid not null references sets(id) on delete cascade,
  department_id uuid references set_departments(id) on delete cascade,
  title         text not null,
  url           text not null,
  description   text,
  icon          text,
  category      text not null default 'other'
                check (category in ('school','alumni','payment','social','drive','project','form','other')),
  sort_order    int not null default 0,
  is_pinned     boolean not null default false,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CALENDAR SYNCHRONISATION — keeps calendar_entries in step with everything.
-- ---------------------------------------------------------------------------
create or replace function app.calendar_upsert(
  p_set uuid, p_dept uuid, p_type text, p_id uuid, p_title text, p_subtitle text,
  p_start timestamptz, p_end timestamptz, p_all_day boolean, p_color text, p_icon text, p_href text)
returns void language sql security definer set search_path = public, app as $$
  insert into calendar_entries (set_id, department_id, source_type, source_id, title, subtitle,
                                starts_at, ends_at, all_day, color, icon, href)
  values (p_set, p_dept, p_type, p_id, p_title, p_subtitle, p_start, p_end,
          coalesce(p_all_day,false), p_color, p_icon, p_href)
  on conflict (source_type, source_id) do update set
    title = excluded.title, subtitle = excluded.subtitle, starts_at = excluded.starts_at,
    ends_at = excluded.ends_at, all_day = excluded.all_day, department_id = excluded.department_id,
    color = excluded.color, icon = excluded.icon, href = excluded.href;
$$;

create or replace function app.calendar_sync_event()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if tg_op = 'DELETE' then
    delete from calendar_entries where source_type = 'event' and source_id = old.id;
    return null;
  end if;
  perform app.calendar_upsert(new.set_id, new.department_id, 'event', new.id, new.title,
    new.location_name, new.starts_at, new.ends_at, new.all_day, '#0898A0', 'calendar',
    '/s/' || new.set_id || '/events/' || new.id);
  return null;
end $$;
drop trigger if exists trg_cal_event on events;
create trigger trg_cal_event after insert or update or delete on events
  for each row execute function app.calendar_sync_event();

create or replace function app.calendar_sync_election()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if tg_op = 'DELETE' then
    delete from calendar_entries where source_type = 'election' and source_id = old.id;
    return null;
  end if;
  if new.voting_opens_at is not null then
    perform app.calendar_upsert(new.set_id, new.department_id, 'election', new.id, new.title,
      'Voting opens', new.voting_opens_at, new.voting_closes_at, false, '#6E6B8F', 'vote',
      '/s/' || new.set_id || '/elections/' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists trg_cal_election on elections;
create trigger trg_cal_election after insert or update or delete on elections
  for each row execute function app.calendar_sync_election();

create or replace function app.calendar_sync_poll()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if tg_op = 'DELETE' then
    delete from calendar_entries where source_type = 'poll' and source_id = old.id;
    return null;
  end if;
  if new.closes_at is not null then
    perform app.calendar_upsert(new.set_id, new.department_id, 'poll', new.id, new.question,
      'Poll closes', new.closes_at, null, false, '#F0C875', 'poll',
      '/s/' || new.set_id || '/community/polls/' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists trg_cal_poll on polls;
create trigger trg_cal_poll after insert or update or delete on polls
  for each row execute function app.calendar_sync_poll();

create or replace function app.calendar_sync_quiz()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if tg_op = 'DELETE' then
    delete from calendar_entries where source_type = 'quiz' and source_id = old.id;
    return null;
  end if;
  if new.opens_at is not null then
    perform app.calendar_upsert(new.set_id, new.department_id, 'quiz', new.id, new.title,
      'Quiz', new.opens_at, new.closes_at, false, '#D9791C', 'quiz',
      '/s/' || new.set_id || '/community/quizzes/' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists trg_cal_quiz on quizzes;
create trigger trg_cal_quiz after insert or update or delete on quizzes
  for each row execute function app.calendar_sync_quiz();

create or replace function app.calendar_sync_dues()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  if tg_op = 'DELETE' then
    delete from calendar_entries where source_type = 'dues' and source_id = old.id;
    return null;
  end if;
  if new.due_date is not null then
    perform app.calendar_upsert(new.set_id, new.department_id, 'dues', new.id, new.title,
      'Dues deadline', new.due_date::timestamptz, null, true, '#0F9D74', 'wallet',
      '/s/' || new.set_id || '/finances/dues/' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists trg_cal_dues on dues;
create trigger trg_cal_dues after insert or update or delete on dues
  for each row execute function app.calendar_sync_dues();

create or replace function app.calendar_sync_milestone()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare v_project projects; v_set uuid;
begin
  if tg_op = 'DELETE' then
    delete from calendar_entries where source_type = 'project_milestone' and source_id = old.id;
    return null;
  end if;
  select * into v_project from projects where id = new.project_id;
  for v_set in select set_id from project_sets where project_id = new.project_id loop
    if new.due_on is not null then
      perform app.calendar_upsert(v_set, null, 'project_milestone', new.id, new.title,
        v_project.title, new.due_on::timestamptz, null, true, '#1E88E5', 'project',
        '/s/' || v_set || '/projects/' || new.project_id);
    end if;
  end loop;
  return null;
end $$;
drop trigger if exists trg_cal_milestone on project_milestones;
create trigger trg_cal_milestone after insert or update or delete on project_milestones
  for each row execute function app.calendar_sync_milestone();
