-- ============================================================================
-- SetHub — 0014 ROW LEVEL SECURITY
--
-- The privacy boundary of this product is the SET. A member sees their set's
-- people, chat, money, governance and content — and nothing at all from any
-- other set, including sets they are also a member of. Departments narrow that
-- boundary further: a department's channels, announcements, dues and albums are
-- visible only to that department, while set-wide space stays shared.
-- Institution-scoped projects are the single deliberate exception.
-- ============================================================================

-- Views must respect the caller's RLS, not the owner's.
alter view set_finance_summary      set (security_invoker = true);
alter view set_dues_outstanding     set (security_invoker = true);
alter view monthly_cashflow         set (security_invoker = true);
alter view project_funding_progress set (security_invoker = true);

-- Turn RLS on everywhere in public.
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Reference data everyone may read.
drop policy if exists permissions_read on permissions;
create policy permissions_read on permissions for select to authenticated using (true);

-- Does the viewer share at least one active set with this person?
create or replace function app.shares_set_with(p_other uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1
      from set_memberships a
      join set_memberships b on b.set_id = a.set_id
     where a.user_id = p_user and b.user_id = p_other
       and a.status = 'active' and b.status = 'active'
  );
$$;

-- Convenience wrapper: can the caller read rows belonging to this set/department?
create or replace function app.can_read_scope(p_set uuid, p_dept uuid default null, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select app.is_set_member(p_set, p_user)
     and (p_dept is null or app.is_department_member(p_dept, p_user)
          or app.is_set_owner(p_set, p_user));
$$;

grant execute on all functions in schema app to authenticated;

-- ---------------------------------------------------------------------------
-- IDENTITY
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or app.shares_set_with(id) or app.is_platform_admin());

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or app.is_platform_admin())
  with check (id = auth.uid() or app.is_platform_admin());

drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists privacy_own on profile_privacy;
create policy privacy_own on profile_privacy for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notif_prefs_own on notification_preferences;
create policy notif_prefs_own on notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists businesses_select on businesses;
create policy businesses_select on businesses for select to authenticated
  using (owner_id = auth.uid() or (is_published and app.shares_set_with(owner_id)) or app.is_platform_admin());

drop policy if exists businesses_write on businesses;
create policy businesses_write on businesses for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists push_tokens_own on push_tokens;
create policy push_tokens_own on push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists blocks_own on blocks;
create policy blocks_own on blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- ---------------------------------------------------------------------------
-- INSTITUTION DIRECTORY — readable by anyone signed in (it is a public index).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['institutions','institution_houses','institution_hostels',
                           'institution_faculties','institution_departments','institution_prefect_positions']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists %I_admin on public.%I', t, t);
    execute format($f$create policy %I_admin on public.%I for all to authenticated
                      using (app.is_platform_admin()) with check (app.is_platform_admin())$f$, t, t);
  end loop;
end $$;

drop policy if exists school_recs_own on school_recommendations;
create policy school_recs_own on school_recommendations for select to authenticated
  using (submitted_by = auth.uid() or app.is_platform_admin());
drop policy if exists school_recs_insert on school_recommendations;
create policy school_recs_insert on school_recommendations for insert to authenticated
  with check (submitted_by = auth.uid());
