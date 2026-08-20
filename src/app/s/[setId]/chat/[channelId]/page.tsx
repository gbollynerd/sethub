import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { ChannelView } from "@/components/chat/channel-view";
import { first } from "@/lib/rows";

export const metadata = { title: "Channel" };
export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ setId: string; channelId: string }>;
}) {
  const { setId, channelId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: channel } = await supabase
    .from("channels")
    .select(
      "id, name, topic, visibility, is_announcement, is_default, member_count, department_id, group_id, set_departments ( name )",
    )
    .eq("id", channelId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!channel) notFound();

  // Make sure the viewer is a member of the channel so unread tracking works.
  await supabase
    .from("channel_members")
    .upsert(
      { channel_id: channelId, membership_id: ws.membershipId },
      { onConflict: "channel_id,membership_id", ignoreDuplicates: true },
    );

  const [{ data: rawMessages }, { data: channelMembers }, { data: files }] = await Promise.all([
    supabase
      .from("messages")
      .select(
        "id, body, created_at, edited_at, is_pinned, reaction_count, author_id, membership_id, kind, profiles ( display_name, avatar_url )",
      )
      .eq("channel_id", channelId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("channel_members")
      .select("membership_id, set_memberships ( id, profiles ( display_name, avatar_url ) )")
      .eq("channel_id", channelId)
      .limit(150),
    supabase
      .from("message_attachments")
      .select("id, file_name, storage_path, created_at")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const messages = (rawMessages ?? []).map((m) => {
    const p = first(m.profiles) as { display_name: string | null; avatar_url: string | null } | null;
    return {
      id: m.id as string,
      body: m.body as string | null,
      created_at: m.created_at as string,
      edited_at: m.edited_at as string | null,
      is_pinned: m.is_pinned as boolean,
      reaction_count: m.reaction_count as number,
      author_id: m.author_id as string | null,
      membership_id: m.membership_id as string | null,
      kind: m.kind as string,
      author_name: p?.display_name ?? null,
      author_avatar: p?.avatar_url ?? null,
    };
  });

  const members = (channelMembers ?? [])
    .map((cm) => {
      const sm = first(cm.set_memberships) as
        | { id: string; profiles: unknown }
        | null;
      if (!sm) return null;
      const p = first(sm.profiles as { display_name: string | null; avatar_url: string | null }) as
        | { display_name: string | null; avatar_url: string | null }
        | null;
      return { id: sm.id, name: p?.display_name ?? "Member", avatar: p?.avatar_url ?? null };
    })
    .filter((x): x is { id: string; name: string; avatar: string | null } => Boolean(x));

  const departmentName = (first(channel.set_departments) as { name: string } | null)?.name ?? null;

  const canModerate = can(ws, "messages.moderate", channel.department_id as string | null);
  const canPost = channel.is_announcement
    ? can(ws, "announcements.create", channel.department_id as string | null)
    : true;

  return (
    <ChannelView
      setId={setId}
      channel={{
        id: channel.id as string,
        name: channel.name as string,
        topic: channel.topic as string | null,
        visibility: channel.visibility as string,
        is_announcement: channel.is_announcement as boolean,
        member_count: channel.member_count as number,
        department_name: departmentName,
      }}
      membershipId={ws.membershipId}
      userId={ws.userId}
      canPost={canPost}
      canModerate={canModerate}
      initialMessages={messages}
      members={members}
      files={(files ?? []) as Array<{ id: string; file_name: string; storage_path: string; created_at: string }>}
    />
  );
}
