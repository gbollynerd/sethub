-- ============================================================================
-- SetHub — 0018 HARDENING
-- Follows the Supabase database linter:
--   1. Pin search_path on the remaining helper functions.
--   2. Revoke anon EXECUTE from every SECURITY DEFINER RPC except the invite
--      preview, which a signed-out visitor needs to render the landing page.
--   3. Keep the `app` helper schema off the public API entirely — those
--      functions exist to be called from RLS policies, not over PostgREST.
-- ============================================================================

alter function app.touch_updated_at() set search_path = public, app;
alter function app.attach_touch(regclass) set search_path = public, app;
alter function app.default_institution_flags(institution_type) set search_path = public, app;
alter function app.slugify(text) set search_path = public, app;
alter function app.path_set_id(text) set search_path = public, app;
alter function public.unaccent_fallback(text) set search_path = public;

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon', fn.sig);
    if fn.proname = 'preview_invite' then
      execute format('grant execute on function %s to anon, authenticated', fn.sig);
    else
      execute format('grant execute on function %s to authenticated', fn.sig);
    end if;
  end loop;
end $$;

revoke all on all functions in schema app from public, anon;
grant execute on all functions in schema app to authenticated;
grant execute on function app.is_platform_admin(uuid) to anon;
