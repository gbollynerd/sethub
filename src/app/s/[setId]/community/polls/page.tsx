import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { PollCard } from "@/components/community/poll-card";
import { PollComposer } from "@/components/community/poll-composer";

export const metadata = { title: "Polls" };
export const dynamic = "force-dynamic";

export default async function PollsPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const [{ data: polls }, { data: myVotes }] = await Promise.all([
    supabase
      .from("polls")
      .select(
        "id, question, description, kind, max_choices, is_anonymous, show_live_results, status, opens_at, closes_at, vote_count, department_id, poll_options ( id, label, description, vote_count, sort_order )",
      )
      .eq("set_id", setId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("poll_votes")
      .select("poll_id, option_id")
      .eq("membership_id", ws.membershipId),
  ]);

  const voted = new Map<string, string[]>();
  for (const v of myVotes ?? []) {
    voted.set(v.poll_id as string, [...(voted.get(v.poll_id as string) ?? []), v.option_id as string]);
  }

  const rows = (polls ?? []).map((p) => ({
    id: p.id as string,
    question: p.question as string,
    description: p.description as string | null,
    kind: p.kind as string,
    maxChoices: p.max_choices as number,
    isAnonymous: p.is_anonymous as boolean,
    showLiveResults: p.show_live_results as boolean,
    status: p.status as string,
    closesAt: p.closes_at as string | null,
    voteCount: p.vote_count as number,
    options: ((p.poll_options ?? []) as Array<{ id: string; label: string; description: string | null; vote_count: number; sort_order: number }>)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order),
    myChoices: voted.get(p.id as string) ?? [],
  }));

  const open = rows.filter((p) => p.status === "open" && (!p.closesAt || new Date(p.closesAt) > new Date()));
  const closed = rows.filter((p) => !open.includes(p));

  return (
    <div className="mx-auto max-w-[52rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Polls"
        description="Quick decisions without the ceremony of a full election — venue for the reunion, colour of the anniversary shirt, whatever needs settling."
      />

      {can(ws, "polls.create") ? (
        <div className="mb-7">
          <PollComposer setId={setId} />
        </div>
      ) : null}

      <section className="mb-9">
        <SectionHeader title="Open now" hint="Your vote counts once" />
        {open.length === 0 ? (
          <EmptyState icon="poll" title="No open polls" description="When an executive opens a poll it appears here." />
        ) : (
          <div className="space-y-4">
            {open.map((p) => (
              <PollCard key={p.id} poll={p} membershipId={ws.membershipId} />
            ))}
          </div>
        )}
      </section>

      {closed.length ? (
        <section>
          <SectionHeader title="Closed" />
          <div className="space-y-4">
            {closed.map((p) => (
              <PollCard key={p.id} poll={p} membershipId={ws.membershipId} readOnly />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