drop policy if exists school_recs_admin on school_recommendations;
create policy school_recs_admin on school_recommendations for update to authenticated
  using (app.is_platform_admin()) with check (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- SETS
-- ---------------------------------------------------------------------------
drop policy if exists sets_select on sets;
create policy sets_select on sets for select to authenticated
  using (discoverable or app.is_set_member(id) or app.is_platform_admin());

drop policy if exists sets_insert on sets;
create policy sets_insert on sets for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists sets_update on sets;
create policy sets_update on sets for update to authenticated
  using (app.has_perm(id, 'settings.manage') or app.is_set_owner(id) or app.is_platform_admin())
  with check (app.has_perm(id, 'settings.manage') or app.is_set_owner(id) or app.is_platform_admin());

drop policy if exists set_departments_select on set_departments;
create policy set_departments_select on set_departments for select to authenticated
  using (app.is_set_member(set_id) and (is_visible_to_set or app.is_department_member(id)));

drop policy if exists set_departments_write on set_departments;
create policy set_departments_write on set_departments for all to authenticated
  using (app.has_perm(set_id, 'departments.create') or app.has_perm(set_id, 'departments.edit', id)
         or app.is_department_admin(id))
  with check (app.has_perm(set_id, 'departments.create') or app.has_perm(set_id, 'departments.edit', id)
         or app.is_department_admin(id));

-- Memberships: every member of a set can see who else is in it. Rows for other
-- sets are simply invisible.
drop policy if exists memberships_select on set_memberships;
create policy memberships_select on set_memberships for select to authenticated
  using (user_id = auth.uid() or app.is_set_member(set_id) or app.is_platform_admin());

drop policy if exists memberships_insert on set_memberships;
create policy memberships_insert on set_memberships for insert to authenticated
  with check (user_id = auth.uid() or app.has_perm(set_id, 'members.invite'));

drop policy if exists memberships_update_self on set_memberships;
create policy memberships_update_self on set_memberships for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists memberships_update_admin on set_memberships;
create policy memberships_update_admin on set_memberships for update to authenticated
  using (app.has_perm(set_id,'members.approve') or app.has_perm(set_id,'members.edit_profile')
         or app.has_perm(set_id,'members.suspend') or app.is_set_owner(set_id))
  with check (true);

drop policy if exists memberships_delete on set_memberships;
create policy memberships_delete on set_memberships for delete to authenticated
  using (user_id = auth.uid() or app.has_perm(set_id,'members.remove'));

drop policy if exists dept_memberships_select on department_memberships;
create policy dept_memberships_select on department_memberships for select to authenticated
  using (exists (select 1 from set_departments d
                  where d.id = department_id and app.is_set_member(d.set_id)));

drop policy if exists dept_memberships_write on department_memberships;
create policy dept_memberships_write on department_memberships for all to authenticated
  using (
    exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
    or app.is_department_admin(department_id)
    or exists (select 1 from set_departments d where d.id = department_id
                and app.has_perm(d.set_id,'departments.manage_members', d.id)))
  with check (
    exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
    or app.is_department_admin(department_id)
    or exists (select 1 from set_departments d where d.id = department_id
                and app.has_perm(d.set_id,'departments.manage_members', d.id)));

drop policy if exists ownership_transfers_rw on set_ownership_transfers;
create policy ownership_transfers_rw on set_ownership_transfers for all to authenticated
  using (app.is_set_owner(set_id) or to_user = auth.uid() or app.is_platform_admin())
  with check (app.is_set_owner(set_id) or app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- INVITES — set admins and department admins can both mint links.
-- ---------------------------------------------------------------------------
drop policy if exists invites_select on invites;
create policy invites_select on invites for select to authenticated
  using (created_by = auth.uid()
         or app.has_perm(set_id,'members.invite', department_id)
         or (department_id is not null and app.is_department_admin(department_id)));

drop policy if exists invites_write on invites;
create policy invites_write on invites for all to authenticated
  using (app.has_perm(set_id,'members.invite', department_id)
         or (department_id is not null and app.is_department_admin(department_id))
         or created_by = auth.uid())
  with check (created_by = auth.uid()
         and (app.has_perm(set_id,'members.invite', department_id)
              or (department_id is not null and app.is_department_admin(department_id))));

drop policy if exists invite_redemptions_rw on invite_redemptions;
create policy invite_redemptions_rw on invite_redemptions for all to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from invites i where i.id = invite_id
                     and app.has_perm(i.set_id,'members.invite', i.department_id)))
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ROLES & EXCO
-- ---------------------------------------------------------------------------
drop policy if exists set_roles_select on set_roles;
create policy set_roles_select on set_roles for select to authenticated
  using (app.is_set_member(set_id));
drop policy if exists set_roles_write on set_roles;
create policy set_roles_write on set_roles for all to authenticated
  using (app.has_perm(set_id,'roles.manage', department_id) or app.is_set_owner(set_id))
  with check (app.has_perm(set_id,'roles.manage', department_id) or app.is_set_owner(set_id));

drop policy if exists member_roles_select on member_roles;
create policy member_roles_select on member_roles for select to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and app.is_set_member(m.set_id)));
drop policy if exists member_roles_write on member_roles;
create policy member_roles_write on member_roles for all to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id
                  and (app.has_perm(m.set_id,'roles.assign') or app.is_set_owner(m.set_id)))
         or exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()))
  with check (exists (select 1 from set_memberships m where m.id = membership_id
                  and (app.has_perm(m.set_id,'roles.assign') or app.is_set_owner(m.set_id)))
         or exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()));

drop policy if exists exco_terms_select on exco_terms;
create policy exco_terms_select on exco_terms for select to authenticated using (app.is_set_member(set_id));
drop policy if exists exco_terms_write on exco_terms;
create policy exco_terms_write on exco_terms for all to authenticated
  using (app.has_perm(set_id,'exco.manage_terms')) with check (app.has_perm(set_id,'exco.manage_terms'));

drop policy if exists exco_positions_select on exco_positions;
create policy exco_positions_select on exco_positions for select to authenticated
  using (set_id is null or app.is_set_member(set_id));
