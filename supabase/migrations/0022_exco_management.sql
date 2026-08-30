-- ============================================================================
-- SetHub — 0022 EXCO MANAGEMENT
--
-- Lets admins with exco.manage_terms create/switch the current term, admins
-- with exco.assign add positions and appoint members, and — the piece that
-- was missing — appoint someone who hasn't joined the platform yet. That
-- last case needed exco_appointments.membership_id to become optional (a
-- pending appointment is tied to an invite instead) and redeem_invite to
-- backfill the appointment once the invite is redeemed.
-- ============================================================================

alter table exco_appointments
  alter column membership_id drop not null,
  add column if not exists invite_id uuid references invites(id) on delete set null;

alter table exco_appointments
  drop constraint if exists exco_appointments_member_or_invite;
alter table exco_appointments
  add constraint exco_appointments_member_or_invite
  check (membership_id is not null or invite_id is not null);

-- ---------------------------------------------------------------------------
-- Backfill a pending EXCO appointment when the linked invite is redeemed.
-- ---------------------------------------------------------------------------
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

  -- A pending EXCO appointment created via invite_to_exco() carries the
  -- invite's id but no member yet; fill it in now that one exists.
  update exco_appointments
     set membership_id = v_membership, status = 'accepted', responded_at = now()
   where invite_id = i.id and membership_id is null;

  update invites set use_count = use_count + 1 where id = i.id;
  insert into invite_redemptions (invite_id, user_id) values (i.id, auth.uid())
  on conflict do nothing;

  return jsonb_build_object(
    'set_id', i.set_id, 'membership_id', v_membership,
    'department_id', i.department_id, 'scope', i.scope);
end $$;

-- ---------------------------------------------------------------------------
-- Atomically switch which term is "current" (a partial unique index enforces
-- at most one current term per set, so unset-then-set has to happen together).
-- ---------------------------------------------------------------------------
create or replace function set_current_exco_term(p_term_id uuid)
returns void language plpgsql security definer set search_path = public, app as $$
declare
  v_set_id uuid;
begin
  select set_id into v_set_id from exco_terms where id = p_term_id;
  if v_set_id is null then raise exception 'term not found'; end if;
  if not app.has_perm(v_set_id, 'exco.manage_terms') then
    raise exception 'you do not have permission to manage EXCO terms';
  end if;
  update exco_terms set is_current = false where set_id = v_set_id and is_current and id <> p_term_id;
  update exco_terms set is_current = true where id = p_term_id;
end $$;

grant execute on function set_current_exco_term(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Appoint someone to an EXCO position who isn't a member yet: creates a
-- single-use invite (auto-granting the position's default role on redemption)
-- and a pending exco_appointments row that redeem_invite() completes above.
-- ---------------------------------------------------------------------------
create or replace function invite_to_exco(
  p_term_id uuid,
  p_position_id uuid,
  p_email text,
  p_label text default null
) returns jsonb language plpgsql security definer set search_path = public, app, extensions as $$
declare
  v_set_id uuid;
  v_role_id uuid;
  v_code text;
  v_prefix text;
  v_invite invites;
  v_appt_id uuid;
begin
  select set_id into v_set_id from exco_terms where id = p_term_id;
  if v_set_id is null then raise exception 'term not found'; end if;

  if not app.has_perm(v_set_id, 'exco.assign') then
    raise exception 'you do not have permission to assign EXCO positions';
  end if;

  if p_email is null or btrim(p_email) = '' then
    raise exception 'an email address is required to invite someone new';
  end if;

  select default_role_id into v_role_id
    from exco_positions
   where id = p_position_id and (set_id = v_set_id or set_id is null);
  if not found then raise exception 'position not found'; end if;

  select upper(left(regexp_replace(coalesce(i.short_name, i.name), '[^A-Za-z]', '', 'g'), 5))
         || s.graduation_year
    into v_prefix
    from sets s join institutions i on i.id = s.institution_id
   where s.id = v_set_id;

  v_code := coalesce(v_prefix,'SETHUB') || '-' || upper(substr(encode(gen_random_bytes(4),'hex'), 1, 5));

  insert into invites (scope, set_id, code, label, email, max_uses, expires_at,
                       auto_approve, grant_role_id, created_by)
  values ('set', v_set_id, v_code, coalesce(nullif(btrim(p_label), ''), 'EXCO appointment'),
          btrim(p_email), 1, now() + interval '30 days', true, v_role_id, auth.uid())
  returning * into v_invite;

  insert into exco_appointments (term_id, position_id, membership_id, status, invite_id, invited_by)
  values (p_term_id, p_position_id, null, 'invited', v_invite.id, auth.uid())
  returning id into v_appt_id;

  perform log_audit(v_set_id, 'exco.invited', 'exco_appointment', v_appt_id,
                    v_invite.email, 'Invited a new member to an EXCO position');

  return jsonb_build_object(
    'invite_id', v_invite.id, 'appointment_id', v_appt_id,
    'token', v_invite.token, 'code', v_invite.code);
end $$;

grant execute on function invite_to_exco(uuid, uuid, text, text) to authenticated;
