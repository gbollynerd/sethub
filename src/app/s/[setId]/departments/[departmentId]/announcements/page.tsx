import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { SectionHeader } from "@/components/ui";
import { AnnouncementList } from "@/components/lists";
import { AnnouncementComposer } from "@/components/community/announcement-composer";

export const metadata = { title: "Department announcements" };
export const dynamic = "force-dynamic";

export default async function DepartmentAnnouncementsPage({
  params,
}: {
  params: Promise<{ setId: string; departmentId: string }>;
}) {
  const { setId, departmentId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const canPost =
    ws.departmentAdminIds.includes(departmentId) ||
    ws.permissions.includes("announcements.create") ||
    ws.isOwner;

  const { data } = await supabase
    .from("announcements")
    .select("id, title, summary, body, priority, publish_at, is_pinned")
    .eq("department_id", departmentId)
    .order("is_pinned", { ascending: false })
    .order("publish_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      {canPost ? (
        <AnnouncementComposer setId={setId} departmentId={departmentId} scopeLabel="this department" />
      ) : null}
      <div>
        <SectionHeader title="Announcements" hint="Visible only to members of this department" />
        <AnnouncementList
          items={(data ?? []).map((a) => ({ ...a, department: null }))}
          emptyHint="Department admins can post notices that only this department sees."
        />
      </div>
    </div>
  );
}