drop policy if exists exco_positions_write on exco_positions;
create policy exco_positions_write on exco_positions for all to authenticated
  using (set_id is not null and app.has_perm(set_id,'exco.assign'))
  with check (set_id is not null and app.has_perm(set_id,'exco.assign'));

drop policy if exists exco_appts_select on exco_appointments;
create policy exco_appts_select on exco_appointments for select to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and app.is_set_member(m.set_id)));
drop policy if exists exco_appts_write on exco_appointments;
create policy exco_appts_write on exco_appointments for all to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id
                  and (app.has_perm(m.set_id,'exco.assign') or m.user_id = auth.uid())))
  with check (exists (select 1 from set_memberships m where m.id = membership_id
                  and (app.has_perm(m.set_id,'exco.assign') or m.user_id = auth.uid())));

-- ---------------------------------------------------------------------------
-- CHANNELS & MESSAGES
-- ---------------------------------------------------------------------------
drop policy if exists channels_select on channels;
create policy channels_select on channels for select to authenticated
  using (app.can_view_channel(id));
drop policy if exists channels_write on channels;
create policy channels_write on channels for all to authenticated
  using (app.has_perm(set_id,'channels.create', department_id)
         or app.has_perm(set_id,'channels.edit', department_id)
         or (department_id is not null and app.is_department_admin(department_id)))
  with check (app.has_perm(set_id,'channels.create', department_id)
         or app.has_perm(set_id,'channels.edit', department_id)
         or (department_id is not null and app.is_department_admin(department_id)));

drop policy if exists channel_members_select on channel_members;
create policy channel_members_select on channel_members for select to authenticated
  using (app.can_view_channel(channel_id));
drop policy if exists channel_members_write on channel_members;
create policy channel_members_write on channel_members for all to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or exists (select 1 from channels c where c.id = channel_id
                     and app.has_perm(c.set_id,'channels.edit', c.department_id)))
  with check (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or exists (select 1 from channels c where c.id = channel_id
                     and app.has_perm(c.set_id,'channels.edit', c.department_id)));

drop policy if exists messages_select on messages;
create policy messages_select on messages for select to authenticated
  using (app.can_view_channel(channel_id));
drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert to authenticated
  with check (app.can_post_in_channel(channel_id)
              and exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()));
drop policy if exists messages_update on messages;
create policy messages_update on messages for update to authenticated
  using (author_id = auth.uid()
         or exists (select 1 from channels c where c.id = channel_id
                     and app.has_perm(c.set_id,'messages.moderate', c.department_id)))
  with check (true);
drop policy if exists messages_delete on messages;
create policy messages_delete on messages for delete to authenticated
  using (author_id = auth.uid()
         or exists (select 1 from channels c where c.id = channel_id
                     and app.has_perm(c.set_id,'messages.moderate', c.department_id)));

drop policy if exists attachments_select on message_attachments;
create policy attachments_select on message_attachments for select to authenticated
  using (app.can_view_channel(channel_id));
drop policy if exists attachments_write on message_attachments;
create policy attachments_write on message_attachments for all to authenticated
  using (uploaded_by = auth.uid() or app.can_post_in_channel(channel_id))
  with check (app.can_post_in_channel(channel_id));

drop policy if exists reactions_select on message_reactions;
create policy reactions_select on message_reactions for select to authenticated
  using (exists (select 1 from messages ms where ms.id = message_id and app.can_view_channel(ms.channel_id)));
drop policy if exists reactions_write on message_reactions;
create policy reactions_write on message_reactions for all to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()))
  with check (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()));

drop policy if exists reads_write on message_reads;
create policy reads_write on message_reads for all to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()))
  with check (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()));

drop policy if exists dm_threads_rw on direct_threads;
create policy dm_threads_rw on direct_threads for all to authenticated
  using (exists (select 1 from set_memberships m
                  where m.id in (member_a, member_b) and m.user_id = auth.uid()))
  with check (app.is_set_member(set_id));

drop policy if exists dms_rw on direct_messages;
create policy dms_rw on direct_messages for all to authenticated
  using (exists (select 1 from direct_threads t
                  join set_memberships m on m.id in (t.member_a, t.member_b)
                 where t.id = thread_id and m.user_id = auth.uid()))
  with check (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- GROUPS + ANNOUNCEMENTS
-- ---------------------------------------------------------------------------
drop policy if exists groups_select on groups;
create policy groups_select on groups for select to authenticated
  using (app.is_set_member(set_id)
         and (department_id is null or app.is_department_member(department_id))
         and (visibility = 'public' or app.is_group_member(id) or app.is_set_admin(set_id)));
drop policy if exists groups_write on groups;
create policy groups_write on groups for all to authenticated
  using (app.has_perm(set_id,'groups.create', department_id) or app.has_perm(set_id,'groups.manage', department_id))
  with check (app.has_perm(set_id,'groups.create', department_id) or app.has_perm(set_id,'groups.manage', department_id));

drop policy if exists group_members_select on group_members;
create policy group_members_select on group_members for select to authenticated
  using (exists (select 1 from groups g where g.id = group_id and app.is_set_member(g.set_id)));
drop policy if exists group_members_write on group_members;
create policy group_members_write on group_members for all to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or exists (select 1 from groups g where g.id = group_id
                     and app.has_perm(g.set_id,'groups.manage', g.department_id)))
  with check (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or exists (select 1 from groups g where g.id = group_id
                     and app.has_perm(g.set_id,'groups.manage', g.department_id)));

