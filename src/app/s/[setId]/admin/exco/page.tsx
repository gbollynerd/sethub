import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { IconTrophy } from "@/components/icons";
import { first } from "@/lib/rows";
import { formatDate } from "@/lib/format";
import { ExcoManager } from "@/components/admin/exco-manager";

export const metadata = { title: "EXCO" };
export const dynamic = "force-dynamic";

export default async function ExcoPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const canManageTerms = can(ws, "exco.manage_terms");
  const canAssign = can(ws, "exco.assign");

  const [{ data: terms }, { data: appointments }, { data: positions }, { data: memberRows }] = await Promise.all([
    supabase.from("exco_terms").select("id, name, starts_on, ends_on, is_current").eq("set_id", setId).order("starts_on", { ascending: false }),
    supabase
      .from("exco_appointments")
      .select(
        "id, status, term_id, position_id, created_at, exco_positions ( name, rank ), set_memberships ( id, nickname, profiles!set_memberships_user_id_fkey ( display_name, avatar_url ) )",
      )
      .neq("status", "removed")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("exco_positions").select("id, name, rank, seats").eq("set_id", setId).order("rank"),
    canAssign
      ? supabase
          .from("set_memberships")
          .select("id, profiles!set_memberships_user_id_fkey ( display_name, avatar_url )")
          .eq("set_id", setId)
          .eq("status", "active")
          .limit(400)
      : Promise.resolve({ data: [] as Array<{ id: string; profiles: unknown }> }),
  ]);

  const current = (terms ?? []).find((t) => t.is_current);
  const byTerm = new Map<string, typeof appointments>();
  for (const a of appointments ?? []) {
    const key = a.term_id as string;
    byTerm.set(key, [...(byTerm.get(key) ?? []), a]);
  }

  const render = (rows: typeof appointments) =>
    (rows ?? [])
      .map((a) => {
        const pos = first(a.exco_positions) as { name: string; rank: number } | null;
        const sm = first(a.set_memberships) as { id: string; nickname: string | null; profiles: unknown } | null;
        const p = first(sm?.profiles as { display_name: string | null; avatar_url: string | null }) as
          | { display_name: string | null; avatar_url: string | null }
          | null;
        return {
          id: a.id as string,
          status: a.status as string,
          positionId: a.position_id as string,
          position: pos?.name ?? "Position",
          rank: pos?.rank ?? 999,
          membershipId: sm?.id ?? "",
          name: p?.display_name ?? "Member",
          avatar: p?.avatar_url ?? null,
        };
      })
      .sort((x, y) => x.rank - y.rank);

  const currentExco = render(byTerm.get(current?.id ?? "") ?? []);
  const memberOptions = (memberRows ?? []).map((m) => {
    const p = first(m.profiles as { display_name: string | null; avatar_url: string | null }) as
      | { display_name: string | null; avatar_url: string | null }
      | null;
    return { id: m.id as string, name: p?.display_name ?? "Member", avatar: p?.avatar_url ?? null };
  });

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Executive committee"
        description="Who holds office, who held it before, and which positions are still vacant. EXCO office and system permissions are deliberately separate — see Roles."
        action={
          canAssign ? (
            <Link href={`/s/${setId}/admin/roles`} className="btn btn-ghost btn-sm">Manage permissions</Link>
          ) : undefined
        }
      />

      {current ? (
        <section className="mb-9">
          <SectionHeader title={current.name} hint={`In office since ${formatDate(current.starts_on)}`} />
          {currentExco.length === 0 ? (
            <EmptyState
              icon="trophy"
              title="No EXCO appointed yet"
              description="Run an election, or appoint the executive directly if your set works that way."
              action={
                can(ws, "elections.create") ? (
                  <Link href={`/s/${setId}/elections`} className="btn btn-primary btn-sm">Go to elections</Link>
                ) : undefined
              }
            />
          ) : (
            <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currentExco.map((e) => (
                <Link key={e.id} href={`/s/${setId}/people/${e.membershipId}`} className="card card-hover flex items-center gap-3.5 p-5">
                  <Avatar name={e.name} src={e.avatar} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[0.96rem] font-semibold">{e.name}</p>
                    <p className="truncate text-sm text-[var(--color-brand-dark)]">{e.position}</p>
                  </div>
                  {e.status !== "accepted" ? <Badge tone="caution">{e.status}</Badge> : null}
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Positions" hint="The offices this set recognises" />
          {positions?.length ? (
            <ul className="space-y-2">
              {positions.map((p) => {
                const filled = currentExco.filter((e) => e.position === p.name).length;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3.5 py-2.5">
                    <span className="min-w-0 truncate text-sm font-medium">{p.name}</span>
                    <Badge tone={filled >= p.seats ? "positive" : "caution"}>
                      {filled}/{p.seats} filled
                    </Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-[var(--color-subtle)]">No positions defined.</p>
          )}
        </Card>

        <Card>
          <SectionHeader title="Previous administrations" hint="The set's leadership history" />
          {(terms ?? []).filter((t) => !t.is_current).length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-subtle)]">
              No previous terms recorded yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {(terms ?? []).filter((t) => !t.is_current).map((t) => {
                const members = render(byTerm.get(t.id) ?? []);
                return (
                  <li key={t.id}>
                    <div className="flex items-center gap-2">
                      <IconTrophy size={15} className="text-[var(--color-gold)]" />
                      <p className="font-display text-sm font-semibold">{t.name}</p>
                      <span className="text-xs text-[var(--color-subtle)]">
                        {formatDate(t.starts_on)}{t.ends_on ? ` – ${formatDate(t.ends_on)}` : ""}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 pl-6 text-sm text-[var(--color-muted)]">
                      {members.slice(0, 6).map((m) => (
                        <li key={m.id} className="truncate">
                          <span className="font-medium text-[var(--color-ink)]">{m.position}</span> — {m.name}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <ExcoManager
        setId={setId}
        currentTerm={current ? { id: current.id, name: current.name, starts_on: current.starts_on, is_current: current.is_current } : null}
        terms={(terms ?? []).map((t) => ({ id: t.id, name: t.name, starts_on: t.starts_on, is_current: t.is_current }))}
        positions={(positions ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          seats: p.seats,
          filled: currentExco.filter((e) => e.positionId === p.id).length,
        }))}
        holders={currentExco.map((e) => ({
          appointmentId: e.id,
          positionId: e.positionId,
          membershipId: e.membershipId,
          name: e.name,
          avatar: e.avatar,
          status: e.status,
        }))}
        members={memberOptions}
        canManageTerms={canManageTerms}
        canAssign={canAssign}
      />
    </div>
  );
}
