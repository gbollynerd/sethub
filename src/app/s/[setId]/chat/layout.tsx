import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { ChannelRail } from "@/components/chat/channel-rail";

export default async function ChatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: channels } = await supabase
    .from("channels")
    .select(
      "id, name, slug, topic, visibility, is_default, is_announcement, department_id, group_id, message_count, member_count, last_message_at",
    )
    .eq("set_id", setId)
    .is("archived_at", null)
    .order("is_default", { ascending: false })
    .order("name");

  const { data: myChannels } = await supabase
    .from("channel_members")
    .select("channel_id, last_read_at, notify_level")
    .eq("membership_id", ws.membershipId);

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.9rem)] sm:-mx-7 sm:-my-8 sm:h-[calc(100dvh-4.1rem)]">
      <ChannelRail
        setId={setId}
        channels={channels ?? []}
        departments={ws.departments}
        myDepartmentIds={ws.myDepartments.map((d) => d.id)}
        membership={(myChannels ?? []).map((c) => ({
          channelId: c.channel_id as string,
          lastReadAt: c.last_read_at as string | null,
        }))}
        canCreate={can(ws, "channels.create")}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-[var(--color-surface)]">{children}</div>
    </div>
  );
}