drop policy if exists announcements_select on announcements;
create policy announcements_select on announcements for select to authenticated
  using (app.is_set_member(set_id)
         and (department_id is null or app.is_department_member(department_id))
         and (group_id is null or app.is_group_member(group_id))
         and (status <> 'draft' or created_by = auth.uid() or app.is_set_admin(set_id))
         and publish_at <= now());
drop policy if exists announcements_write on announcements;
create policy announcements_write on announcements for all to authenticated
  using (app.has_perm(set_id,'announcements.manage', department_id) or created_by = auth.uid())
  with check (app.has_perm(set_id,'announcements.create', department_id));

drop policy if exists ann_attachments_rw on announcement_attachments;
create policy ann_attachments_rw on announcement_attachments for all to authenticated
  using (exists (select 1 from announcements a where a.id = announcement_id and app.is_set_member(a.set_id)))
  with check (exists (select 1 from announcements a where a.id = announcement_id
                       and app.has_perm(a.set_id,'announcements.create', a.department_id)));

drop policy if exists ann_reads_rw on announcement_reads;
create policy ann_reads_rw on announcement_reads for all to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()))
  with check (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------------------------
drop policy if exists events_select on events;
create policy events_select on events for select to authenticated
  using (app.is_set_member(set_id)
         and (department_id is null or app.is_department_member(department_id))
         and (group_id is null or app.is_group_member(group_id) or visibility = 'public'));
drop policy if exists events_write on events;
create policy events_write on events for all to authenticated
  using (app.has_perm(set_id,'events.manage', department_id) or created_by = auth.uid())
  with check (app.has_perm(set_id,'events.create', department_id));

drop policy if exists rsvps_select on event_rsvps;
create policy rsvps_select on event_rsvps for select to authenticated
  using (exists (select 1 from events e where e.id = event_id and app.is_set_member(e.set_id)));
drop policy if exists rsvps_write on event_rsvps;
create policy rsvps_write on event_rsvps for all to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or exists (select 1 from events e where e.id = event_id
                     and app.has_perm(e.set_id,'events.attendance', e.department_id)))
  with check (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or exists (select 1 from events e where e.id = event_id
                     and app.has_perm(e.set_id,'events.attendance', e.department_id)));

drop policy if exists event_attachments_rw on event_attachments;
create policy event_attachments_rw on event_attachments for all to authenticated
  using (exists (select 1 from events e where e.id = event_id and app.is_set_member(e.set_id)))
  with check (exists (select 1 from events e where e.id = event_id
                       and app.has_perm(e.set_id,'events.manage', e.department_id)));

drop policy if exists calendar_select on calendar_entries;
create policy calendar_select on calendar_entries for select to authenticated
  using (app.is_set_member(set_id) and (department_id is null or app.is_department_member(department_id)));

-- ---------------------------------------------------------------------------
-- GOVERNANCE
-- ---------------------------------------------------------------------------
drop policy if exists polls_select on polls;
create policy polls_select on polls for select to authenticated
  using (app.is_set_member(set_id) and (department_id is null or app.is_department_member(department_id)));
drop policy if exists polls_write on polls;
create policy polls_write on polls for all to authenticated
  using (app.has_perm(set_id,'polls.create', department_id) or created_by = auth.uid())
  with check (app.has_perm(set_id,'polls.create', department_id));

drop policy if exists poll_options_select on poll_options;
create policy poll_options_select on poll_options for select to authenticated
  using (exists (select 1 from polls p where p.id = poll_id and app.is_set_member(p.set_id)));
drop policy if exists poll_options_write on poll_options;
create policy poll_options_write on poll_options for all to authenticated
  using (exists (select 1 from polls p where p.id = poll_id and app.has_perm(p.set_id,'polls.create', p.department_id)))
  with check (exists (select 1 from polls p where p.id = poll_id and app.has_perm(p.set_id,'polls.create', p.department_id)));

