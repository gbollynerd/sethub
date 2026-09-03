import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, Card, EmptyState, Progress, SectionHeader } from "@/components/ui";
import { IconClock, IconLock, IconShield, IconVote } from "@/components/icons";
import { BallotBox } from "@/components/elections/ballot-box";
import { first } from "@/lib/rows";
import { countdown, formatDate, num, pct } from "@/lib/format";

export const metadata = { title: "Election" };
export const dynamic = "force-dynamic";

export default async function ElectionPage({
  params,
}: {
  params: Promise<{ setId: string; electionId: string }>;
}) {
  const { setId, electionId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: election } = await supabase
    .from("elections")
    .select(
      "id, title, description, rules, stage, nominations_open_at, nominations_close_at, voting_opens_at, voting_closes_at, is_anonymous, eligibility, eligibility_note, results_published_at, turnout, eligible_count, department_id",
    )
    .eq("id", electionId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!election) notFound();

  const [{ data: positions }, { data: myBallot }] = await Promise.all([
    supabase
      .from("election_positions")
      .select(
        `id, title, description, seats, sort_order,
         election_candidates ( id, membership_id, manifesto, statement, photo_url, status, vote_count,
           set_memberships ( id, nickname, course, profiles!set_memberships_user_id_fkey ( display_name, avatar_url ) ) )`,
      )
      .eq("election_id", electionId)
      .order("sort_order"),
    supabase
      .from("election_ballots")
      .select("id, receipt, cast_at")
      .eq("election_id", electionId)
      .eq("membership_id", ws.membershipId)
      .maybeSingle(),
  ]);

  const published = Boolean(election.results_published_at);
  const votingOpen = election.stage === "voting";
  const canManage = can(ws, "elections.manage");

  const races = (positions ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    description: p.description as string | null,
    seats: p.seats as number,
    candidates: ((p.election_candidates ?? []) as Array<Record<string, unknown>>)
      .filter((c) => c.status === "approved" || c.status === "elected" || c.status === "not_elected")
      .map((c) => {
        const sm = first(c.set_memberships as { id: string; nickname: string | null; course: string | null; profiles: unknown }) as
          | { id: string; nickname: string | null; course: string | null; profiles: unknown }
          | null;
        const prof = first(sm?.profiles as { display_name: string | null; avatar_url: string | null }) as
          | { display_name: string | null; avatar_url: string | null }
          | null;
        return {
          id: c.id as string,
          membershipId: sm?.id ?? "",
          name: prof?.display_name ?? "Candidate",
          avatar: (c.photo_url as string | null) ?? prof?.avatar_url ?? null,
          sub: sm?.course ?? sm?.nickname ?? null,
          manifesto: (c.manifesto as string | null) ?? (c.statement as string | null),
          votes: Number(c.vote_count ?? 0),
          status: c.status as string,
        };
      })
      .sort((a, b) => b.votes - a.votes),
  }));

  const turnoutPct = election.eligible_count > 0 ? (election.turnout / election.eligible_count) * 100 : 0;

  return (
    <div className="mx-auto max-w-[62rem]">
      <Link href={`/s/${setId}/elections`} className="btn btn-quiet btn-sm mb-4">← All elections</Link>

      <header className="card p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={votingOpen ? "positive" : published ? "brand" : "caution"}>{election.stage}</Badge>
              {election.is_anonymous ? <Badge icon="lock">Secret ballot</Badge> : <Badge>Open ballot</Badge>}
              {myBallot ? <Badge tone="positive" icon="check">You have voted</Badge> : null}
            </div>
            <h1 className="t-h1 mt-3">{election.title}</h1>
            {election.description ? (
              <p className="t-lead mt-2.5 max-w-2xl">{election.description}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="tabular font-display text-3xl font-semibold leading-none">{num(election.turnout)}</p>
            <p className="mt-1 text-xs text-[var(--color-subtle)]">ballots cast</p>
          </div>
        </div>

        {election.eligible_count > 0 ? (
          <div className="mt-6">
            <Progress
              value={turnoutPct}
              tone={turnoutPct > 60 ? "positive" : "brand"}
              label={`Turnout — ${num(election.turnout)} of ${num(election.eligible_count)} eligible members (${pct(turnoutPct)})`}
            />
          </div>
        ) : null}

        <dl className="mt-6 grid gap-4 border-t border-[var(--color-line)] pt-5 sm:grid-cols-3">
          <Timeline
            label="Nominations"
            value={
              election.nominations_close_at
                ? `Close ${formatDate(election.nominations_close_at)}`
                : "Not scheduled"
            }
          />
          <Timeline
            label="Voting opens"
            value={election.voting_opens_at ? formatDate(election.voting_opens_at) : "To be announced"}
          />
          <Timeline
            label="Voting closes"
            value={
              election.voting_closes_at
                ? `${formatDate(election.voting_closes_at)}${votingOpen ? ` · ${countdown(election.voting_closes_at)}` : ""}`
                : "To be announced"
            }
          />
        </dl>

        {election.rules ? (
          <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">
              <IconShield size={14} /> Rules
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink-2)]">
              {election.rules}
            </p>
          </div>
        ) : null}

        <p className="mt-4 flex items-center gap-2 text-xs text-[var(--color-subtle)]">
          <IconLock size={13} />
          Eligibility: {String(election.eligibility).replace(/_/g, " ")}
          {election.eligibility_note ? ` — ${election.eligibility_note}` : ""}
        </p>
      </header>

      {myBallot ? (
        <Card className="mt-5 border-[var(--color-positive)]/35 bg-[var(--color-positive-soft)]">
          <div className="flex flex-wrap items-center gap-3">
            <IconVote size={20} className="shrink-0 text-[var(--color-positive)]" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold">Your vote was recorded</p>
              <p className="text-sm text-[var(--color-ink-2)]">
                Cast {formatDate(myBallot.cast_at)}. Keep this receipt if you ever need to prove you voted:{" "}
                <strong className="font-mono tracking-wider">{myBallot.receipt}</strong>
              </p>
            </div>
          </div>
          {election.is_anonymous ? (
            <p className="mt-2.5 text-xs text-[var(--color-ink-2)]">
              Because this is a secret ballot, the receipt proves that you voted — never how you voted.
              Not even an administrator can link the two.
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="mt-7 space-y-6">
        {races.length === 0 ? (
          <EmptyState
            icon="vote"
            title="No positions set up yet"
            description="The electoral committee has not published the positions and candidates."
          />
        ) : votingOpen && !myBallot ? (
          <BallotBox electionId={electionId} setId={setId} races={races} />
        ) : (
          races.map((race) => (
            <Card key={race.id}>
              <SectionHeader
                title={race.title}
                hint={`${race.seats} seat${race.seats === 1 ? "" : "s"} · ${race.candidates.length} candidates`}
              />
              {race.candidates.length === 0 ? (
                <p className="py-4 text-sm text-[var(--color-subtle)]">No approved candidates yet.</p>
              ) : (
                <ul className="space-y-3">
                  {race.candidates.map((c, i) => {
                    const totalRaceVotes = race.candidates.reduce((s, x) => s + x.votes, 0);
                    const share = totalRaceVotes > 0 ? (c.votes / totalRaceVotes) * 100 : 0;
                    const winner = published && i < race.seats && c.votes > 0;
                    return (
                      <li
                        key={c.id}
                        className={`rounded-[var(--radius-md)] border p-4 ${
                          winner ? "border-[var(--color-positive)]/45 bg-[var(--color-positive-soft)]" : "border-[var(--color-line)]"
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <Avatar name={c.name} src={c.avatar} size={46} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={`/s/${setId}/people/${c.membershipId}`} className="font-display text-[0.98rem] font-semibold hover:underline">
                                {c.name}
                              </Link>
                              {winner ? <Badge tone="positive" icon="trophy">Elected</Badge> : null}
                            </div>
                            {c.sub ? <p className="text-sm text-[var(--color-muted)]">{c.sub}</p> : null}
                            {c.manifesto ? (
                              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--color-ink-2)]">
                                {c.manifesto}
                              </p>
                            ) : null}
                            {published ? (
                              <div className="mt-3">
                                <Progress
                                  value={share}
                                  tone={winner ? "positive" : "brand"}
                                  label={`${num(c.votes)} votes · ${pct(share)}`}
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          ))
        )}
      </div>

      {!published && !votingOpen ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-[var(--color-subtle)]">
          <IconClock size={15} />
          Results stay sealed until the electoral officer publishes them.
        </p>
      ) : null}

      {canManage ? (
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href={`/s/${setId}/elections/${electionId}/edit`} className="btn btn-ghost btn-sm">
            Edit election
          </Link>
          <Link href={`/s/${setId}/elections/${electionId}/candidates`} className="btn btn-ghost btn-sm">
            Review candidates
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function Timeline({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
