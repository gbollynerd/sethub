import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Community, SetDepartment } from "@/lib/types";

export interface Workspace {
  userId: string;
  email: string;
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
    onboarded_at: string | null;
  };
  communities: Community[];
  /** The set currently being viewed. */
  set: {
    id: string;
    name: string;
    slug: string;
    graduation_year: number;
    currency: string;
    departments_enabled: boolean;
    department_required: boolean;
    join_policy: string;
    owner_id: string | null;
    logo_url: string | null;
    cover_url: string | null;
    motto: string | null;
    member_count: number;
    status: string;
    institution: {
      id: string;
      name: string;
      short_name: string | null;
      type: string;
      logo_url: string | null;
      city: string | null;
      state: string | null;
      has_houses: boolean;
      has_hostels: boolean;
      has_departments: boolean;
      has_prefects: boolean;
    };
  };
  membershipId: string;
  isOwner: boolean;
  permissions: string[];
  /** Departments the viewer belongs to inside this set. */
  myDepartments: SetDepartment[];
  /** All departments visible in this set. */
  departments: SetDepartment[];
  primaryDepartmentId: string | null;
  departmentAdminIds: string[];
}

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCommunities = cache(async (): Promise<Community[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_communities");
  return (data ?? []) as Community[];
});

export const getProfile = cache(async () => {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, display_name, avatar_url, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  return data;
});

/**
 * Loads everything a set-scoped page needs in one pass: identity, the active
 * workspace, the viewer's effective permissions inside it, and the department
 * sub-communities they can see. Redirects rather than throwing when the viewer
 * has no business being here.
 */
export const getWorkspace = cache(async (setId: string): Promise<Workspace> => {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, communities] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, display_name, avatar_url, onboarded_at")
      .eq("id", user.id)
      .maybeSingle(),
    getCommunities(),
  ]);

  const membership = communities.find((c) => c.set_id === setId);
  if (!membership) redirect("/app");
  if (membership.status === "pending") redirect(`/app/pending/${setId}`);

  const [{ data: set }, { data: departments }, { data: myDepartmentRows }, { data: permissions }] =
    await Promise.all([
      supabase
        .from("sets")
        .select(
          `id, name, slug, graduation_year, currency, departments_enabled, department_required,
           join_policy, owner_id, logo_url, cover_url, motto, member_count, status,
           institution:institutions ( id, name, short_name, type, logo_url, city, state,
             has_houses, has_hostels, has_departments, has_prefects )`,
        )
        .eq("id", setId)
        .single(),
      supabase
        .from("set_departments")
        .select(
          "id, set_id, name, slug, short_name, description, color, member_count, join_policy, is_visible_to_set, faculty_id",
        )
        .eq("set_id", setId)
        .is("archived_at", null)
        .order("name"),
      supabase
        .from("department_memberships")
        .select("department_id, role, is_primary, status")
        .eq("membership_id", membership.membership_id)
        .eq("status", "active"),
      supabase.rpc("effective_permissions", { p_set: setId }),
    ]);

  if (!set) redirect("/app");

  const myDeptIds = new Set((myDepartmentRows ?? []).map((d) => d.department_id as string));
  const allDepartments = (departments ?? []) as SetDepartment[];

  return {
    userId: user.id,
    email: user.email ?? "",
    profile: (profile ?? {
      id: user.id,
      first_name: null,
      last_name: null,
      display_name: null,
      avatar_url: null,
      onboarded_at: null,
    }) as Workspace["profile"],
    communities,
    set: set as unknown as Workspace["set"],
    membershipId: membership.membership_id,
    isOwner: membership.is_owner,
    permissions: (permissions as string[] | null) ?? [],
    departments: allDepartments,
    myDepartments: allDepartments.filter((d) => myDeptIds.has(d.id)),
    primaryDepartmentId:
      (myDepartmentRows ?? []).find((d) => d.is_primary)?.department_id ??
      membership.department_id ??
      null,
    departmentAdminIds: (myDepartmentRows ?? [])
      .filter((d) => d.role === "admin" || d.role === "coordinator")
      .map((d) => d.department_id as string),
  };
});

export function can(ws: Workspace, permission: string, departmentId?: string | null) {
  if (ws.isOwner) return true;
  if (ws.permissions.includes(permission)) return true;
  if (departmentId && ws.departmentAdminIds.includes(departmentId)) return true;
  return false;
}

export function isAdmin(ws: Workspace) {
  return ws.isOwner || ws.permissions.length > 1 || ws.departmentAdminIds.length > 0;
}
