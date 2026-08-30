-- Fix "infinite recursion detected in policy for relation project_sets" (and,
-- once that was closed, "...for relation projects").
--
-- This broke every RLS-checked read that touches project_sets — including
-- community search (search_set joins projects to project_sets) — so search
-- silently returned nothing instead of results.
--
-- Root cause, in two parts:
--
-- 1. project_sets_write (added by the loop in 0014_rls.sql, FOR ALL — so it
--    also applies to SELECT) checked permission with a raw subquery back
--    into project_sets itself: "exists (select 1 from project_sets ps
--    where ps.project_id = project_sets.project_id and ...)". Evaluating
--    that subquery re-entered project_sets' own RLS, which is a direct
--    cycle. The fix: the row being checked already carries set_id, so check
--    it directly — no self-join needed.
--
-- 2. projects_write (also FOR ALL) checked permission with a raw subquery
--    into project_sets: "exists (select 1 from project_sets ps where
--    ps.project_id = id and ...)". Raw policy subqueries run as the calling
--    role (authenticated), so that subquery is itself subject to
--    project_sets' select policy — which (via app.can_view_project) can
--    look back at projects. Two tables, each checking the other with a raw
--    subquery under RLS, is a mutual cycle. The fix: move the permission
--    check into a SECURITY DEFINER function (app.can_manage_project, same
--    pattern as the existing app.can_view_project) so the internal lookups
--    run as the bypassrls function owner instead of the querying role.

create or replace function app.can_manage_project(p_project uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from project_sets ps
     where ps.project_id = p_project and app.has_perm(ps.set_id, 'projects.manage', null, p_user)
  ) or exists (
    select 1 from projects p
     where p.id = p_project and p.originating_set_id is not null
       and app.has_perm(p.originating_set_id, 'projects.manage', null, p_user)
  ) or app.is_platform_admin(p_user);
$$;

grant execute on function app.can_manage_project(uuid, uuid) to authenticated;

drop policy if exists projects_write on public.projects;
create policy projects_write on public.projects for all to authenticated
  using (app.can_manage_project(id))
  with check (exists (select 1 from set_memberships m join sets s on s.id = m.set_id
                       where m.user_id = auth.uid() and m.status = 'active'
                         and s.institution_id = projects.institution_id
                         and (app.has_perm(s.id,'projects.create') or app.has_perm(s.id,'projects.propose')))
              or app.is_platform_admin());

drop policy if exists project_sets_write on public.project_sets;
create policy project_sets_write on public.project_sets for all to authenticated
  using (app.has_perm(project_sets.set_id, 'projects.manage'))
  with check (app.has_perm(project_sets.set_id, 'projects.manage'));

-- project_sets_select was never the problem on its own (app.can_view_project
-- is already SECURITY DEFINER, so its internal project_sets lookup bypasses
-- RLS) — restated here unchanged so this file is a complete, idempotent
-- record of the fix.
drop policy if exists project_sets_select on public.project_sets;
create policy project_sets_select on public.project_sets for select to authenticated
  using (app.can_view_project(project_id));
