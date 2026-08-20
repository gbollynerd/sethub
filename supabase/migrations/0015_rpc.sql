-- ============================================================================
-- SetHub — 0015 APPLICATION RPCs
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Create a set (workspace). The caller becomes owner + founding member.
-- ---------------------------------------------------------------------------
create or replace function create_set(
  p_institution_id uuid,
  p_graduation_year int,
  p_name text default null,
  p_programme_level text default 'main',
  p_description text default null,
  p_departments_enabled boolean default null
) returns uuid language plpgsql security definer set search_path = public, app as $$
declare
  v_set uuid;
  v_inst institutions;
  v_slug text;
  v_name text;
  v_departments boolean;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_inst from institutions where id = p_institution_id;
  if not found then raise exception 'institution not found'; end if;

  v_name := coalesce(p_name, 'Class of ' || p_graduation_year);
  v_slug := 'class-of-' || p_graduation_year ||
            case when p_programme_level = 'main' then '' else '-' || p_programme_level end;
  v_departments := coalesce(p_departments_enabled, v_inst.has_departments);

  insert into sets (institution_id, graduation_year, programme_level, name, slug, description,
                    departments_enabled, owner_id, created_by, status, join_policy)
  values (p_institution_id, p_graduation_year, p_programme_level, v_name, v_slug, p_description,
          v_departments, auth.uid(), auth.uid(), 'pending', 'request')
  returning id into v_set;

  perform app.seed_set_defaults(v_set, auth.uid());
  perform app.seed_set_channels(v_set, auth.uid());

  insert into finance_accounts (set_id, name, kind, is_primary, created_by)
  values (v_set, 'Main account', 'bank', true, auth.uid());

  insert into finance_categories (set_id, direction, name, is_system, sort_order) values
    (v_set,'income','Dues',true,1), (v_set,'income','Donations',true,2),
    (v_set,'income','Levies',true,3), (v_set,'income','Events',true,4),
    (v_set,'income','Other income',true,9),
    (v_set,'expense','Welfare',true,1), (v_set,'expense','Events',true,2),
    (v_set,'expense','Projects',true,3), (v_set,'expense','Administration',true,4),
    (v_set,'expense','Transport',true,5), (v_set,'expense','Bank charges',true,6),
    (v_set,'expense','Other expenses',true,9)
  on conflict do nothing;

  -- Mirror the institution's department catalogue into this set.
  if v_departments then
    insert into set_departments (set_id, institution_department_id, faculty_id, name, slug,
                                 short_name, color, created_by)
    select v_set, d.id, d.faculty_id, d.name,
           app.slugify(coalesce(d.short_name, d.name)), d.short_name,
           coalesce(d.color, '#0898A0'), auth.uid()
      from institution_departments d
     where d.institution_id = p_institution_id
    on conflict do nothing;
  end if;

  perform log_audit(v_set, 'set.created', 'set', v_set, v_name, 'Set created');
  return v_set;
end $$;

