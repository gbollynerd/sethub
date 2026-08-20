import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, EmptyState, SectionHeader } from "@/components/ui";
import { first } from "@/lib/rows";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Department members" };
export const dynamic = "force-dynamic";

export default async function DepartmentMembersPage({
  params,
}: {
  params: Promise<{ setId: string; departmentId: string }>;
}) {
  const { setId, departmentId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const isDeptAdmin = ws.departmentAdminIds.includes(departmentId);

  const { data: rows } = await supabase
    .from("department_memberships")
    .select(
      `id, role, status, is_primary, joined_at,
       set_memberships!left ( id, nickname, course, class_arm, was_prefect,
                         profiles!left ( display_name, avatar_url, profession ) )`,
    )
    .eq("department_id", departmentId)
    .order("role")
    .limit(300);

  const members = (rows ?? []).map((r) => {
    const sm = first(r.set_memberships) as
      | { id: string; nickname: string | null; course: string | null; class_arm: string | null; profiles: unknown }
      | null;
    const p = first(sm?.profiles as { display_name: string | null; avatar_url: string | null; profession: string | null }) as
      | { display_name: string | null; avatar_url: string | null; profession: string | null }
      | null;
    return {
      id: r.id as string,
      membershipId: sm?.id ?? "",
      role: r.role as string,
      status: r.status as string,
      joined: r.joined_at as string,
      name: p?.display_name ?? "Member",
      avatar: p?.avatar_url ?? null,
      sub: p?.profession ?? sm?.course ?? sm?.nickname ?? null,
    };
  });

  const active = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "pending");

  return (
    <div className="space-y-7">
      {isDeptAdmin && pending.length ? (
        <section>
          <SectionHeader title={`${pending.length} pending request${pending.length === 1 ? "" : "s"}`} />
          <ul className="space-y-2">
            {pending.map((m) => (
              <li key={m.id} className="card flex flex-wrap items-center gap-3 p-4">
                <Avatar name={m.name} src={m.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.name}</p>
                  <p className="text-xs text-[var(--color-subtle)]">Requested {formatDate(m.joined)}</p>
                </div>
                <Badge tone="caution">Awaiting approval</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionHeader title={`${active.length} members`} hint="Everyone inside this department community" />
        {active.length === 0 ? (
          <EmptyState icon="people" title="No members yet" description="Share a department invite link to bring your coursemates in." />
        ) : (
          <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((m) => (
              <Link key={m.id} href={`/s/${setId}/people/${m.membershipId}`} className="card card-hover flex items-center gap-3.5 p-4">
                <Avatar name={m.name} src={m.avatar} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[0.94rem] font-semibold">{m.name}</p>
                  {m.sub ? <p className="truncate text-sm text-[var(--color-muted)]">{m.sub}</p> : null}
                </div>
                {m.role !== "member" ? <Badge tone="plum">{m.role}</Badge> : null}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
