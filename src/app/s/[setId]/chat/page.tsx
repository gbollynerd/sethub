import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

// Visiting /chat with no channel picked (e.g. clicking "Chat" in the sidebar)
// used to 404, since only /chat/[channelId] and /chat/new had a page. Land the
// viewer on the set's default channel instead â falling back to any other
// visible channel, then to "create a channel" for admins, then to an empty
// state for a brand-new set with nothing set up yet.
export default async function ChatIndexPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: defaultChannel } = await supabase
    .from("channels")
    .select("id")
    .eq("set_id", setId)
    .eq("is_default", true)
    .is("archived_at", null)
    .maybeSingle();

  if (defaultChannel) redirect(`/s/${setId}/chat/${defaultChannel.id}`);

  const { data: anyChannel } = await supabase
    .from("channels")
    .select("id")
    .eq("set_id", setId)
    .is("archived_at", null)
    .order("is_default", { ascending: false })
    .order("name")
    .limit(1)
    .maybeSingle();

  if (anyChannel) redirect(`/s/${setId}/chat/${anyChannel.id}`);

  if (can(ws, "channels.create")) redirect(`/s/${setId}/chat/new`);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <EmptyState
        icon="chat"
        title="No channels yet"
        description="A set admin needs to create the first channel before chat can start."
      />
    </div>
  );
}