-- ---------------------------------------------------------------------------
-- Join a set directly (subject to its join policy).
-- ---------------------------------------------------------------------------
create or replace function join_set(
  p_set_id uuid,
  p_department_id uuid default null,
  p_profile jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public, app as $$
declare
  s sets;
  v_membership uuid;
  v_status membership_status;
  v_member_role uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into s from sets where id = p_set_id;
  if not found then raise exception 'set not found'; end if;
  if s.join_policy = 'closed' then raise exception 'this set is not accepting new members'; end if;

  v_status := (case when s.join_policy = 'open' then 'active' else 'pending' end)::membership_status;

  insert into set_memberships (
    set_id, user_id, status, nickname, student_id, class_arm, course,
    admission_year, graduation_year, department_id, house_id, hostel_id,
    was_prefect, prefect_position, school_name_used
  ) values (
    p_set_id, auth.uid(), v_status,
    nullif(p_profile->>'nickname',''), nullif(p_profile->>'student_id',''),
    nullif(p_profile->>'class_arm',''), nullif(p_profile->>'course',''),
    nullif(p_profile->>'admission_year','')::int,
    coalesce(nullif(p_profile->>'graduation_year','')::int, s.graduation_year),
    p_department_id,
    nullif(p_profile->>'house_id','')::uuid, nullif(p_profile->>'hostel_id','')::uuid,
    coalesce((p_profile->>'was_prefect')::boolean, false),
    nullif(p_profile->>'prefect_position',''), nullif(p_profile->>'school_name_used','')
  )
  on conflict (set_id, user_id) do update
    set status = case when set_memberships.status in ('left','removed','rejected')
                      then excluded.status else set_memberships.status end
  returning id into v_membership;

  if v_status = 'active' then
    select id into v_member_role from set_roles
     where set_id = p_set_id and department_id is null and key = 'member';
    if v_member_role is not null then
      insert into member_roles (membership_id, role_id, status)
      values (v_membership, v_member_role, 'accepted') on conflict do nothing;
    end if;

    -- Auto-join the default channels.
    insert into channel_members (channel_id, membership_id)
    select c.id, v_membership from channels c
     where c.set_id = p_set_id and c.department_id is null
       and c.visibility = 'public' and c.archived_at is null
    on conflict do nothing;

    if p_department_id is not null then
      perform join_department(p_department_id, true);
    end if;

    insert into activity_feed (set_id, actor_id, verb, object_type, object_id, object_label, icon)
    values (p_set_id, auth.uid(), 'joined the set', 'membership', v_membership, null, 'user-plus');
  end if;

  return v_membership;
end $$;

-- ---------------------------------------------------------------------------
-- Join a department sub-community.
-- ---------------------------------------------------------------------------
create or replace function join_department(p_department_id uuid, p_primary boolean default false)
returns uuid language plpgsql security definer set search_path = public, app as $$
declare
  d set_departments;
  v_membership uuid;
  v_dm uuid;
  v_role uuid;
begin
  select * into d from set_departments where id = p_department_id;
  if not found then raise exception 'department not found'; end if;

  v_membership := app.membership_id(d.set_id);
  if v_membership is null then raise exception 'join the set before joining a department'; end if;
  if d.join_policy = 'closed' then raise exception 'this department is not accepting members'; end if;

  insert into department_memberships (department_id, membership_id, status, is_primary)
  values (p_department_id, v_membership,
          -- CASE arms are text until cast; the column is an enum.
          (case when d.join_policy = 'open' then 'active' else 'pending' end)::membership_status,
          p_primary)
  on conflict (department_id, membership_id) do update set is_primary = excluded.is_primary
  returning id into v_dm;

  select id into v_role from set_roles
   where set_id = d.set_id and department_id = p_department_id and key = 'dept_member';
  if v_role is not null then
    insert into member_roles (membership_id, role_id, status)
    values (v_membership, v_role, 'accepted') on conflict do nothing;
  end if;

  insert into channel_members (channel_id, membership_id)
  select c.id, v_membership from channels c
   where c.department_id = p_department_id and c.archived_at is null
  on conflict do nothing;

  return v_dm;
end $$;

-- ---------------------------------------------------------------------------
-- INVITE LINKS
-- ---------------------------------------------------------------------------
-- NOTE: pgcrypto (gen_random_bytes) lives in the `extensions` schema on Supabase,
-- so every SECURITY DEFINER function that pins search_path must include it.
create or replace function create_invite(
  p_set_id uuid,
  p_scope invite_scope default 'set',
  p_department_id uuid default null,
  p_group_id uuid default null,
  p_channel_id uuid default null,
  p_label text default null,
  p_email text default null,
  p_max_uses int default null,
  p_expires_in_days int default 30,
  p_auto_approve boolean default true,
  p_role_id uuid default null
) returns invites language plpgsql security definer set search_path = public, app, extensions as $$
declare
  v invites;
  v_allowed boolean;
  v_code text;
  v_prefix text;
begin
  v_allowed :=
    app.has_perm(p_set_id, 'members.invite', p_department_id)
    or (p_department_id is not null and app.is_department_admin(p_department_id))
    or app.is_set_owner(p_set_id);

  if not v_allowed then raise exception 'you do not have permission to invite to this community'; end if;

  select upper(left(regexp_replace(coalesce(i.short_name, i.name), '[^A-Za-z]', '', 'g'), 5))
         || s.graduation_year
    into v_prefix
    from sets s join institutions i on i.id = s.institution_id
   where s.id = p_set_id;

  v_code := coalesce(v_prefix,'SETHUB') || '-' || upper(substr(encode(gen_random_bytes(4),'hex'), 1, 5));

  insert into invites (scope, set_id, department_id, group_id, channel_id, code, label, email,
                       max_uses, expires_at, auto_approve, grant_role_id, created_by)
  values (p_scope, p_set_id, p_department_id, p_group_id, p_channel_id, v_code, p_label,
          nullif(p_email,''), p_max_uses,
          case when p_expires_in_days is null then null else now() + (p_expires_in_days || ' days')::interval end,
          p_auto_approve, p_role_id, auth.uid())
  returning * into v;

  perform log_audit(p_set_id, 'invite.created', 'invite', v.id, v.code,
                    'Invite link created', p_department_id);
  return v;
end $$;

-- Public-ish preview so an invite landing page can render before sign-in.
create or replace function preview_invite(p_token text)
returns table (
  invite_id uuid, scope invite_scope, set_id uuid, set_name text, institution_name text,
  institution_logo text, graduation_year int, department_id uuid, department_name text,
  member_count int, is_valid boolean, reason text
) language sql security definer set search_path = public, app as $$
  select
    i.id, i.scope, s.id, s.name, inst.name, inst.logo_url, s.graduation_year,
    d.id, d.name, s.member_count,
    (i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
      and (i.max_uses is null or i.use_count < i.max_uses)) as is_valid,
    case
      when i.revoked_at is not null then 'This invite has been revoked.'
      when i.expires_at is not null and i.expires_at <= now() then 'This invite has expired.'
      when i.max_uses is not null and i.use_count >= i.max_uses then 'This invite has been fully used.'
      else null
    end
  from invites i
  join sets s on s.id = i.set_id
  join institutions inst on inst.id = s.institution_id
  left join set_departments d on d.id = i.department_id
  where i.token = p_token or i.code = upper(p_token);
$$;

create or replace function redeem_invite(p_token text, p_profile jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, app, extensions as $$
declare
  i invites;
  v_membership uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into i from invites
   where (token = p_token or code = upper(p_token)) for update;
  if not found then raise exception 'invite not found'; end if;
  if i.revoked_at is not null then raise exception 'this invite has been revoked'; end if;
  if i.expires_at is not null and i.expires_at <= now() then raise exception 'this invite has expired'; end if;
  if i.max_uses is not null and i.use_count >= i.max_uses then raise exception 'this invite has been fully used'; end if;

  v_membership := app.membership_id(i.set_id);

  if v_membership is null then
    insert into set_memberships (set_id, user_id, status, invited_by, invite_id,
                                 approved_at, nickname, student_id, course, class_arm)
    values (i.set_id, auth.uid(),
            (case when i.auto_approve then 'active' else 'pending' end)::membership_status,
            i.created_by, i.id,
            case when i.auto_approve then now() else null end,
            nullif(p_profile->>'nickname',''), nullif(p_profile->>'student_id',''),
            nullif(p_profile->>'course',''), nullif(p_profile->>'class_arm',''))
    on conflict (set_id, user_id) do update set status = 'active'::membership_status
    returning id into v_membership;

    -- Baseline role so permission checks resolve for the new member.
    insert into member_roles (membership_id, role_id, status, assigned_by)
    select v_membership, r.id, 'accepted', i.created_by
      from set_roles r
     where r.set_id = i.set_id and r.department_id is null and r.key = 'member'
    on conflict do nothing;

    insert into channel_members (channel_id, membership_id)
    select c.id, v_membership from channels c
     where c.set_id = i.set_id and c.department_id is null
       and c.visibility = 'public' and c.archived_at is null
    on conflict do nothing;
  end if;

  if i.grant_role_id is not null then
    insert into member_roles (membership_id, role_id, status, assigned_by)
    values (v_membership, i.grant_role_id, 'accepted', i.created_by) on conflict do nothing;
  end if;

  if i.scope = 'department' and i.department_id is not null then
    perform join_department(i.department_id, true);
  elsif i.scope = 'group' and i.group_id is not null then
    insert into group_members (group_id, membership_id, status, invited_by)
    values (i.group_id, v_membership, 'active', i.created_by) on conflict do nothing;
  elsif i.scope = 'channel' and i.channel_id is not null then
    insert into channel_members (channel_id, membership_id)
    values (i.channel_id, v_membership) on conflict do nothing;
  end if;

  update invites set use_count = use_count + 1 where id = i.id;
  insert into invite_redemptions (invite_id, user_id) values (i.id, auth.uid())
  on conflict do nothing;

  return jsonb_build_object(
    'set_id', i.set_id, 'membership_id', v_membership,
    'department_id', i.department_id, 'scope', i.scope);
end $$;

-- ---------------------------------------------------------------------------
-- Workspace switcher payload
-- ---------------------------------------------------------------------------
create or replace function my_communities()
returns table (
  membership_id uuid, set_id uuid, set_name text, set_slug text, graduation_year int,
  institution_id uuid, institution_name text, institution_short text,
  institution_type institution_type, logo_url text, member_count int,
  status membership_status, is_owner boolean, departments_enabled boolean,
  department_id uuid, department_name text, unread_count int, outstanding numeric
) language sql stable security definer set search_path = public, app as $$
  select
    m.id, s.id, s.name, s.slug, s.graduation_year,
    i.id, i.name, coalesce(i.short_name, i.name), i.type,
    coalesce(s.logo_url, i.logo_url), s.member_count,
    m.status, (s.owner_id = auth.uid()), s.departments_enabled,
    d.id, d.name,
    (select count(*)::int from messages ms
       join channels c on c.id = ms.channel_id
       join channel_members cm on cm.channel_id = c.id and cm.membership_id = m.id
      where c.set_id = s.id
        and ms.created_at > coalesce(cm.last_read_at, m.joined_at)
        and ms.author_id <> auth.uid()),
    coalesce((select sum(a.balance) from dues_assignments a
               where a.membership_id = m.id and a.balance > 0), 0)
  from set_memberships m
  join sets s on s.id = m.set_id
  join institutions i on i.id = s.institution_id
  left join set_departments d on d.id = m.department_id
  where m.user_id = auth.uid() and m.status in ('active','pending')
  order by m.last_active_at desc nulls last, s.graduation_year desc;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard summary for one set (optionally narrowed to a department)
-- ---------------------------------------------------------------------------
create or replace function set_dashboard(p_set_id uuid, p_department_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public, app as $$
declare
  v_membership uuid;
  v jsonb;
begin
  v_membership := app.membership_id(p_set_id);
  if v_membership is null then raise exception 'not a member of this set'; end if;

  select jsonb_build_object(
    'member_count', (select count(*) from set_memberships where set_id = p_set_id and status = 'active'),
    'pending_members', (select count(*) from set_memberships where set_id = p_set_id and status = 'pending'),
    'new_members_30d', (select count(*) from set_memberships
                         where set_id = p_set_id and status = 'active' and joined_at > now() - interval '30 days'),
    'department_count', (select count(*) from set_departments where set_id = p_set_id and archived_at is null),
    'my_outstanding', coalesce((select sum(balance) from dues_assignments
                                 where membership_id = v_membership and balance > 0), 0),
    'balance', coalesce((select balance from set_finance_summary where set_id = p_set_id), 0),
    'total_income', coalesce((select total_income from set_finance_summary where set_id = p_set_id), 0),
    'total_expense', coalesce((select total_expense from set_finance_summary where set_id = p_set_id), 0),
    'outstanding_total', coalesce((select sum(balance) from dues_assignments a
                                    join set_memberships m on m.id = a.membership_id
                                   where m.set_id = p_set_id and a.balance > 0), 0),
    'collection_rate', coalesce((
        select case when sum(expected_total) > 0
                    then round(sum(collected_total) / sum(expected_total) * 100, 1) else 0 end
          from dues where set_id = p_set_id), 0),
    'upcoming_events', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select e.id, e.title, e.starts_at, e.location_name, e.category, e.going_count
          from events e
         where e.set_id = p_set_id and e.starts_at > now()
           and (p_department_id is null or e.department_id is null or e.department_id = p_department_id)
         order by e.starts_at limit 5) x),
    'calendar', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select c.source_type, c.source_id, c.title, c.subtitle, c.starts_at, c.color, c.icon, c.href
          from calendar_entries c
         where c.set_id = p_set_id and c.starts_at > now() - interval '1 day'
         order by c.starts_at limit 8) x),
    'announcements', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select a.id, a.title, a.summary, a.priority, a.publish_at, a.is_pinned
          from announcements a
         where a.set_id = p_set_id and a.publish_at <= now()
           and (a.department_id is null or a.department_id = p_department_id)
         order by a.is_pinned desc, a.publish_at desc limit 5) x),
    'active_elections', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select e.id, e.title, e.stage, e.voting_opens_at, e.voting_closes_at,
               exists (select 1 from election_ballots b
                        where b.election_id = e.id and b.membership_id = v_membership) as has_voted
          from elections e
         where e.set_id = p_set_id and e.stage in ('nominations','campaign','voting')
         order by e.voting_opens_at limit 3) x),
    'open_polls', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select p.id, p.question, p.closes_at, p.vote_count,
               exists (select 1 from poll_votes pv
                        where pv.poll_id = p.id and pv.membership_id = v_membership) as has_voted
          from polls p
         where p.set_id = p_set_id and p.status = 'open'
           and (p.closes_at is null or p.closes_at > now())
         order by p.created_at desc limit 3) x),
    'projects', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select p.id, p.title, p.status, p.estimated_cost, p.raised_amount, p.currency,
               case when p.estimated_cost > 0
                    then round(p.raised_amount / p.estimated_cost * 100, 1) else 0 end as funded_pct
          from projects p
          join project_sets ps on ps.project_id = p.id
         where ps.set_id = p_set_id and p.status in ('approved','fundraising','in_progress')
         order by p.created_at desc limit 4) x),
    'activity', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select af.verb, af.object_label, af.href, af.icon, af.created_at,
               pr.display_name as actor, pr.avatar_url
          from activity_feed af
          left join profiles pr on pr.id = af.actor_id
         where af.set_id = p_set_id
         order by af.created_at desc limit 8) x),
    'unread_messages', (select count(*)::int from messages ms
        join channels c on c.id = ms.channel_id
        join channel_members cm on cm.channel_id = c.id and cm.membership_id = v_membership
       where c.set_id = p_set_id and ms.created_at > coalesce(cm.last_read_at, now() - interval '30 days')
         and ms.author_id <> auth.uid())
  ) into v;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Assign a dues obligation to every eligible member in one call.
