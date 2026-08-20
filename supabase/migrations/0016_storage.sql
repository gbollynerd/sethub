-- ============================================================================
-- SetHub — 0016 STORAGE BUCKETS
-- Path convention for every private bucket:  <set_id>/<rest-of-path>
-- so a single policy can check set membership from the first path segment.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',    'avatars',    true,  5242880,  array['image/png','image/jpeg','image/webp','image/gif']),
  ('branding',   'branding',   true,  5242880,  array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('albums',     'albums',     false, 52428800, null),
  ('messages',   'messages',   false, 26214400, null),
  ('documents',  'documents',  false, 52428800, null),
  ('receipts',   'receipts',   false, 10485760, null),
  ('exports',    'exports',    false, 52428800, null),
  ('projects',   'projects',   false, 52428800, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Helper: first path segment as a set id, when it parses as a uuid.
create or replace function app.path_set_id(p_name text)
returns uuid language plpgsql immutable as $$
declare v uuid;
begin
  begin
    v := (string_to_array(p_name, '/'))[1]::uuid;
  exception when others then
    return null;
  end;
  return v;
end $$;

-- --- Public buckets ---------------------------------------------------------
drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars" on storage.objects for select
  using (bucket_id in ('avatars','branding'));

drop policy if exists "own avatar write" on storage.objects;
create policy "own avatar write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own avatar update" on storage.objects;
create policy "own avatar update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own avatar delete" on storage.objects;
create policy "own avatar delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "branding write" on storage.objects;
create policy "branding write" on storage.objects for insert to authenticated
  with check (bucket_id = 'branding'
              and app.path_set_id(name) is not null
              and app.has_perm(app.path_set_id(name), 'settings.manage'));

-- --- Set-scoped private buckets --------------------------------------------
drop policy if exists "set members read" on storage.objects;
create policy "set members read" on storage.objects for select to authenticated
  using (
    bucket_id in ('albums','messages','documents','projects')
    and app.path_set_id(name) is not null
    and app.is_set_member(app.path_set_id(name))
  );

drop policy if exists "set members write" on storage.objects;
create policy "set members write" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('albums','messages','documents','projects')
    and app.path_set_id(name) is not null
    and app.is_set_member(app.path_set_id(name))
  );

drop policy if exists "uploader manages own object" on storage.objects;
create policy "uploader manages own object" on storage.objects for update to authenticated
  using (owner = auth.uid());

drop policy if exists "uploader deletes own object" on storage.objects;
create policy "uploader deletes own object" on storage.objects for delete to authenticated
  using (owner = auth.uid()
         or (app.path_set_id(name) is not null and app.is_set_admin(app.path_set_id(name))));

-- --- Finance buckets: permissioned, not merely membership-gated -------------
drop policy if exists "finance read" on storage.objects;
create policy "finance read" on storage.objects for select to authenticated
  using (
    bucket_id in ('receipts','exports')
    and app.path_set_id(name) is not null
    and (app.has_perm(app.path_set_id(name), 'finance.view') or owner = auth.uid())
  );

drop policy if exists "finance write" on storage.objects;
create policy "finance write" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('receipts','exports')
    and app.path_set_id(name) is not null
    and (app.has_perm(app.path_set_id(name), 'finance.expenses_record')
         or app.has_perm(app.path_set_id(name), 'finance.export')
         or app.is_set_member(app.path_set_id(name)))   -- members upload payment proof
  );
