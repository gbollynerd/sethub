-- ============================================================================
-- SetHub — 0023 PROPOSE PROJECT RPC
--
-- Batch 7 added a project create flow, and it exposed a real RLS gap: the
-- generic policy that lets someone create a `projects` row only requires
-- projects.propose/.create, but making that project manageable afterwards
-- (a project_sets row, and any project_milestones) requires projects.manage
-- on the set — a permission the seeded "president"-style roles deliberately
-- don't have (see 0005_roles_permissions.sql: that role gets propose+create,
-- project_coordinator gets manage). A plain proposer's client-side inserts
-- into project_sets/project_milestones would silently fail under RLS,
-- leaving the project permanently orphaned — nobody could ever edit it.
--
-- Fix: move project creation (plus the lead project_sets row and any
-- milestones submitted with the proposal) into one SECURITY DEFINER RPC
-- that enforces the real rule itself (propose or create permission) instead
-- of relying on the caller also holding projects.manage. Same pattern as
-- invite_to_exco/set_current_exco_term from the EXCO batch, and consistent
-- with 0021_fix_project_sets_recursion.sql's app.can_manage_project.
-- ============================================================================

create or replace function propose_project(
  p_set_id uuid,
  p_title text,
  p_summary text default null,
  p_description text default null,
  p_category text default 'infrastructure',
  p_currency text default null,
  p_estimated_cost numeric default 0,
  p_starts_on date default null,
  p_target_end_on date default null,
  p_beneficiaries text default null,
  p_location text default null,
  p_school_liaison_name text default null,
  p_school_liaison_role text default null,
  p_school_liaison_phone text default null,
  p_school_liaison_email text default null,
  p_milestones jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = public, app, extensions as $$
declare
  v_institution_id uuid;
  v_currency text;
  v_project_id uuid;
  m jsonb;
  i int := 0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not (app.has_perm(p_set_id, 'projects.propose') or app.has_perm(p_set_id, 'projects.create')) then
    raise exception 'you do not have permission to propose projects for this set';
  end if;
  if p_title is null or btrim(p_title) = '' then raise exception 'a project title is required'; end if;

  select institution_id, coalesce(nullif(btrim(p_currency), ''), currency)
    into v_institution_id, v_currency
    from sets where id = p_set_id;
  if v_institution_id is null then raise exception 'set not found'; end if;

  insert into projects (
    institution_id, originating_set_id, created_by, status, title, slug,
    summary, description, category, currency, estimated_cost,
    starts_on, target_end_on, beneficiaries, location,
    school_liaison_name, school_liaison_role, school_liaison_phone, school_liaison_email
  )
  values (
    v_institution_id, p_set_id, auth.uid(), 'proposed', btrim(p_title),
    nullif(regexp_replace(lower(btrim(p_title)), '[^a-z0-9]+', '-', 'g'), '-'),
    nullif(btrim(p_summary), ''), nullif(btrim(p_description), ''), coalesce(nullif(p_category, ''), 'infrastructure'),
    coalesce(v_currency, 'NGN'), coalesce(p_estimated_cost, 0), p_starts_on, p_target_end_on,
    nullif(btrim(p_beneficiaries), ''), nullif(btrim(p_location), ''),
    nullif(btrim(p_school_liaison_name), ''), nullif(btrim(p_school_liaison_role), ''),
    nullif(btrim(p_school_liaison_phone), ''), nullif(btrim(p_school_liaison_email), '')
  )
  returning id into v_project_id;

  insert into project_sets (project_id, set_id, role) values (v_project_id, p_set_id, 'lead');

  for m in select * from jsonb_array_elements(coalesce(p_milestones, '[]'::jsonb))
  loop
    if coalesce(btrim(m->>'title'), '') <> '' then
      insert into project_milestones (project_id, title, due_on, sort_order)
      values (v_project_id, btrim(m->>'title'), nullif(m->>'due_on', '')::date, i);
    end if;
    i := i + 1;
  end loop;

  return v_project_id;
end $$;

grant execute on function propose_project(
  uuid, text, text, text, text, text, numeric, date, date, text, text, text, text, text, text, jsonb
) to authenticated;
