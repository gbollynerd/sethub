import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { IconShield, IconLock } from "@/components/icons";
import { first } from "@/lib/rows";

export const metadata = { title: "Roles & permissions" };
export const dynamic = "force-dynamic";

export default async function RolesPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  if (!can(ws, "roles.manage") && !can(ws, "roles.assign")) redirect(`/s/${setId}`);

  const [{ data: roles }, { data: permissions }, { data: holders }] = await Promise.all([
    supabase
      .from("set_roles")
      .select("id, key, name, description, color, permissions, is_system, is_owner_role, rank, department_id, set_departments ( name )")
      .eq("set_id", setId)
      .order("rank"),
    supabase.from("permissions").select("key, category, label, dept_scoped, sort_order").order("sort_order"),
    supabase
      .from("member_roles")
      .select("id, role_id, status, set_memberships ( id, profiles ( display_name, avatar_url ) )")
      .eq("status", "accepted")
      .limit(400),
  ]);

  const byRole = new Map<string, Array<{ id: string; name: string; avatar: string | null; membershipId: string }>>();
  for (const h of holders ?? []) {
    const sm = first(h.set_memberships) as { id: string; profiles: unknown } | null;
    const p = first(sm?.profiles as { display_name: string | null; avatar_url: string | null }) as
      | { display_name: string | null; avatar_url: string | null }
      | null;
    const key = h.role_id as string;
    byRole.set(key, [
      ...(byRole.get(key) ?? []),
      { id: h.id as string, name: p?.display_name ?? "Member", avatar: p?.avatar_url ?? null, membershipId: sm?.id ?? "" },
    ]);
  }

  const categories = Array.from(new Set((permissions ?? []).map((p) => p.category)));
  const setRoles = (roles ?? []).filter((r) => !r.department_id);
  const deptRoles = (roles ?? []).filter((r) => r.department_id);

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Roles & permissions"
        description="Being on the EXCO and holding a permission are two different things. A treasurer needs the money permissions; a communications volunteer might need the channel ones without holding office at all."
      />

      <Card className="mb-6 !bg-[var(--color-surface-2)]">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: "Owner", d: "Exactly one person. Full control, and the only one who can transfer ownership." },
            { t: "EXCO", d: "Elected or appointed office. Ceremonial and real — but it grants nothing by itself." },
            { t: "Roles", d: "The grants that actually gate the software. Assign as many as you need." },
          ].map((x) => (
            <div key={x.t}>
              <p className="flex items-center gap-2 font-display text-sm font-semibold">
                <IconShield size={15} className="text-[var(--color-brand)]" /> {x.t}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{x.d}</p>
            </div>
          ))}
        </div>
      </Card>

      <section className="mb-9">
        <SectionHeader title="Set-wide roles" hint="Apply everywhere in this community" />
        {setRoles.length === 0 ? (
          <EmptyState icon="shield" title="No roles defined" />
        ) : (
          <div className="stagger grid gap-3 lg:grid-cols-2">
            {setRoles.map((r) => {
              const people = byRole.get(r.id) ?? [];
              return (
                <article key={r.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-white"
                        style={{ background: r.color ?? "var(--color-brand)" }}
                      >
                        <IconShield size={17} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-[0.98rem] font-semibold">{r.name}</h3>
                          {r.is_owner_role ? <Badge tone="brand">Owner</Badge> : null}
                          {r.is_system ? <Badge>Template</Badge> : <Badge tone="plum">Custom</Badge>}
                        </div>
                        {r.description ? (
                          <p className="mt-1 text-sm text-[var(--color-muted)]">{r.description}</p>
                        ) : null}
                      </div>
                    </div>
                    <Badge>{r.permissions.length} perms</Badge>
                  </div>

                  {people.length ? (
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      {people.slice(0, 6).map((p) => (
                        <Link key={p.id} href={`/s/${setId}/people/${p.membershipId}`} title={p.name}>
                          <Avatar name={p.name} src={p.avatar} size={28} ring />
                        </Link>
                      ))}
                      {people.length > 6 ? (
                        <span className="chip px-2">+{people.length - 6}</span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-[var(--color-subtle)]">Nobody holds this role yet.</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--color-line)] pt-4">
                    {r.permissions.slice(0, 6).map((p: string) => (
                      <span key={p} className="chip px-2 py-0.5 text-[0.64rem]">
                        {(permissions ?? []).find((x) => x.key === p)?.label ?? p}
                      </span>
                    ))}
                    {r.permissions.length > 6 ? (
                      <span className="chip px-2 py-0.5 text-[0.64rem]">
                        +{r.permissions.length - 6} more
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {deptRoles.length ? (
        <section className="mb-9">
          <SectionHeader title="Department roles" hint="Only apply inside their own department" />
          <div className="grid gap-3 lg:grid-cols-2">
            {deptRoles.map((r) => {
              const dept = first(r.set_departments) as { name: string } | null;
              const people = byRole.get(r.id) ?? [];
              return (
                <article key={r.id} className="card flex items-center gap-3.5 p-4">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-white"
                    style={{ background: r.color ?? "var(--color-plum)" }}
                  >
                    <IconLock size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <p className="truncate text-xs text-[var(--color-subtle)]">
                      {dept?.name ?? "Department"} · {r.permissions.length} permissions
                    </p>
                  </div>
                  <Badge>{people.length} holders</Badge>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="Permission catalogue"
          hint="Everything the platform can gate, grouped the way a set thinks about it"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Card key={cat} className="!p-4">
              <p className="t-eyebrow mb-2.5">{cat}</p>
              <ul className="space-y-1.5">
                {(permissions ?? [])
                  .filter((p) => p.category === cat)
                  .map((p) => (
                    <li key={p.key} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
                      <span className="min-w-0">
                        <span className="block leading-snug">{p.label}</span>
                        {p.dept_scoped ? (
                          <span className="text-[0.66rem] text-[var(--color-subtle)]">
                            can be granted per department
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
