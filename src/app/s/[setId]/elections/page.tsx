import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, Card, EmptyState, PageHeader, Progress, SectionHeader } from "@/components/ui";
import { IconPlus, IconVote } from "@/components/icons";
import { countdown, formatDate, num, pct } from "@/lib/format";

export const metadata = { title: "Elections" };
export const dynamic = "force-dynamic";

const STAGE_TONE: Record<string, "default" | "brand" | "positive" | "caution" | "critical" | "info" | "plum"> = {
  draft: "default",
  nominations: "caution",
  campaign: "info",
  voting: "positive",
  counting: "plum",
  published: "brand",
  cancelled: "critical",
};

export default async function ElectionsPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const [{ data: elections }, { data: ballots }, { data: term }] = await Promise.all([
    supabase
      .from("elections")
      .select(
        "id, title, description, stage, voting_opens_at, voting_closes_at, nominations_close_at, turnout, eligible_count, is_anonymous, results_published_at",
      )
      .eq("set_id", setId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("election_ballots").select("election_id").eq("membership_id", ws.membershipId),
    supabase
      .from("exco_terms")
      .select("id, name, starts_on, ends_on")
      .eq("set_id", setId)
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  const voted = new Set((ballots ?? []).map((b) => b.election_id as string));
  const active = (elections ?? []).filter((e) => ["nominations", "campaign", "voting", "counting"].includes(e.stage));
  const past = (elections ?? []).filter((e) => ["published", "cancelled"].includes(e.stage));
  const drafts = (elections ?? []).filter((e) => e.stage === "draft");

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Elections"
        description="Proper ballots with eligibility rules, anonymous voting and a receipt for every voter — so nobody argues about the result afterwards."
        action={
          can(ws, "elections.create") ? (
            <Link href={`/s/${setId}/elections/new`} className="btn btn-primary btn-sm">
              <IconPlus size={15} /> New election
            </Link>
          ) : undefined
        }
      />

      {term ? (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
              <IconVote size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold">Current executive: {term.name}</p>
              <p className="text-sm text-[var(--color-muted)]">
                In office since {formatDate(term.starts_on)}
                {term.ends_on ? ` · term ends ${formatDate(term.ends_on)}` : ""}
              </p>
            </div>
            <Link href={`/s/${setId}/admin/exco`} className="btn btn-ghost btn-sm">View EXCO</Link>
          </div>
        </Card>
      ) : null}

      <section className="mb-9">
        <SectionHeader title="Running now" />
        {active.length === 0 ? (
          <EmptyState
            icon="vote"
            title="No election in progress"
            description="When an electoral officer opens nominations or voting, it appears here."
          />
        ) : (
          <div className="stagger space-y-3">
            {active.map((e) => {
              const turnoutPct = e.eligible_count > 0 ? (e.turnout / e.eligible_count) * 100 : 0;
              const hasVoted = voted.has(e.id);
              return (
                <Link key={e.id} href={`/s/${setId}/elections/${e.id}`} className="card card-hover block p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[1.05rem] font-semibold">{e.title}</h3>
                        <Badge tone={STAGE_TONE[e.stage]}>{e.stage}</Badge>
                        {e.is_anonymous ? <Badge icon="lock">Secret ballot</Badge> : null}
                        {hasVoted ? <Badge tone="positive" icon="check">You voted</Badge> : null}
                      </div>
                      {e.description ? (
                        <p className="mt-1.5 line-clamp-2 text-sm text-[var(--color-muted)]">{e.description}</p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="tabular font-display text-lg font-semibold">{num(e.turnout)}</p>
                      <p className="text-xs text-[var(--color-subtle)]">ballots cast</p>
                    </div>
                  </div>

                  {e.eligible_count > 0 ? (
                    <div className="mt-4">
                      <Progress value={turnoutPct} tone="brand" label={`Turnout ${pct(turnoutPct)}`} />
                    </div>
                  ) : null}

                  <p className="mt-3 text-sm text-[var(--color-muted)]">
                    {e.stage === "voting" && e.voting_closes_at
                      ? `Voting ${countdown(e.voting_closes_at)}`
                      : e.stage === "nominations" && e.nominations_close_at
                        ? `Nominations close ${formatDate(e.nominations_close_at)}`
                        : e.voting_opens_at
                          ? `Voting opens ${formatDate(e.voting_opens_at)}`
                          : "Timetable to be announced"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {drafts.length && can(ws, "elections.manage") ? (
        <section className="mb-9">
          <SectionHeader title="Drafts" hint="Only visible to the electoral committee" />
          <ul className="space-y-2">
            {drafts.map((e) => (
              <li key={e.id}>
                <Link href={`/s/${setId}/elections/${e.id}`} className="card card-hover flex items-center gap-3 p-4">
                  <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
                  <Badge>Draft</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {past.length ? (
        <section>
          <SectionHeader title="Previous administrations" hint="The historical record of who was elected, and by how much" />
          <ul className="space-y-2">
            {past.map((e) => (
              <li key={e.id}>
                <Link href={`/s/${setId}/elections/${e.id}`} className="card card-hover flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[0.96rem] font-semibold">{e.title}</p>
                    <p className="text-xs text-[var(--color-subtle)]">
                      {e.results_published_at ? `Results published ${formatDate(e.results_published_at)}` : "Cancelled"}
                      {` · ${num(e.turnout)} ballots`}
                    </p>
                  </div>
                  <Badge tone={STAGE_TONE[e.stage]}>{e.stage}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