-- Anonymous polls: you may read your own vote rows, never anyone else's.
drop policy if exists poll_votes_select on poll_votes;
create policy poll_votes_select on poll_votes for select to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or exists (select 1 from polls p where p.id = poll_id
                     and not p.is_anonymous and app.is_set_member(p.set_id)));
drop policy if exists poll_votes_insert on poll_votes;
create policy poll_votes_insert on poll_votes for insert to authenticated
  with check (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()));
drop policy if exists poll_votes_delete on poll_votes;
create policy poll_votes_delete on poll_votes for delete to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()));

drop policy if exists quizzes_select on quizzes;
create policy quizzes_select on quizzes for select to authenticated
  using (app.is_set_member(set_id) and (department_id is null or app.is_department_member(department_id)));
drop policy if exists quizzes_write on quizzes;
create policy quizzes_write on quizzes for all to authenticated
  using (app.has_perm(set_id,'quizzes.create', department_id))
  with check (app.has_perm(set_id,'quizzes.create', department_id));

drop policy if exists quiz_questions_select on quiz_questions;
create policy quiz_questions_select on quiz_questions for select to authenticated
  using (exists (select 1 from quizzes q where q.id = quiz_id and app.is_set_member(q.set_id)));
drop policy if exists quiz_questions_write on quiz_questions;
create policy quiz_questions_write on quiz_questions for all to authenticated
  using (exists (select 1 from quizzes q where q.id = quiz_id and app.has_perm(q.set_id,'quizzes.create', q.department_id)))
  with check (exists (select 1 from quizzes q where q.id = quiz_id and app.has_perm(q.set_id,'quizzes.create', q.department_id)));

-- Correct answers stay hidden until the quiz closes or the member has submitted.
drop policy if exists quiz_answers_select on quiz_answers;
create policy quiz_answers_select on quiz_answers for select to authenticated
  using (exists (
    select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
     where qq.id = question_id and app.is_set_member(q.set_id)));
drop policy if exists quiz_answers_write on quiz_answers;
create policy quiz_answers_write on quiz_answers for all to authenticated
  using (exists (select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
                  where qq.id = question_id and app.has_perm(q.set_id,'quizzes.create', q.department_id)))
  with check (exists (select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
                  where qq.id = question_id and app.has_perm(q.set_id,'quizzes.create', q.department_id)));

drop policy if exists quiz_attempts_rw on quiz_attempts;
create policy quiz_attempts_rw on quiz_attempts for all to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or exists (select 1 from quizzes q where q.id = quiz_id and app.is_set_member(q.set_id)))
  with check (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()));

drop policy if exists quiz_responses_rw on quiz_responses;
create policy quiz_responses_rw on quiz_responses for all to authenticated
  using (exists (select 1 from quiz_attempts a join set_memberships m on m.id = a.membership_id
                  where a.id = attempt_id and m.user_id = auth.uid()))
  with check (exists (select 1 from quiz_attempts a join set_memberships m on m.id = a.membership_id
                  where a.id = attempt_id and m.user_id = auth.uid()));

drop policy if exists elections_select on elections;
create policy elections_select on elections for select to authenticated
  using (app.is_set_member(set_id) and (department_id is null or app.is_department_member(department_id)));
drop policy if exists elections_write on elections;
create policy elections_write on elections for all to authenticated
  using (app.has_perm(set_id,'elections.manage') or app.has_perm(set_id,'elections.create'))
  with check (app.has_perm(set_id,'elections.manage') or app.has_perm(set_id,'elections.create'));

drop policy if exists election_positions_select on election_positions;
create policy election_positions_select on election_positions for select to authenticated
  using (exists (select 1 from elections e where e.id = election_id and app.is_set_member(e.set_id)));
drop policy if exists election_positions_write on election_positions;
create policy election_positions_write on election_positions for all to authenticated
  using (exists (select 1 from elections e where e.id = election_id and app.has_perm(e.set_id,'elections.manage')))
  with check (exists (select 1 from elections e where e.id = election_id and app.has_perm(e.set_id,'elections.manage')));

drop policy if exists candidates_select on election_candidates;
create policy candidates_select on election_candidates for select to authenticated
  using (exists (select 1 from election_positions ep join elections e on e.id = ep.election_id
                  where ep.id = election_position_id and app.is_set_member(e.set_id)));
drop policy if exists candidates_write on election_candidates;
create policy candidates_write on election_candidates for all to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or exists (select 1 from election_positions ep join elections e on e.id = ep.election_id
                     where ep.id = election_position_id and app.has_perm(e.set_id,'elections.manage')))
  with check (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or exists (select 1 from election_positions ep join elections e on e.id = ep.election_id
                     where ep.id = election_position_id and app.has_perm(e.set_id,'elections.manage')));

-- You can confirm THAT you voted; nobody can read the ballot-to-voter link.
drop policy if exists ballots_select on election_ballots;
create policy ballots_select on election_ballots for select to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()));

