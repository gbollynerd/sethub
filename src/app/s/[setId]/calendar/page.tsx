import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatDate, formatTime, relativeTime } from "@/lib/format";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  event: "Event",
  election: "Election",
  poll: "Poll",
  quiz: "Quiz",
  dues: "Dues deadline",
  project_milestone: "Project milestone",
  meeting: "Meeting",
  announcement: "Announcement",
};

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const base = sp.month ? new Date(`${sp.month}-01T00:00:00Z`) : new Date();
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

  const { data: entries } = await supabase
    .from("calendar_entries")
    .select("id, source_type, source_id, title, subtitle, starts_at, all_day, color, icon, href, department_id")
    .eq("set_id", setId)
    .gte("starts_at", monthStart.toISOString())
    .lte("starts_at", monthEnd.toISOString())
    .order("starts_at");

  const { data: nextUp } = await supabase
    .from("calendar_entries")
    .select("id, source_type, title, subtitle, starts_at, color, icon, href")
    .eq("set_id", setId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(6);

  const byDay = new Map<number, typeof entries>();
  for (const e of entries ?? []) {
    const day = new Date(e.starts_at).getUTCDate();
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }

  const firstWeekday = (monthStart.getUTCDay() + 6) % 7; // Monday-first
  const daysInMonth = monthEnd.getUTCDate();
  const cells: Array<number | null> = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(monthStart);
  const prev = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 7);
  const today = new Date();
  const isThisMonth = today.getUTCFullYear() === year && today.getUTCMonth() === month;

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Calendar"
        description="Events, elections, polls, quizzes, dues deadlines and project milestones — one feed, so you can see what is coming next."
        action={
          <>
            <Link href={`/s/${setId}/calendar?month=${prev}`} className="btn btn-ghost btn-sm">← Previous</Link>
            <Link href={`/s/${setId}/calendar`} className="btn btn-ghost btn-sm">Today</Link>
            <Link href={`/s/${setId}/calendar?month=${next}`} className="btn btn-ghost btn-sm">Next →</Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="!p-4 sm:!p-5">
          <h2 className="t-h3 mb-4">{monthLabel}</h2>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="pb-1.5 text-[0.66rem] font-bold uppercase tracking-[0.08em] text-[var(--color-subtle)]">
                {d}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const items = byDay.get(day) ?? [];
              const isToday = isThisMonth && today.getUTCDate() === day;
              return (
                <div
                  key={day}
                  className={`min-h-[4.4rem] rounded-[var(--radius-sm)] border p-1.5 text-left transition ${
                    items.length
                      ? "border-[var(--color-line-strong)] bg-[var(--color-surface-2)]"
                      : "border-[var(--color-line)]"
                  } ${isToday ? "ring-2 ring-[var(--color-brand)]" : ""}`}
                >
                  <span
                    className={`tabular text-[0.72rem] font-bold ${
                      isToday ? "text-[var(--color-brand-deep)]" : "text-[var(--color-subtle)]"
                    }`}
                  >
                    {day}
                  </span>
                  <ul className="mt-1 space-y-0.5">
                    {items.slice(0, 2).map((e) => (
                      <li key={`${e.source_type}-${e.source_id}`}>
                        <Link
                          href={e.href ?? "#"}
                          className="block truncate rounded-[3px] px-1 py-0.5 text-[0.62rem] font-semibold text-white"
                          style={{ background: e.color ?? "var(--color-brand)" }}
                          title={e.title}
                        >
                          {e.title}
                        </Link>
                      </li>
                    ))}
                    {items.length > 2 ? (
                      <li className="px-1 text-[0.6rem] font-semibold text-[var(--color-subtle)]">
                        +{items.length - 2} more
                      </li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="t-h3 mb-3">What&apos;s next</h2>
            {nextUp?.length ? (
              <ul className="space-y-2.5">
                {nextUp.map((e) => (
                  <li key={`${e.source_type}-${e.id}`}>
                    <Link
                      href={e.href ?? "#"}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] p-3 transition hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)]"
                    >
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] text-white"
                        style={{ background: e.color ?? "var(--color-brand)" }}
                      >
                        <Icon name={e.icon ?? "calendar"} size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{e.title}</p>
                        <p className="truncate text-xs text-[var(--color-subtle)]">
                          {formatDate(e.starts_at)} · {formatTime(e.starts_at)}
                        </p>
                      </div>
                      <Badge>{relativeTime(e.starts_at)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-[var(--color-subtle)]">
                Nothing scheduled yet.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="t-h3 mb-3">This month at a glance</h2>
            {entries?.length ? (
              <ul className="space-y-2">
                {entries.map((e) => (
                  <li key={`${e.source_type}-${e.source_id}`} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: e.color ?? "var(--color-brand)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <Link href={e.href ?? "#"} className="block truncate text-sm font-medium hover:underline">
                        {e.title}
                      </Link>
                      <p className="text-xs text-[var(--color-subtle)]">
                        {SOURCE_LABEL[e.source_type] ?? e.source_type} · {formatDate(e.starts_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="calendar" title="Quiet month" description="Nothing scheduled for this month yet." />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
