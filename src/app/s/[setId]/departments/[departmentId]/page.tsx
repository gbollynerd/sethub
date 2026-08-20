import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, Card, EmptyState, Progress, SectionHeader, StatTile } from "@/components/ui";
import { IconHash, IconMegaphone, IconLock } from "@/components/icons";
import { first } from "@/lib/rows";
import { formatDate, formatTime, money, relativeTime } from "@/lib/format";

export const metadata = { title: "Department" };
export const dynamic = "force-dynamic";

export default async function DepartmentOverviewPage({
  params,
}: {
  params: Promise<{ setId: string; departmentId: string }>;
}) {
  const { setId, departmentId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const [
    { data: channels },
    { data: announcements },
    { data: events },
    { data: dues },
    { data: members },
    { data: admins },
  ] = await Promise.all([
    supabase
      .from("channels")
      .select("id, name, topic, visibility, is_announcement, message_count, last_message_at")
      .eq("department_id", departmentId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("announcements")
      .select("id, title, summary, priority, publish_at, is_pinned")
      .eq("department_id", departmentId)
      .order("publish_at", { ascending: false })
      .limit(4),
    supabase
      .from("events")
      .select("id, title, starts_at, location_name, is_virtual, going_count")
      .eq("department_id", departmentId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(4),
    supabase
      .from("dues")
      .select("id, title, amount, currency, due_date, period_label, expected_total, collected_total")
      .eq("department_id", departmentId)
      .order("due_date", { ascending: false })
      .limit(3),
    supabase
      .from("department_memberships")
      .select("id, role, set_memberships ( id, nickname, course, profiles ( display_name, avatar_url ) )")
      .eq("department_id", departmentId)
      .eq("status", "active")
      .limit(12),
    supabase
      .from("department_memberships")
      .select("id, role, set_memberships ( id, profiles ( display_name, avatar_url ) )")
      .eq("department_id", departmentId)
      .in("role", ["admin", "coordinator"])
      .eq("status", "active"),
  ]);

  const memberCards = (members ?? []).map((m) => {
    const sm = first(m.set_memberships) as { id: string; nickname: string | null; course: string | null; profiles: unknown } | null;
    const p = first(sm?.profiles as { display_name: string | null; avatar_url: string | null }) as
      | { display_name: string | null; avatar_url: string | null }
      | null;
    return {
      key: m.id as string,
      membershipId: sm?.id ?? "",
      role: m.role as string,
      name: p?.display_name ?? "Member",
      avatar: p?.avatar_url ?? null,
      sub: sm?.nickname ?? sm?.course ?? null,
    };
  });

  const adminCards = (admins ?? []).map((m) => {
    const sm = first(m.set_memberships) as { id: string; profiles: unknown } | null;
    const p = first(sm?.profiles as { display_name: string | null; avatar_url: string | null }) as
      | { display_name: string | null; avatar_url: string | null }
      | null;
    return { key: m.id as string, membershipId: sm?.id ?? "", role: m.role as string, name: p?.display_name ?? "Member", avatar: p?.avatar_url ?? null };
  });

  const outstanding = (dues ?? []).reduce(
    (sum, d) => sum + (Number(d.expected_total) - Number(d.collected_total)),
    0,
  );

  return (
    <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Members" value={memberCards.length >= 12 ? "12+" : memberCards.length} icon="people" tone="brand" href={`/s/${setId}/departments/${departmentId}/members`} />
        <StatTile label="Channels" value={(channels ?? []).length} icon="chat" tone="info" href={`/s/${setId}/departments/${departmentId}/channels`} />
        <StatTile label="Upcoming events" value={(events ?? []).length} icon="calendar" tone="caution" href={`/s/${setId}/departments/${departmentId}/events`} />
        <StatTile
          label="Department dues outstanding"
          value={money(outstanding, ws.set.currency)}
          icon="wallet"
          tone={outstanding > 0 ? "critical" : "positive"}
          href={`/s/${setId}/departments/${departmentId}/dues`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="min-w-0 space-y-6">
          <section>
            <SectionHeader
              title="Department channels"
              hint="Private to this department"
              href={`/s/${setId}/departments/${departmentId}/channels`}
            />
            {channels?.length ? (
              <ul className="space-y-2">
                {channels.map((c) => (
                  <li key={c.id}>
                    <Link href={`/s/${setId}/chat/${c.id}`} className="card card-hover flex items-center gap-3.5 p-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
                        {c.is_announcement ? <IconMegaphone size={18} /> : <IconHash size={18} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[0.94rem] font-semibold">{c.name}</p>
                        <p className="truncate text-sm text-[var(--color-muted)]">
                          {c.topic ?? `${c.message_count} messages`}
                        </p>
                      </div>
                      {c.visibility === "private" ? <IconLock size={15} className="shrink-0 text-[var(--color-subtle)]" /> : null}
                      {c.last_message_at ? (
                        <span className="shrink-0 text-xs text-[var(--color-subtle)]">
                          {relativeTime(c.last_message_at)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="chat" title="No channels yet" description="A department admin can create the first one." />
            )}
          </section>

          <section>
            <SectionHeader
              title="Department announcements"
              href={`/s/${setId}/departments/${departmentId}/announcements`}
            />
            {announcements?.length ? (
              <ul className="space-y-2">
                {announcements.map((a) => (
                  <li key={a.id} className="card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-[0.94rem] font-semibold">{a.title}</p>
                      {a.is_pinned ? <Badge icon="pin">Pinned</Badge> : null}
                      {a.priority === "urgent" ? <Badge tone="critical">Urgent</Badge> : null}
                    </div>
                    {a.summary ? (
                      <p className="mt-1.5 line-clamp-2 text-sm text-[var(--color-muted)]">{a.summary}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-[var(--color-subtle)]">{relativeTime(a.publish_at)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="megaphone" title="Nothing announced yet" />
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          {adminCards.length ? (
            <Card>
              <SectionHeader title="Who runs this department" />
              <ul className="space-y-2.5">
                {adminCards.map((a) => (
                  <li key={a.key}>
                    <Link href={`/s/${setId}/people/${a.membershipId}`} className="flex items-center gap-3">
                      <Avatar name={a.name} src={a.avatar} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.name}</p>
                        <p className="text-xs capitalize text-[var(--color-subtle)]">{a.role}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <SectionHeader title="Coming up" href={`/s/${setId}/departments/${departmentId}/events`} />
            {events?.length ? (
              <ul className="space-y-2.5">
                {events.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/s/${setId}/events/${e.id}`}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] p-3 transition hover:border-[var(--color-line-strong)]"
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-center">
                        <span className="font-display text-xs font-bold leading-none text-[var(--color-brand-deep)]">
                          {formatDate(e.starts_at, { day: "numeric" })}
                          <br />
                          {formatDate(e.starts_at, { month: "short" }).replace(/\d|\s/g, "")}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{e.title}</p>
                        <p className="truncate text-xs text-[var(--color-subtle)]">
                          {formatTime(e.starts_at)}
                          {e.location_name ? ` · ${e.location_name}` : e.is_virtual ? " · Online" : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-5 text-center text-sm text-[var(--color-subtle)]">Nothing scheduled yet.</p>
            )}
          </Card>

          <Card>
            <SectionHeader title="Members" href={`/s/${setId}/departments/${departmentId}/members`} />
            <ul className="grid grid-cols-2 gap-2.5">
              {memberCards.slice(0, 8).map((m) => (
                <li key={m.key}>
                  <Link
                    href={`/s/${setId}/people/${m.membershipId}`}
                    className="flex items-center gap-2 rounded-[var(--radius-sm)] p-1.5 transition hover:bg-[var(--color-surface-2)]"
                  >
                    <Avatar name={m.name} src={m.avatar} size={28} />
                    <span className="truncate text-xs font-medium">{m.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {dues?.length ? (
            <Card>
              <SectionHeader title="Department dues" href={`/s/${setId}/departments/${departmentId}/dues`} />
              <ul className="space-y-3.5">
                {dues.map((d) => {
                  const expected = Number(d.expected_total);
                  const collected = Number(d.collected_total);
                  return (
                    <li key={d.id}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{d.title}</p>
                        <span className="tabular shrink-0 text-xs text-[var(--color-muted)]">
                          {money(collected, d.currency)} / {money(expected, d.currency)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <Progress value={expected > 0 ? (collected / expected) * 100 : 0} tone="positive" height={6} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
