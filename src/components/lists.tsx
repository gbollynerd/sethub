import Link from "next/link";
import { Badge, EmptyState, Progress } from "@/components/ui";
import { IconGlobe, IconMegaphone } from "@/components/icons";
import { formatDate, formatTime, money, relativeTime } from "@/lib/format";
import { SendDuesRemindersButton } from "@/components/finance/send-dues-reminders-button";

/* Shared list renderers used by both set-level and department-level pages. */

export interface AnnouncementItem {
  id: string;
  title: string;
  summary: string | null;
  body?: string | null;
  priority: string;
  publish_at: string;
  is_pinned: boolean;
  department?: { name: string; color: string | null } | null;
  author?: string | null;
}

export function AnnouncementList({ items, emptyHint }: { items: AnnouncementItem[]; emptyHint?: string }) {
  if (!items.length) {
    return (
      <EmptyState
        icon="megaphone"
        title="No announcements yet"
        description={emptyHint ?? "Official notices from your executives will appear here."}
      />
    );
  }

  return (
    <ul className="stagger space-y-3">
      {items.map((a) => (
        <li key={a.id} id={a.id} className="card p-5">
          <div className="flex items-start gap-3.5">
            <span
              className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                a.priority === "urgent"
                  ? "bg-[var(--color-critical-soft)] text-[var(--color-critical)]"
                  : "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]"
              }`}
            >
              <IconMegaphone size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[1rem] font-semibold leading-snug">{a.title}</h3>
                {a.is_pinned ? <Badge icon="pin">Pinned</Badge> : null}
                {a.priority === "urgent" ? <Badge tone="critical">Urgent</Badge> : null}
                {a.priority === "high" ? <Badge tone="caution">Important</Badge> : null}
                {a.department ? <Badge tone="plum">{a.department.name}</Badge> : null}
              </div>
              {a.summary || a.body ? (
                <p className="mt-2 whitespace-pre-wrap text-[0.93rem] leading-relaxed text-[var(--color-ink-2)]">
                  {a.summary ?? a.body}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-[var(--color-subtle)]">
                {a.author ? `${a.author} · ` : ""}
                {formatDate(a.publish_at)} · {relativeTime(a.publish_at)}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location_name: string | null;
  is_virtual: boolean;
  category: string;
  going_count: number;
  department?: { name: string } | null;
}

export function EventList({ setId, items }: { setId: string; items: EventItem[] }) {
  if (!items.length) {
    return (
      <EmptyState
        icon="calendar"
        title="Nothing scheduled"
        description="AGMs, reunions, trivia nights and committee meetings all live here."
      />
    );
  }

  return (
    <ul className="stagger space-y-3">
      {items.map((e) => (
        <li key={e.id}>
          <Link href={`/s/${setId}/events/${e.id}`} className="card card-hover flex flex-wrap items-center gap-4 p-4 sm:p-5">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-center">
              <span className="font-display leading-none text-[var(--color-brand-deep)]">
                <span className="block text-[1.35rem] font-semibold">
                  {formatDate(e.starts_at, { day: "numeric" })}
                </span>
                <span className="mt-1 block text-[0.68rem] font-bold uppercase tracking-[0.08em]">
                  {new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Africa/Lagos" }).format(
                    new Date(e.starts_at),
                  )}
                </span>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-display text-[1rem] font-semibold">{e.title}</h3>
                <Badge>{e.category.replace(/_/g, " ")}</Badge>
                {e.department ? <Badge tone="plum">{e.department.name}</Badge> : null}
              </div>
              <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
                {formatTime(e.starts_at)}
                {e.location_name ? ` · ${e.location_name}` : ""}
                {e.is_virtual ? " · Online" : ""}
              </p>
              {e.description ? (
                <p className="mt-1.5 line-clamp-1 text-sm text-[var(--color-subtle)]">{e.description}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {e.is_virtual ? <IconGlobe size={16} className="text-[var(--color-info)]" /> : null}
              <Badge tone="positive" icon="people">{e.going_count} going</Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export interface DuesItem {
  id: string;
  title: string;
  period_label: string | null;
  amount: number;
  currency: string;
  due_date: string | null;
  frequency: string;
  assigned_count: number;
  paid_count: number;
  expected_total: number;
  collected_total: number;
  department?: { name: string } | null;
}

export function DuesList({ setId, items, manage }: { setId: string; items: DuesItem[]; manage?: boolean }) {
  if (!items.length) {
    return (
      <EmptyState
        icon="wallet"
        title="No dues created yet"
        description="Dues, levies and one-off contributions are set up by the financial secretary."
      />
    );
  }

  return (
    <ul className="stagger space-y-3">
      {items.map((d) => {
        const expected = Number(d.expected_total);
        const collected = Number(d.collected_total);
        const rate = expected > 0 ? (collected / expected) * 100 : 0;
        const overdue = d.due_date ? new Date(d.due_date) < new Date() && rate < 100 : false;

        return (
          <li key={d.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-[1rem] font-semibold">{d.title}</h3>
                  <Badge>{d.frequency.replace(/_/g, " ")}</Badge>
                  {d.department ? <Badge tone="plum">{d.department.name}</Badge> : null}
                  {overdue ? <Badge tone="critical">Overdue</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {d.period_label ? `${d.period_label} · ` : ""}
                  {money(d.amount, d.currency)} per member
                  {d.due_date ? ` · due ${formatDate(d.due_date)}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="tabular font-display text-lg font-semibold">
                  {money(collected, d.currency)}
                </p>
                <p className="text-xs text-[var(--color-subtle)]">of {money(expected, d.currency)}</p>
              </div>
            </div>

            <div className="mt-4">
              <Progress
                value={rate}
                tone={rate >= 90 ? "positive" : rate >= 50 ? "brand" : "caution"}
                label={`${d.paid_count} of ${d.assigned_count} members paid`}
              />
            </div>

            {manage ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-4">
                <Link href={`/s/${setId}/finances/dues/${d.id}`} className="btn btn-ghost btn-sm">
                  View ledger
                </Link>
                <SendDuesRemindersButton duesId={d.id} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
