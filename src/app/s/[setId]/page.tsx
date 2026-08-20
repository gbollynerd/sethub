import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace, isAdmin } from "@/lib/workspace";
import { Avatar, Badge, Card, Donut, EmptyState, Progress, SectionHeader, StatTile } from "@/components/ui";
import { Icon, IconArrow, IconDepartment, IconMegaphone, IconSparkle } from "@/components/icons";
import { compactMoney, formatDate, formatTime, greeting, money, num, relativeTime } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { setId } = await params;
  const { welcome } = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const [{ data: dashboardRaw }, { data: myDepartments }] = await Promise.all([
    supabase.rpc("set_dashboard", { p_set_id: setId, p_department_id: ws.primaryDepartmentId }),
    supabase
      .from("department_memberships")
      .select("department_id, role, set_departments(id, name, color, member_count)")
      .eq("membership_id", ws.membershipId)
      .eq("status", "active"),
  ]);

  const d = (dashboardRaw ?? {}) as Partial<DashboardData>;
  const admin = isAdmin(ws);
  const canSeeMoney = can(ws, "finance.view");
  const firstName = ws.profile.first_name ?? "there";

  type DeptRef = { id: string; name: string; color: string | null; member_count: number };
  const departments = (myDepartments ?? [])
    .map((m) => {
      const raw = m.set_departments as unknown;
      const dep = (Array.isArray(raw) ? raw[0] : raw) as DeptRef | null;
      return dep ? { role: m.role as string, ...dep } : null;
    })
    .filter((x): x is DeptRef & { role: string } => Boolean(x?.id));

  return (
    <div className="mx-auto max-w-[76rem]">
      {welcome ? (
        <div className="card-brand animate-pop mb-6 flex flex-wrap items-center gap-4 p-5">
          <IconSparkle size={26} className="shrink-0 text-white" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold text-white">
              Welcome to {ws.set.institution.name} — {ws.set.name}
            </p>
            <p className="mt-0.5 text-sm text-white/80">
              Say hello in #general, then complete your set profile so classmates can find you.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/s/${setId}/chat`} className="btn btn-sm bg-white text-[var(--color-brand-deep)] hover:bg-white/90">
              Open chat
            </Link>
            <Link href={`/s/${setId}/settings/profile`} className="btn btn-sm border-white/40 text-white hover:bg-white/10">
              My set profile
            </Link>
          </div>
        </div>
      ) : null}

      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-rise">
          <p className="t-eyebrow">{greeting()}</p>
          <h1 className="t-h1 mt-1.5">{firstName}</h1>
          <p className="mt-2 text-[0.95rem] text-[var(--color-muted)]">
            {ws.set.institution.name} · {ws.set.name}
            {ws.myDepartments.length ? ` · ${ws.myDepartments[0].name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/s/${setId}/people`} className="btn btn-ghost btn-sm">Member directory</Link>
          {admin ? (
            <Link href={`/s/${setId}/admin/invites`} className="btn btn-primary btn-sm">
              <Icon name="user-plus" size={15} /> Invite members
            </Link>
          ) : null}
        </div>
      </header>

      {/* Stat row */}
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Members" value={num(d.member_count ?? 0)} icon="people" tone="brand"
          sub={d.new_members_30d ? `${d.new_members_30d} joined this month` : "Your set directory"}
          href={`/s/${setId}/people`}
        />
        <StatTile
          label="Your outstanding dues"
          value={money(d.my_outstanding ?? 0, ws.set.currency)}
          icon="wallet"
          tone={Number(d.my_outstanding ?? 0) > 0 ? "caution" : "positive"}
          sub={Number(d.my_outstanding ?? 0) > 0 ? "Tap to settle up" : "You are fully paid up"}
          href={`/s/${setId}/finances/my-dues`}
        />
        <StatTile
          label={canSeeMoney ? "Set balance" : "Unread messages"}
          value={canSeeMoney ? compactMoney(d.balance ?? 0, ws.set.currency) : num(d.unread_messages ?? 0)}
          icon={canSeeMoney ? "finance" : "chat"}
          tone={canSeeMoney ? "positive" : "info"}
          sub={canSeeMoney ? `${pctLabel(d.collection_rate)} dues collected` : "Across your channels"}
          href={canSeeMoney ? `/s/${setId}/finances` : `/s/${setId}/chat`}
        />
        <StatTile
          label={ws.set.departments_enabled ? "Departments" : "Active projects"}
          value={num(ws.set.departments_enabled ? d.department_count ?? 0 : d.projects?.length ?? 0)}
          icon={ws.set.departments_enabled ? "department" : "project"}
          tone="info"
          sub={ws.set.departments_enabled ? "Closed sub-communities" : "School-wide"}
          href={ws.set.departments_enabled ? `/s/${setId}/departments` : `/s/${setId}/projects`}
        />
      </div>

      {/* Admin pending tasks */}
      {admin && (d.pending_members ?? 0) > 0 ? (
        <Card className="mt-6 border-[var(--color-caution)]/40 bg-[var(--color-caution-soft)]">
          <div className="flex flex-wrap items-center gap-4">
            <Icon name="clock" size={22} className="shrink-0 text-[var(--color-caution)]" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold text-[var(--color-ink)]">
                {d.pending_members} membership {d.pending_members === 1 ? "request is" : "requests are"} waiting
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">
                People cannot see the set until an administrator approves them.
              </p>
            </div>
            <Link href={`/s/${setId}/admin/members?status=pending`} className="btn btn-ink btn-sm">
              Review requests
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="min-w-0 space-y-6">
          {/* What's next */}
          <section>
            <SectionHeader
              title="What's happening next"
              hint="Events, elections, polls and deadlines in one feed"
              href={`/s/${setId}/calendar`}
              linkLabel="Full calendar"
            />
            {d.calendar?.length ? (
              <ul className="stagger space-y-2">
                {d.calendar.slice(0, 5).map((c) => (
                  <li key={`${c.source_type}-${c.source_id}`}>
                    <Link href={c.href ?? "#"} className="card card-hover flex items-center gap-4 p-4">
                      <span
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-md)] text-white"
                        style={{ background: c.color ?? "var(--color-brand)" }}
                      >
                        <Icon name={c.icon ?? "calendar"} size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[0.95rem] font-semibold">{c.title}</p>
                        <p className="truncate text-sm text-[var(--color-muted)]">
                          {c.subtitle ? `${c.subtitle} · ` : ""}
                          {formatDate(c.starts_at)} · {formatTime(c.starts_at)}
                        </p>
                      </div>
                      <span className="chip shrink-0">{relativeTime(c.starts_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="calendar"
                title="Nothing on the calendar yet"
                description="Events, elections, quizzes and dues deadlines all land here once they exist."
                action={
                  can(ws, "events.create") ? (
                    <Link href={`/s/${setId}/events/new`} className="btn btn-primary btn-sm">Create an event</Link>
                  ) : undefined
                }
              />
            )}
          </section>

          {/* Announcements */}
          <section>
            <SectionHeader
              title="Announcements"
              href={`/s/${setId}/community/announcements`}
            />
            {d.announcements?.length ? (
              <ul className="space-y-2">
                {d.announcements.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/s/${setId}/community/announcements#${a.id}`}
                      className="card card-hover flex items-start gap-3.5 p-4"
                    >
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
                        <IconMegaphone size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-[0.94rem] font-semibold">{a.title}</p>
                          {a.is_pinned ? <Badge icon="pin">Pinned</Badge> : null}
                          {a.priority === "urgent" ? <Badge tone="critical">Urgent</Badge> : null}
                        </div>
                        {a.summary ? (
                          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{a.summary}</p>
                        ) : null}
                        <p className="mt-1.5 text-xs text-[var(--color-subtle)]">
                          {relativeTime(a.publish_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="megaphone" title="No announcements yet" description="Official notices from your executives will show up here." />
            )}
          </section>

          {/* Projects */}
          {d.projects?.length ? (
            <section>
              <SectionHeader title="School projects" hint="Funded across every participating set" href={`/s/${setId}/projects`} />
              <div className="grid gap-3 sm:grid-cols-2">
                {d.projects.map((p) => (
                  <Link key={p.id} href={`/s/${setId}/projects/${p.id}`} className="card card-hover p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-display text-[0.96rem] font-semibold leading-snug">{p.title}</p>
                      <Badge tone={p.status === "completed" ? "positive" : "info"}>{p.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="tabular mt-3 font-display text-xl font-semibold">
                      {compactMoney(p.raised_amount, p.currency)}
                      <span className="ml-1.5 text-sm font-normal text-[var(--color-subtle)]">
                        of {compactMoney(p.estimated_cost, p.currency)}
                      </span>
                    </p>
                    <div className="mt-3">
                      <Progress value={Number(p.funded_pct)} tone="positive" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-6">
          {departments.length ? (
            <Card>
              <SectionHeader title="Your departments" href={`/s/${setId}/departments`} linkLabel="Browse all" />
              <ul className="space-y-2">
                {departments.map((dep) => (
                  <li key={dep.id}>
                    <Link
                      href={`/s/${setId}/departments/${dep.id}`}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] p-3 transition hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)]"
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-white"
                        style={{ background: dep.color ?? "var(--color-brand)" }}
                      >
                        <IconDepartment size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{dep.name}</p>
                        <p className="text-xs text-[var(--color-subtle)]">{dep.member_count} members</p>
                      </div>
                      {dep.role !== "member" ? <Badge tone="plum">{dep.role}</Badge> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : ws.set.departments_enabled ? (
            <Card>
              <p className="font-display text-sm font-semibold">Join your department</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
                Departments are closed communities inside this set — private channels, their own
                announcements and their own dues.
              </p>
              <Link href={`/s/${setId}/departments`} className="btn btn-soft btn-sm mt-4 w-full">
                Browse departments
              </Link>
            </Card>
          ) : null}

          {/* Governance */}
          {(d.active_elections?.length ?? 0) + (d.open_polls?.length ?? 0) > 0 ? (
            <Card>
              <SectionHeader title="Your vote is needed" />
              <ul className="space-y-2.5">
                {d.active_elections?.map((e) => (
                  <li key={e.id} className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug">{e.title}</p>
                      <Badge tone={e.has_voted ? "positive" : "caution"}>
                        {e.has_voted ? "Voted" : e.stage}
                      </Badge>
                    </div>
                    {e.voting_closes_at ? (
                      <p className="mt-1 text-xs text-[var(--color-subtle)]">
                        Closes {formatDate(e.voting_closes_at)}
                      </p>
                    ) : null}
                    <Link href={`/s/${setId}/elections/${e.id}`} className="btn btn-soft btn-sm mt-2.5 w-full">
                      {e.has_voted ? "View election" : "Cast your vote"}
                    </Link>
                  </li>
                ))}
                {d.open_polls?.map((p) => (
                  <li key={p.id} className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug">{p.question}</p>
                      <Badge tone={p.has_voted ? "positive" : "brand"}>
                        {p.has_voted ? "Voted" : `${p.vote_count} votes`}
                      </Badge>
                    </div>
                    <Link href={`/s/${setId}/community/polls/${p.id}`} className="btn btn-soft btn-sm mt-2.5 w-full">
                      {p.has_voted ? "See results" : "Vote now"}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {/* Money snapshot */}
          {canSeeMoney ? (
            <Card>
              <SectionHeader title="Money at a glance" href={`/s/${setId}/finances`} />
              <Donut
                size={148}
                thickness={20}
                centerValue={compactMoney(d.balance ?? 0, ws.set.currency)}
                centerLabel="balance"
                data={[
                  { label: "Income", value: Number(d.total_income ?? 0), color: "var(--color-brand)" },
                  { label: "Expenses", value: Number(d.total_expense ?? 0), color: "var(--color-plum)" },
                ]}
              />
              <dl className="mt-5 space-y-2.5 border-t border-[var(--color-line)] pt-4 text-sm">
                <Row label="Outstanding dues" value={money(d.outstanding_total ?? 0, ws.set.currency)} />
                <Row label="Collection rate" value={pctLabel(d.collection_rate)} />
              </dl>
              <Link href={`/s/${setId}/finances/reports`} className="btn btn-ghost btn-sm mt-4 w-full">
                <Icon name="download" size={15} /> Export financials
              </Link>
            </Card>
          ) : null}

          {/* Activity */}
          <Card>
            <SectionHeader title="Recent activity" />
            {d.activity?.length ? (
              <ul className="space-y-3.5">
                {d.activity.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Avatar name={a.actor} src={a.avatar_url} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        <span className="font-semibold">{a.actor ?? "Someone"}</span>{" "}
                        <span className="text-[var(--color-muted)]">{a.verb}</span>
                        {a.object_label ? <span className="font-medium"> {a.object_label}</span> : null}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-subtle)]">{relativeTime(a.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-[var(--color-subtle)]">
                Activity from your set will appear here.
              </p>
            )}
          </Card>

          <Link href={`/s/${setId}/resources/albums`} className="card card-hover flex items-center gap-3.5 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-plum-soft)] text-[var(--color-plum)]">
              <Icon name="photo" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold">Throwback albums</p>
              <p className="text-xs text-[var(--color-muted)]">Graduation, reunions, school visits</p>
            </div>
            <IconArrow size={17} className="shrink-0 text-[var(--color-subtle)]" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="tabular font-semibold">{value}</dd>
    </div>
  );
}

function pctLabel(v: number | undefined) {
  return `${Number(v ?? 0).toFixed(0)}%`;
}