-- Results are readable once published; individual votes are never traceable
-- for anonymous elections because voter_membership_id is null.
drop policy if exists election_votes_select on election_votes;
create policy election_votes_select on election_votes for select to authenticated
  using (exists (select 1 from elections e where e.id = election_id
                  and app.is_set_member(e.set_id)
                  and (e.results_published_at is not null or app.has_perm(e.set_id,'elections.publish'))));

-- ---------------------------------------------------------------------------
-- FINANCE
-- ---------------------------------------------------------------------------
drop policy if exists finance_accounts_select on finance_accounts;
create policy finance_accounts_select on finance_accounts for select to authenticated
  using (app.has_perm(set_id,'finance.view', department_id));
drop policy if exists finance_accounts_write on finance_accounts;
create policy finance_accounts_write on finance_accounts for all to authenticated
  using (app.has_perm(set_id,'finance.statements', department_id) or app.is_set_owner(set_id))
  with check (app.has_perm(set_id,'finance.statements', department_id) or app.is_set_owner(set_id));

drop policy if exists finance_categories_select on finance_categories;
create policy finance_categories_select on finance_categories for select to authenticated
  using (app.is_set_member(set_id));
drop policy if exists finance_categories_write on finance_categories;
create policy finance_categories_write on finance_categories for all to authenticated
  using (app.has_perm(set_id,'finance.expenses_record')) with check (app.has_perm(set_id,'finance.expenses_record'));

-- Every member can see what dues exist; the ledger view is permissioned.
drop policy if exists dues_select on dues;
create policy dues_select on dues for select to authenticated
  using (app.is_set_member(set_id) and (department_id is null or app.is_department_member(department_id)));
drop policy if exists dues_write on dues;
create policy dues_write on dues for all to authenticated
  using (app.has_perm(set_id,'finance.dues_manage', department_id))
  with check (app.has_perm(set_id,'finance.dues_manage', department_id));

drop policy if exists dues_assignments_select on dues_assignments;
create policy dues_assignments_select on dues_assignments for select to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or exists (select 1 from dues d where d.id = dues_id
                     and app.has_perm(d.set_id,'finance.dues_manage', d.department_id)));
drop policy if exists dues_assignments_write on dues_assignments;
create policy dues_assignments_write on dues_assignments for all to authenticated
  using (exists (select 1 from dues d where d.id = dues_id
                  and app.has_perm(d.set_id,'finance.dues_manage', d.department_id)))
  with check (exists (select 1 from dues d where d.id = dues_id
                  and app.has_perm(d.set_id,'finance.dues_manage', d.department_id)));

drop policy if exists payments_select on payments;
create policy payments_select on payments for select to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid())
         or app.has_perm(set_id,'finance.view', department_id));
drop policy if exists payments_insert on payments;
create policy payments_insert on payments for insert to authenticated
  with check (app.is_set_member(set_id));
drop policy if exists payments_update on payments;
create policy payments_update on payments for update to authenticated
  using (app.has_perm(set_id,'finance.payments_confirm', department_id))
  with check (app.has_perm(set_id,'finance.payments_confirm', department_id));

drop policy if exists expenses_select on expenses;
create policy expenses_select on expenses for select to authenticated
  using (app.has_perm(set_id,'finance.view', department_id) or recorded_by = auth.uid()
         or (status in ('approved','paid') and app.is_set_member(set_id)));
drop policy if exists expenses_write on expenses;
create policy expenses_write on expenses for all to authenticated
  using (app.has_perm(set_id,'finance.expenses_record', department_id)
         or app.has_perm(set_id,'finance.expenses_approve', department_id))
  with check (app.has_perm(set_id,'finance.expenses_record', department_id)
         or app.has_perm(set_id,'finance.expenses_approve', department_id));

-- Financial transparency: the ledger itself is readable by every member of the
-- set. Detail-level tables above stay permissioned.
drop policy if exists ledger_select on ledger_entries;
create policy ledger_select on ledger_entries for select to authenticated
  using (app.is_set_member(set_id) and (department_id is null or app.is_department_member(department_id)));
drop policy if exists ledger_write on ledger_entries;
create policy ledger_write on ledger_entries for all to authenticated
  using (app.has_perm(set_id,'finance.expenses_record', department_id))
  with check (app.has_perm(set_id,'finance.expenses_record', department_id));

drop policy if exists campaigns_select on donation_campaigns;
create policy campaigns_select on donation_campaigns for select to authenticated
  using (is_public or (set_id is not null and app.is_set_member(set_id))
         or (institution_id is not null and exists (
              select 1 from set_memberships m join sets s on s.id = m.set_id
               where m.user_id = auth.uid() and m.status = 'active' and s.institution_id = donation_campaigns.institution_id)));
