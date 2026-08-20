import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Badge, Card, Donut, EmptyState, PageHeader, Progress, SectionHeader, StatTile, Table, Td, Tr } from "@/components/ui";
import { IconPin, IconProject, IconSchool, IconPeople } from "@/components/icons";
import { first } from "@/lib/rows";
import { compactMoney, formatDate, money, pct, relativeTime, titleCase } from "@/lib/format";

export const metadata = { title: "Project" };
export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ setId: string; projectId: string }>;
}) {
  const { setId, projectId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      `id, title, summary, description, category, status, is_historical, year, starts_on,
       target_end_on, completed_on, currency, estimated_cost, raised_amount, spent_amount,
       beneficiaries, location, school_liaison_name, school_liaison_role, school_liaison_phone,
       visibility, institution_id`,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (!project) notFound();

  const [{ data: budget }, { data: sets }, { data: updates }, { data: milestones }, { data: stakeholders }] =
    await Promise.all([
      supabase.from("project_budget_lines").select("id, label, category, planned, actual, notes").eq("project_id", projectId).order("sort_order"),
      supabase
        .from("project_sets")
        .select("id, role, pledge_amount, contributed_amount, set_id, sets ( name, graduation_year )")
        .eq("project_id", projectId)
        .order("contributed_amount", { ascending: false }),
      supabase
        .from("project_updates")
        .select("id, title, body, progress_pct, created_at, profiles ( display_name )")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("project_milestones").select("id, title, due_on, completed_on").eq("project_id", projectId).order("sort_order"),
      supabase.from("project_stakeholders").select("id, external_name, organisation, role").eq("project_id", projectId),
    ]);

  const cost = Number(project.estimated_cost);
  const raised = Number(project.raised_amount);
  const spent = Number(project.spent_amount);
  const funded = cost > 0 ? (raised / cost) * 100 : 0;
  const stillNeeded = Math.max(cost - raised, 0);

  const spendByCategory = (budget ?? []).map((b) => ({
    label: titleCase(b.category),
    value: Number(b.actual) || Number(b.planned),
  }));

  return (
    <div className="mx-auto max-w-[76rem]">
      <Link href={`/s/${setId}/projects`} className="btn btn-quiet btn-sm mb-4">← All projects</Link>

      <PageHeader
        eyebrow={`${ws.set.institution.name} · ${titleCase(project.category)}`}
        title={project.title}
        description={project.summary ?? undefined}
        action={<Badge tone={project.status === "completed" ? "positive" : "brand"}>{titleCase(project.status)}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Estimated cost" value={compactMoney(cost, project.currency)} icon="chart" tone="brand" />
        <StatTile label="Raised" value={compactMoney(raised, project.currency)} icon="finance" tone="positive" sub={`${pct(funded)} of target`} />
        <StatTile label="Still needed" value={compactMoney(stillNeeded, project.currency)} icon="clock" tone={stillNeeded > 0 ? "caution" : "positive"} />
        <StatTile label="Spent so far" value={compactMoney(spent, project.currency)} icon="wallet" tone="info" />
      </div>

      <Card className="mt-5">
        <Progress
          value={funded}
          tone={funded >= 100 ? "positive" : "brand"}
          height={12}
          label={`${money(raised, project.currency)} raised of ${money(cost, project.currency)}`}
        />
      </Card>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          {project.description ? (
            <Card>
              <SectionHeader title="About this project" />
              <p className="whitespace-pre-wrap leading-relaxed text-[var(--color-ink-2)]">
                {project.description}
              </p>
              {project.beneficiaries ? (
                <p className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-3.5 text-sm">
                  <strong>Who benefits:</strong> {project.beneficiaries}
                </p>
              ) : null}
            </Card>
          ) : null}

          <Card>
            <SectionHeader
              title="Budget breakdown"
              hint="Planned against actual — the number members actually want to see"
            />
            {budget?.length ? (
              <Table headers={["Line", "Category", "Planned", "Actual", "Variance"]} dense>
                {budget.map((b) => {
                  const variance = Number(b.planned) - Number(b.actual);
                  return (
                    <Tr key={b.id}>
                      <Td className="font-medium">{b.label}</Td>
                      <Td className="text-[var(--color-muted)]">{titleCase(b.category)}</Td>
                      <Td className="tabular">{money(b.planned, project.currency)}</Td>
                      <Td className="tabular">{money(b.actual, project.currency)}</Td>
                      <Td className={`tabular font-semibold ${variance < 0 ? "text-[var(--color-critical)]" : "text-[var(--color-positive)]"}`}>
                        {money(variance, project.currency)}
                      </Td>
                    </Tr>
                  );
                })}
              </Table>
            ) : (
              <EmptyState icon="chart" title="No budget lines yet" description="The project coordinator breaks the estimate into lines here." />
            )}
          </Card>

          <Card>
            <SectionHeader title="Progress updates" />
            {updates?.length ? (
              <ol className="relative space-y-5 border-l border-[var(--color-line)] pl-5">
                {updates.map((u) => {
                  const author = first(u.profiles) as { display_name: string | null } | null;
                  return (
                    <li key={u.id} className="relative">
                      <span className="absolute -left-[1.62rem] top-1.5 h-3 w-3 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-brand)]" />
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-[0.95rem] font-semibold">{u.title}</p>
                        {u.progress_pct !== null ? <Badge tone="brand">{u.progress_pct}% complete</Badge> : null}
                      </div>
                      {u.body ? (
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink-2)]">
                          {u.body}
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-xs text-[var(--color-subtle)]">
                        {author?.display_name ? `${author.display_name} · ` : ""}
                        {relativeTime(u.created_at)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState icon="megaphone" title="No updates posted" description="Regular updates are what keep contributions coming." />
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {spendByCategory.length ? (
            <Card>
              <SectionHeader title="Where the money goes" />
              <Donut
                size={150}
                data={spendByCategory}
                centerValue={compactMoney(cost, project.currency)}
                centerLabel="budget"
              />
            </Card>
          ) : null}

          <Card>
            <SectionHeader title="Participating sets" hint="Funded together" />
            {sets?.length ? (
              <ul className="space-y-2.5">
                {sets.map((s) => {
                  const setInfo = first(s.sets) as { name: string; graduation_year: number } | null;
                  const isMine = s.set_id === setId;
                  return (
                    <li
                      key={s.id}
                      className={`rounded-[var(--radius-md)] border p-3 ${
                        isMine ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]" : "border-[var(--color-line)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {setInfo?.name ?? "A set"}
                            {isMine ? " (yours)" : ""}
                          </p>
                          <p className="text-xs capitalize text-[var(--color-subtle)]">{s.role}</p>
                        </div>
                        <p className="tabular shrink-0 text-sm font-semibold">
                          {compactMoney(s.contributed_amount, project.currency)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-5 text-center text-sm text-[var(--color-subtle)]">
                No set has joined this project yet.
              </p>
            )}
          </Card>

          {milestones?.length ? (
            <Card>
              <SectionHeader title="Milestones" />
              <ul className="space-y-2.5">
                {milestones.map((m) => (
                  <li key={m.id} className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        m.completed_on ? "bg-[var(--color-positive)]" : "bg-[var(--color-line-strong)]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-[var(--color-subtle)]">
                        {m.completed_on
                          ? `Done ${formatDate(m.completed_on)}`
                          : m.due_on
                            ? `Due ${formatDate(m.due_on)}`
                            : "No date set"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <SectionHeader title="School contact" />
            {project.school_liaison_name ? (
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
                  <IconSchool size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{project.school_liaison_name}</p>
                  <p className="text-sm text-[var(--color-muted)]">{project.school_liaison_role ?? "School liaison"}</p>
                  {project.school_liaison_phone ? (
                    <p className="mt-1 text-sm">{project.school_liaison_phone}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No school liaison recorded yet.</p>
            )}

            {project.location ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-muted)]">
                <IconPin size={15} /> {project.location}
              </p>
            ) : null}

            {stakeholders?.length ? (
              <div className="mt-4 border-t border-[var(--color-line)] pt-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">
                  <IconPeople size={13} /> Stakeholders
                </p>
                <ul className="space-y-1.5 text-sm">
                  {stakeholders.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{s.external_name ?? "—"}</span>
                      <span className="shrink-0 text-[var(--color-subtle)]">{s.role}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          {project.is_historical ? (
            <Card className="!bg-[var(--color-plum-soft)] !border-[var(--color-plum)]/25">
              <div className="flex items-start gap-3">
                <IconProject size={20} className="mt-0.5 shrink-0 text-[var(--color-plum)]" />
                <div>
                  <p className="font-display text-sm font-semibold text-[var(--color-plum)]">Historical record</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-2)]">
                    This project was entered after the fact so the school keeps a permanent record of
                    what its alumni built{project.year ? ` back in ${project.year}` : ""}.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
