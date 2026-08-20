import { createClient } from "@/lib/supabase/server";
import { getWorkspace, isAdmin } from "@/lib/workspace";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/topbar";

export default async function SetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const community = ws.communities.find((c) => c.set_id === setId)!;
  const { count: pending } = await supabase
    .from("set_memberships")
    .select("id", { count: "exact", head: true })
    .eq("set_id", setId)
    .eq("status", "pending");

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        setId={setId}
        communities={ws.communities}
        departments={ws.departments}
        activeDepartmentId={null}
        counts={{
          unread: community.unread_count ?? 0,
          dues: Number(community.outstanding) > 0 ? 1 : 0,
          pending: pending ?? 0,
        }}
        canAdminister={isAdmin(ws)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          setId={setId}
          setName={ws.set.name}
          institutionName={ws.set.institution.name}
          userName={ws.profile.display_name ?? ws.email}
          avatarUrl={ws.profile.avatar_url}
        />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