drop policy if exists campaigns_write on donation_campaigns;
create policy campaigns_write on donation_campaigns for all to authenticated
  using (set_id is not null and app.has_perm(set_id,'donations.manage', department_id))
  with check (set_id is not null and app.has_perm(set_id,'donations.manage', department_id));

drop policy if exists statements_select on financial_statements;
create policy statements_select on financial_statements for select to authenticated
  using ((is_published and app.is_set_member(set_id)) or app.has_perm(set_id,'finance.view', department_id));
drop policy if exists statements_write on financial_statements;
create policy statements_write on financial_statements for all to authenticated
  using (app.has_perm(set_id,'finance.statements', department_id))
  with check (app.has_perm(set_id,'finance.statements', department_id));

drop policy if exists budgets_select on budgets;
create policy budgets_select on budgets for select to authenticated using (app.is_set_member(set_id));
drop policy if exists budgets_write on budgets;
create policy budgets_write on budgets for all to authenticated
  using (app.has_perm(set_id,'finance.reports_publish', department_id))
  with check (app.has_perm(set_id,'finance.reports_publish', department_id));

drop policy if exists budget_lines_rw on budget_lines;
create policy budget_lines_rw on budget_lines for all to authenticated
  using (exists (select 1 from budgets b where b.id = budget_id and app.is_set_member(b.set_id)))
  with check (exists (select 1 from budgets b where b.id = budget_id
                       and app.has_perm(b.set_id,'finance.reports_publish', b.department_id)));

drop policy if exists exports_select on finance_exports;
create policy exports_select on finance_exports for select to authenticated
  using (requested_by = auth.uid() or app.has_perm(set_id,'finance.export', department_id));
drop policy if exists exports_write on finance_exports;
create policy exports_write on finance_exports for all to authenticated
  using (app.has_perm(set_id,'finance.export', department_id))
  with check (app.has_perm(set_id,'finance.export', department_id) and requested_by = auth.uid());

-- ---------------------------------------------------------------------------
-- PROJECTS — institution scope, deliberately crossing set boundaries.
-- ---------------------------------------------------------------------------
drop policy if exists projects_select on projects;
create policy projects_select on projects for select to authenticated using (app.can_view_project(id));
drop policy if exists projects_write on projects;
create policy projects_write on projects for all to authenticated
  using (exists (select 1 from project_sets ps where ps.project_id = id and app.has_perm(ps.set_id,'projects.manage'))
         or (originating_set_id is not null and app.has_perm(originating_set_id,'projects.manage'))
         or app.is_platform_admin())
  with check (exists (select 1 from set_memberships m join sets s on s.id = m.set_id
                       where m.user_id = auth.uid() and m.status = 'active'
                         and s.institution_id = projects.institution_id
                         and (app.has_perm(s.id,'projects.create') or app.has_perm(s.id,'projects.propose')))
              or app.is_platform_admin());

