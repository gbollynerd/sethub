import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/ui";
import { PollCard } from "@/components/community/poll-card";

export const metadata = { title: "Poll" };
export const dynamic = "force-dynamic";

// The dashboard's "open now" widget links straight to a single poll
// (/community/polls/:pollId) but only the list page existed, so that link
// 404'd. This gives each poll its own page â same PollCard used on the list,
// so voting works exactly the same way here.
export default async function PollPage({
  params,
}: {
  params: Promise<{ setId: string; pollId: string }>;
}) {
  const { setId, pollId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const [{ data: poll }, { data: myVotes }] = await Promise.all([
    supabase
      .from("polls")
      .select(
        "id, question, description, kind, max_choices, is_anonymous, show_live_results, status, opens_at, closes_at, vote_count, department_id, poll_options ( id, label, description, vote_count, sort_order )",
      )
      .eq("id", pollId)
      .eq("set_id", setId)
      .maybeSingle(),
    supabase
      .from("poll_votes")
      .select("option_id")
      .eq("poll_id", pollId)
      .eq("membership_id", ws.membershipId),
  ]);

  if (!poll) notFound();

  const row = {
    id: poll.id as string,
    question: poll.question as string,
    description: poll.description as string | null,
    kind: poll.kind as string,
    maxChoices: poll.max_choices as number,
    isAnonymous: poll.is_anonymous as boolean,
    showLiveResults: poll.show_live_results as boolean,
    status: poll.status as string,
    closesAt: poll.closes_at as string | null,
    voteCount: poll.vote_count as number,
    options: ((poll.poll_options ?? []) as Array<{ id: string; label: string; description: string | null; vote_count: number; sort_order: number }>)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order),
    myChoices: (myVotes ?? []).map((v) => v.option_id as string),
  };

  const closed = row.status !== "open" || (row.closesAt !== null && new Date(row.closesAt) < new Date());

  return (
    <div className="mx-auto max-w-[52rem]">
      <Link href={`/s/${setId}/community/polls`} className="btn btn-quiet btn-sm mb-4">â All polls</Link>

      <PageHeader
        eyebrow={ws.set.name}
        title="Poll"
        description="Cast your vote, or see where everyone else landed."
      />

      <PollCard poll={row} membershipId={ws.membershipId} readOnly={closed} />
    </div>
  );
}
