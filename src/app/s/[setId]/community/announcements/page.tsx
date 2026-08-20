import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/ui";
import { AnnouncementList } from "@/components/lists";
import { AnnouncementComposer } from "@/components/community/announcement-composer";
import { first } from "@/lib/rows";

export const metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data } = await supabase
    .from("announcements")
    .select(
      "id, title, summary, body, priority, publish_at, is_pinned, department_id, set_departments ( name, color ), profiles!announcements_created_by_fkey ( display_name )",
    )
    .eq("set_id", setId)
    .order("is_pinned", { ascending: false })
    .order("publish_at", { ascending: false })
    .limit(60);

  const items = (data ?? []).map((a) => ({
    id: a.id as string,
    title: a.title as string,
    summary: a.summary as string | null,
    body: a.body as string | null,
    priority: a.priority as string,
    publish_at: a.publish_at as string,
    is_pinned: a.is_pinned as boolean,
    department: first(a.set_departments) as { name: string; color: string | null } | null,
    author: (first(a.profiles) as { display_name: string | null } | null)?.display_name ?? null,
  }));

  return (
    <div className="mx-auto max-w-[52rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Announcements"
        description="The official record. Anything posted here also reaches members by email and, if connected, your WhatsApp group."
      />
      {can(ws, "announcements.create") ? (
        <div className="mb-6">
          <AnnouncementComposer setId={setId} />
        </div>
      ) : null}
      <AnnouncementList items={items} />
    </div>
  );
}