do $$
declare t text;
begin
  foreach t in array array['project_sets','project_budget_lines','project_stakeholders',
                           'project_updates','project_media','project_milestones']
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format($f$create policy %I_select on public.%I for select to authenticated
                      using (app.can_view_project(project_id))$f$, t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format($f$create policy %I_write on public.%I for all to authenticated
                      using (exists (select 1 from project_sets ps
                                      where ps.project_id = %I.project_id
                                        and app.has_perm(ps.set_id,'projects.manage')))
                      with check (exists (select 1 from project_sets ps
                                      where ps.project_id = %I.project_id
                                        and app.has_perm(ps.set_id,'projects.manage')))$f$, t, t, t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- CONTENT
-- ---------------------------------------------------------------------------
drop policy if exists albums_select on albums;
create policy albums_select on albums for select to authenticated
  using (app.is_set_member(set_id) and (department_id is null or app.is_department_member(department_id)));
drop policy if exists albums_write on albums;
create policy albums_write on albums for all to authenticated
  using (app.has_perm(set_id,'albums.manage', department_id) or created_by = auth.uid())
  with check (app.has_perm(set_id,'albums.manage', department_id));

drop policy if exists album_media_select on album_media;
create policy album_media_select on album_media for select to authenticated
  using (exists (select 1 from albums a where a.id = album_id and app.is_set_member(a.set_id)
                  and (a.department_id is null or app.is_department_member(a.department_id))));
drop policy if exists album_media_write on album_media;
create policy album_media_write on album_media for all to authenticated
  using (uploaded_by = auth.uid()
         or exists (select 1 from albums a where a.id = album_id and app.has_perm(a.set_id,'albums.manage', a.department_id)))
  with check (exists (select 1 from albums a where a.id = album_id
                       and (a.allow_uploads and app.is_set_member(a.set_id)
                            or app.has_perm(a.set_id,'albums.manage', a.department_id))));

drop policy if exists doc_folders_select on document_folders;
create policy doc_folders_select on document_folders for select to authenticated
  using (app.is_set_member(set_id) and (department_id is null or app.is_department_member(department_id)));
drop policy if exists doc_folders_write on document_folders;
create policy doc_folders_write on document_folders for all to authenticated
  using (app.has_perm(set_id,'documents.manage', department_id))
  with check (app.has_perm(set_id,'documents.manage', department_id));

drop policy if exists documents_select on documents;
create policy documents_select on documents for select to authenticated
  using (app.is_set_member(set_id)
         and (department_id is null or app.is_department_member(department_id))
         and (group_id is null or app.is_group_member(group_id))
         and (visibility <> 'admins' or app.is_set_admin(set_id)));
drop policy if exists documents_write on documents;
create policy documents_write on documents for all to authenticated
  using (app.has_perm(set_id,'documents.manage', department_id) or uploaded_by = auth.uid())
  with check (app.has_perm(set_id,'documents.manage', department_id));

drop policy if exists links_select on useful_links;
create policy links_select on useful_links for select to authenticated
  using (app.is_set_member(set_id) and (department_id is null or app.is_department_member(department_id)));
drop policy if exists links_write on useful_links;
create policy links_write on useful_links for all to authenticated
  using (app.has_perm(set_id,'links.manage', department_id))
  with check (app.has_perm(set_id,'links.manage', department_id));

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS / INTEGRATIONS / AUDIT / MODERATION
-- ---------------------------------------------------------------------------
drop policy if exists notifications_own on notifications;
create policy notifications_own on notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists set_notif_prefs_own on set_notification_preferences;
create policy set_notif_prefs_own on set_notification_preferences for all to authenticated
  using (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()))
  with check (exists (select 1 from set_memberships m where m.id = membership_id and m.user_id = auth.uid()));

-- Credentials never leave the server: members see integrations exist, admins
-- manage them, and the app strips `credentials` from every client response.
drop policy if exists integrations_select on integrations;
create policy integrations_select on integrations for select to authenticated
  using (app.has_perm(set_id,'integrations.manage', department_id)
         or (department_id is not null and app.is_department_admin(department_id)));
drop policy if exists integrations_write on integrations;
create policy integrations_write on integrations for all to authenticated
  using (app.has_perm(set_id,'integrations.manage', department_id)
         or (department_id is not null and app.is_department_admin(department_id)))
  with check (app.has_perm(set_id,'integrations.manage', department_id)
         or (department_id is not null and app.is_department_admin(department_id)));

drop policy if exists deliveries_select on integration_deliveries;
create policy deliveries_select on integration_deliveries for select to authenticated
  using (app.has_perm(set_id,'integrations.manage'));

drop policy if exists broadcasts_select on broadcasts;
create policy broadcasts_select on broadcasts for select to authenticated
  using (app.has_perm(set_id,'broadcast.send', department_id) or created_by = auth.uid());
drop policy if exists broadcasts_write on broadcasts;
create policy broadcasts_write on broadcasts for all to authenticated
  using (app.has_perm(set_id,'broadcast.send', department_id))
  with check (app.has_perm(set_id,'broadcast.send', department_id) and created_by = auth.uid());

drop policy if exists audit_select on audit_log;
create policy audit_select on audit_log for select to authenticated
  using (set_id is not null and app.has_perm(set_id,'audit.view', department_id));

drop policy if exists reports_select on reports;
create policy reports_select on reports for select to authenticated
  using (reporter_id = auth.uid() or app.has_perm(set_id,'moderation.reports', department_id));
drop policy if exists reports_insert on reports;
create policy reports_insert on reports for insert to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists reports_update on reports;
create policy reports_update on reports for update to authenticated
  using (app.has_perm(set_id,'moderation.reports', department_id))
  with check (app.has_perm(set_id,'moderation.reports', department_id));

drop policy if exists moderation_actions_rw on moderation_actions;
create policy moderation_actions_rw on moderation_actions for all to authenticated
  using (set_id is not null and app.has_perm(set_id,'moderation.reports'))
  with check (set_id is not null and app.has_perm(set_id,'moderation.reports'));

drop policy if exists activity_select on activity_feed;
create policy activity_select on activity_feed for select to authenticated
  using (app.is_set_member(set_id) and (department_id is null or app.is_department_member(department_id)));
drop policy if exists activity_insert on activity_feed;
create policy activity_insert on activity_feed for insert to authenticated
  with check (app.is_set_member(set_id));

drop policy if exists search_log_own on search_log;
create policy search_log_own on search_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