-- ---------------------------------------------------------------------------
create or replace function assign_dues(p_dues_id uuid)
returns int language plpgsql security definer set search_path = public, app as $$
declare d dues; n int;
begin
  select * into d from dues where id = p_dues_id;
  if not found then raise exception 'dues not found'; end if;
  if not app.has_perm(d.set_id, 'finance.dues_manage', d.department_id) then
    raise exception 'you do not have permission to assign dues';
  end if;

  insert into dues_assignments (dues_id, membership_id, amount_due, due_date)
  select d.id, m.id, d.amount, d.due_date
    from set_memberships m
   where m.set_id = d.set_id and m.status = 'active'
     and (d.applies_to <> 'department' or exists (
           select 1 from department_memberships dm
            where dm.membership_id = m.id and dm.department_id = d.department_id and dm.status = 'active'))
     and (d.applies_to <> 'group' or exists (
           select 1 from group_members gm
            where gm.membership_id = m.id and gm.group_id = d.applies_group_id and gm.status = 'active'))
  on conflict (dues_id, membership_id) do nothing;

  get diagnostics n = row_count;
  perform log_audit(d.set_id, 'finance.dues_assigned', 'dues', d.id, d.title,
                    n || ' members assigned', d.department_id);
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Financial export payload. The app renders CSV/PDF/XLSX from this.
-- ---------------------------------------------------------------------------
create or replace function finance_export_data(
  p_set_id uuid, p_scope text, p_from date default null, p_to date default null,
  p_department_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = public, app as $$
declare v jsonb;
begin
  if not app.has_perm(p_set_id, 'finance.export', p_department_id) then
    raise exception 'you do not have permission to export financial data';
  end if;

  if p_scope = 'ledger' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v from (
      select le.occurred_on, le.direction, le.amount, le.currency, le.description,
             fc.name as category, fa.name as account, le.source_type,
             sd.name as department
        from ledger_entries le
        left join finance_categories fc on fc.id = le.category_id
        left join finance_accounts fa on fa.id = le.account_id
        left join set_departments sd on sd.id = le.department_id
       where le.set_id = p_set_id
         and (p_department_id is null or le.department_id = p_department_id)
         and (p_from is null or le.occurred_on >= p_from)
         and (p_to is null or le.occurred_on <= p_to)
       order by le.occurred_on desc) x;

  elsif p_scope = 'payments' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v from (
      select p.paid_at::date as date, pr.display_name as member, p.amount, p.currency,
             p.method, p.status, p.reference, d.title as dues, p.note
        from payments p
        left join set_memberships m on m.id = p.membership_id
        left join profiles pr on pr.id = m.user_id
        left join dues d on d.id = p.dues_id
       where p.set_id = p_set_id
         and (p_department_id is null or p.department_id = p_department_id)
         and (p_from is null or p.paid_at::date >= p_from)
         and (p_to is null or p.paid_at::date <= p_to)
       order by p.paid_at desc) x;

  elsif p_scope = 'dues' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v from (
      select d.title, d.period_label, d.due_date, pr.display_name as member,
             a.amount_due, a.amount_paid, a.balance, a.status
        from dues_assignments a
        join dues d on d.id = a.dues_id
        join set_memberships m on m.id = a.membership_id
        join profiles pr on pr.id = m.user_id
       where d.set_id = p_set_id
         and (p_department_id is null or d.department_id = p_department_id)
       order by d.due_date desc, pr.display_name) x;

  elsif p_scope = 'expenses' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v from (
      select e.spent_on, e.title, e.amount, e.currency, e.vendor, e.status,
             fc.name as category, pr.display_name as recorded_by
        from expenses e
        left join finance_categories fc on fc.id = e.category_id
        left join profiles pr on pr.id = e.recorded_by
       where e.set_id = p_set_id
         and (p_department_id is null or e.department_id = p_department_id)
         and (p_from is null or e.spent_on >= p_from)
         and (p_to is null or e.spent_on <= p_to)
       order by e.spent_on desc) x;

  elsif p_scope = 'donations' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v from (
      select p.paid_at::date as date, c.title as campaign,
             case when p.is_anonymous then 'Anonymous' else coalesce(pr.display_name, p.payer_name) end as donor,
             p.amount, p.currency, p.status
        from payments p
        join donation_campaigns c on c.id = p.campaign_id
        left join set_memberships m on m.id = p.membership_id
        left join profiles pr on pr.id = m.user_id
       where p.set_id = p_set_id
         and (p_from is null or p.paid_at::date >= p_from)
         and (p_to is null or p.paid_at::date <= p_to)
       order by p.paid_at desc) x;

  elsif p_scope = 'members' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v from (
      select pr.display_name as name, pr.email, m.nickname, m.course, m.class_arm,
             sd.name as department, m.status, m.joined_at::date as joined,
             coalesce((select sum(a.balance) from dues_assignments a
                        where a.membership_id = m.id and a.balance > 0),0) as outstanding
        from set_memberships m
        join profiles pr on pr.id = m.user_id
        left join set_departments sd on sd.id = m.department_id
       where m.set_id = p_set_id
         and (p_department_id is null or m.department_id = p_department_id)
       order by pr.display_name) x;

  elsif p_scope = 'full_report' then
    select jsonb_build_object(
      'summary', (select to_jsonb(f) from set_finance_summary f where f.set_id = p_set_id),
      'monthly', (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from monthly_cashflow m
                   where m.set_id = p_set_id),
      'by_category', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from (
          select coalesce(fc.name,'Uncategorised') as category, le.direction, sum(le.amount) as total
            from ledger_entries le
            left join finance_categories fc on fc.id = le.category_id
           where le.set_id = p_set_id group by 1,2 order by 3 desc) c),
      'dues', (select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) from (
          select title, period_label, expected_total, collected_total, assigned_count, paid_count
            from dues where set_id = p_set_id order by due_date desc) d)
    ) into v;
  else
    raise exception 'unknown export scope: %', p_scope;
  end if;

  return coalesce(v, '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- Cross-scope search, permission-aware by construction (every subquery runs
-- through RLS because the function is INVOKER, not DEFINER).
-- ---------------------------------------------------------------------------
create or replace function search_set(p_set_id uuid, p_query text, p_limit int default 8)
returns jsonb language sql stable set search_path = public, app as $$
  select jsonb_build_object(
    'members', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select m.id, pr.display_name, pr.avatar_url, m.nickname, m.course, d.name as department
          from set_memberships m join profiles pr on pr.id = m.user_id
          left join set_departments d on d.id = m.department_id
         where m.set_id = p_set_id and m.status = 'active'
           and (pr.display_name ilike '%'||p_query||'%' or m.nickname ilike '%'||p_query||'%')
         limit p_limit) x),
    'channels', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select c.id, c.name, c.topic, c.department_id from channels c
         where c.set_id = p_set_id and c.archived_at is null and c.name ilike '%'||p_query||'%'
         limit p_limit) x),
    'messages', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select ms.id, ms.body, ms.created_at, c.name as channel, pr.display_name as author
          from messages ms join channels c on c.id = ms.channel_id
          left join profiles pr on pr.id = ms.author_id
         where c.set_id = p_set_id and ms.deleted_at is null and ms.body ilike '%'||p_query||'%'
         order by ms.created_at desc limit p_limit) x),
    'events', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select e.id, e.title, e.starts_at from events e
         where e.set_id = p_set_id and e.title ilike '%'||p_query||'%'
         order by e.starts_at desc limit p_limit) x),
    'documents', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select d.id, d.title, d.category, d.file_name from documents d
         where d.set_id = p_set_id and d.title ilike '%'||p_query||'%' limit p_limit) x),
    'announcements', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select a.id, a.title, a.publish_at from announcements a
         where a.set_id = p_set_id and a.title ilike '%'||p_query||'%'
         order by a.publish_at desc limit p_limit) x),
    'businesses', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select b.id, b.name, b.category, b.logo_url from businesses b
         join set_memberships m on m.user_id = b.owner_id
        where m.set_id = p_set_id and m.status = 'active' and b.is_published
          and b.name ilike '%'||p_query||'%' limit p_limit) x),
    'projects', (select coalesce(jsonb_agg(x),'[]'::jsonb) from (
        select p.id, p.title, p.status from projects p
         join project_sets ps on ps.project_id = p.id
        where ps.set_id = p_set_id and p.title ilike '%'||p_query||'%' limit p_limit) x)
  );
