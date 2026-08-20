-- Allow set administrators to see profile details for pending join requests.
--
-- The Manage members page joins pending set_memberships to profiles so admins
-- can decide whether to approve or decline the request. Pending members do not
-- yet "share" an active set with admins, so the generic profile policy hid the
-- embedded profile row even though the pending membership count was visible.

create or replace function app.can_review_member_profile(p_other uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1
      from set_memberships pending
     where pending.user_id = p_other
       and pending.status = 'pending'
       and (app.has_perm(pending.set_id, 'members.approve', null, p_user)
            or app.has_perm(pending.set_id, 'members.edit_profile', null, p_user)
            or app.is_set_owner(pending.set_id, p_user))
  );
$$;

grant execute on function app.can_review_member_profile(uuid, uuid) to authenticated;

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (
    id = auth.uid()
    or app.shares_set_with(id)
    or app.can_review_member_profile(id)
    or app.is_platform_admin()
  );
