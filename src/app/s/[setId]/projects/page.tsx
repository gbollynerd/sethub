import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, Card, EmptyState, PageHeader, Progress, SectionHeader, StatTile } from "@/components/ui";
import { IconPlus, IconProject, IconSchool } from "@/components/icons";
import { compactMoney, formatDate, money, num, pct, titleCase } from "@/lib/format";

export const metadata = { title: "School projects" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "default" | "brand" | "positive" | "caution" | "critical" | "info" | "plum"> = {
  proposed: "default",
  approved: "info",
  fundraising: "caution",
  in_progress: "brand",
  on_hold: "plum",
  completed: "positive",
  cancelled: "critical",
  archived: "default",
};

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, title, summary, category, status, is_historical, year, estimated_cost, raised_amount, spent_amount, currency, starts_on, completed_on, visibility, cover_url",
    )
    .eq("institution_id", ws.set.institution.id)
    .order("created_at", { ascending: false })
    .limit(60);

  const { data: participation } = await supabase
    .from("project_sets")
    .select("project_id, role, contributed_amount, pledge_amount")
    .eq("set_id", setId);

  const mine = new Map(
    (participation ?? []).map((p) => [p.project_id as string, p]),
  );

  const all = projects ?? [];
  const historical = all.filter((p) => p.is_historical || p.status === "completed");
  const live = all.filter((p) => !historical.includes(p) && p.status !== "cancelled");
  const showing = sp.view === "history" ? historical : live;

  const totalRaised = all.reduce((s, p) => s + Number(p.raised_amount), 0);
  const myContribution = (participation ?? []).reduce((s, p) => s + Number(p.contributed_amount), 0);

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.institution.name}
        title="School projects"
        description="A project belongs to the school, not to one set. Class of 1990 and Class of 2012 fund the same laboratory — and everybody sees the same budget."
        action={
          can(ws, "projects.propose") ? (
            <Link href={`/s/${setId}/projects/new`} className="btn btn-primary btn-sm">
              <IconPlus size={15} /> Propose a project
            </Link>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Projects" value={num(all.length)} icon="project" tone="brand" />
        <StatTile label="Active now" value={num(live.length)} icon="clock" tone="caution" />
        <StatTile label="Raised across the school" value={compactMoney(totalRaised, ws.set.currency)} icon="finance" tone="positive" />
        <StatTile label="Your set has contributed" value={compactMoney(myContribution, ws.set.currency)} icon="wallet" tone="info" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href={`/s/${setId}/projects`}
          className={`chip transition ${sp.view !== "history" ? "chip-brand" : "hover:border-[var(--color-ink)]"}`}
        >
          Live projects
        </Link>
        <Link
          href={`/s/${setId}/projects?view=history`}
          className={`chip transition ${sp.view === "history" ? "chip-brand" : "hover:border-[var(--color-ink)]"}`}
        >
          Completed & historical
        </Link>
      </div>

      {showing.length === 0 ? (
        <EmptyState
          icon="project"
          title={sp.view === "history" ? "No completed projects recorded" : "No projects yet"}
          description={
            sp.view === "history"
              ? "Older sets can enter projects they funded years ago — it becomes permanent institutional history."
              : "Propose the first one. Other sets from your school can join in and fund it with you."
          }
          action={
            can(ws, "projects.propose") ? (
              <Link href={`/s/${setId}/projects/new`} className="btn btn-primary btn-sm">Propose a project</Link>
            ) : undefined
          }
        />
      ) : (
        <div className="stagger grid gap-4 lg:grid-cols-2">
          {showing.map((p) => {
            const cost = Number(p.estimated_cost);
            const raised = Number(p.raised_amount);
            const funded = cost > 0 ? (raised / cost) * 100 : 0;
            const participating = mine.get(p.id);

            return (
              <Link key={p.id} href={`/s/${setId}/projects/${p.id}`} className="card card-hover flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
                    <IconProject size={20} />
                  </span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Badge tone={STATUS_TONE[p.status] ?? "default"}>{titleCase(p.status)}</Badge>
                    {participating ? <Badge tone="brand">Your set is in</Badge> : null}
                  </div>
                </div>

                <h2 className="t-h3 mt-4">{p.title}</h2>
                {p.summary ? (
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
                    {p.summary}
                  </p>
                ) : <div className="flex-1" />}

                <div className="mt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="tabular font-display text-xl font-semibold">
                      {compactMoney(raised, p.currency)}
                    </p>
                    <p className="text-sm text-[var(--color-subtle)]">
                      of {compactMoney(cost, p.currency)}
                    </p>
                  </div>
                  <div className="mt-2.5">
                    <Progress value={funded} tone={funded >= 100 ? "positive" : "brand"} />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-xs text-[var(--color-muted)]">
                    <span>{pct(funded)} funded</span>
                    <span>
                      {funded >= 100
                        ? "Fully funded"
                        : `${money(Math.max(cost - raised, 0), p.currency)} still needed`}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-subtle)]">
                  <Badge>{titleCase(p.category)}</Badge>
                  {p.year ? <span>{p.year}</span> : null}
                  {p.completed_on ? <span>Completed {formatDate(p.completed_on)}</span> : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Card className="mt-8 !bg-[var(--color-brand-soft)] !border-[var(--color-brand)]/25">
        <div className="flex flex-wrap items-center gap-4">
          <IconSchool size={26} className="shrink-0 text-[var(--color-brand-deep)]" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-[var(--color-brand-deep)]">
              Projects cross set boundaries on purpose
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-brand-dark)]">
              Everything else in SetHub is walled off inside your set. School projects are the one
              deliberate exception — every set from {ws.set.institution.name} can see them, fund them
              and follow the spending.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