$$;

grant execute on function create_set(uuid,int,text,text,text,boolean) to authenticated;
grant execute on function join_set(uuid,uuid,jsonb) to authenticated;
grant execute on function join_department(uuid,boolean) to authenticated;
grant execute on function create_invite(uuid,invite_scope,uuid,uuid,uuid,text,text,int,int,boolean,uuid) to authenticated;
grant execute on function preview_invite(text) to authenticated, anon;
grant execute on function redeem_invite(text,jsonb) to authenticated;
grant execute on function my_communities() to authenticated;
grant execute on function set_dashboard(uuid,uuid) to authenticated;
grant execute on function assign_dues(uuid) to authenticated;
grant execute on function finance_export_data(uuid,text,date,date,uuid) to authenticated;
grant execute on function search_set(uuid,text,int) to authenticated;
grant execute on function cast_election_ballot(uuid,jsonb) to authenticated;
grant execute on function log_audit(uuid,text,text,uuid,text,text,uuid,jsonb,jsonb) to authenticated;
grant execute on function approve_school_recommendation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Convenience wrappers the application calls on every set-scoped page load.
-- ---------------------------------------------------------------------------
create or replace function effective_permissions(p_set uuid, p_department uuid default null)
returns text[] language sql stable security definer set search_path = public, app as $$
  select case when app.is_set_member(p_set)
              then app.permissions_for(p_set, p_department)
              else '{}'::text[] end;
$$;

create or replace function my_department_roles(p_set uuid)
returns table (department_id uuid, role text, is_primary boolean)
language sql stable security definer set search_path = public, app as $$
  select dm.department_id, dm.role, dm.is_primary
    from department_memberships dm
    join set_memberships m on m.id = dm.membership_id
   where m.set_id = p_set and m.user_id = auth.uid()
     and m.status = 'active' and dm.status = 'active';
$$;

grant execute on function effective_permissions(uuid, uuid) to authenticated;
grant execute on function my_department_roles(uuid) to authenticated;

-- pgcrypto is namespaced to `extensions` on Supabase.
alter function cast_election_ballot(uuid,jsonb) set search_path = public, app, extensions;
alter function approve_school_recommendation(uuid) set search_path = public, app, extensions;
