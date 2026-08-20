import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { IconDepartment, IconLock, IconPlus, IconSearch } from "@/components/icons";
import { JoinDepartmentButton } from "@/components/departments/join-department-button";
import { slugify } from "@/lib/slug";

export const metadata = { title: "Departments" };
export const dynamic = "force-dynamic";

export default async function DepartmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ q?: string; faculty?: string }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const myIds = new Set(ws.myDepartments.map((d) => d.id));
  const canCreate = can(ws, "departments.create");

  const { data: faculties } = await supabase
    .from("institution_faculties")
    .select("id, name")
    .eq("institution_id", ws.set.institution.id)
    .order("name");

  const facultyName = new Map((faculties ?? []).map((f) => [f.id, f.name]));

  const departments = ws.departments.filter((d) => {
    if (sp.faculty && d.faculty_id !== sp.faculty) return false;
    if (sp.q && !d.name.toLowerCase().includes(sp.q.toLowerCase())) return false;
    return true;
  });

  async function createDepartment(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);
    if (!can(workspace, "departments.create")) return;

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    await supabase.from("set_departments").insert({
      set_id: setId,
      name,
      slug: slugify(name),
      description: String(formData.get("description") ?? "").trim() || null,
      created_by: workspace.userId,
    });

    redirect(`/s/${setId}/departments`);
  }

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Departments"
        description="Each department is a closed community inside this set — its own channels, announcements, events and dues — while set-wide space stays shared by everyone."
      />

      {!ws.set.departments_enabled ? (
        <EmptyState
          icon="department"
          title="Departments are switched off for this set"
          description="Secondary school sets usually do not need them. An administrator can enable departments in set settings."
          action={
            can(ws, "settings.manage") ? (
              <Link href={`/s/${setId}/settings`} className="btn btn-primary btn-sm">Open set settings</Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Card className="!p-4">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">
                Departments
              </p>
              <p className="tabular mt-1.5 font-display text-2xl font-semibold">{ws.departments.length}</p>
            </Card>
            <Card className="!p-4">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">
                You belong to
              </p>
              <p className="tabular mt-1.5 font-display text-2xl font-semibold">{ws.myDepartments.length}</p>
            </Card>
            <Card className="!p-4">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">
                You administer
              </p>
              <p className="tabular mt-1.5 font-display text-2xl font-semibold">{ws.departmentAdminIds.length}</p>
            </Card>
          </div>

          <form className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <IconSearch size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
              <input name="q" defaultValue={sp.q ?? ""} placeholder="Search departments…" className="field pl-11" />
            </div>
            {faculties?.length ? (
              <select name="faculty" defaultValue={sp.faculty ?? ""} className="field sm:w-64" aria-label="Faculty">
                <option value="">All faculties</option>
                {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            ) : null}
            <button className="btn btn-primary btn-sm">Filter</button>
          </form>

          {ws.myDepartments.length ? (
            <section className="mb-8">
              <h2 className="t-h3 mb-3">Your departments</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ws.myDepartments.map((d) => (
                  <Link
                    key={d.id}
                    href={`/s/${setId}/departments/${d.id}`}
                    className="card card-hover flex items-center gap-3.5 p-5"
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] text-white"
                      style={{ background: d.color ?? "var(--color-brand)" }}
                    >
                      <IconDepartment size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[0.98rem] font-semibold">{d.name}</p>
                      <p className="text-sm text-[var(--color-muted)]">{d.member_count} members</p>
                    </div>
                    {ws.departmentAdminIds.includes(d.id) ? <Badge tone="plum" icon="shield">Admin</Badge> : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="t-h3 mb-3">
              {ws.myDepartments.length ? "All departments in this set" : "Choose your department"}
            </h2>
            {departments.length === 0 ? (
              <EmptyState
                icon="department"
                title="No departments match"
                description="Try a different search, or ask an administrator to add the department."
              />
            ) : (
              <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {departments.map((d) => {
                  const mine = myIds.has(d.id);
                  return (
                    <article key={d.id} className="card flex flex-col p-5">
                      <div className="flex items-start gap-3.5">
                        <span
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] font-display text-sm font-bold text-white"
                          style={{ background: d.color ?? "var(--color-brand)" }}
                        >
                          {d.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-display text-[0.98rem] font-semibold leading-snug">
                            {d.name}
                          </h3>
                          <p className="truncate text-sm text-[var(--color-muted)]">
                            {d.faculty_id ? facultyName.get(d.faculty_id) ?? "Department" : "Department"}
                          </p>
                        </div>
                      </div>

                      {d.description ? (
                        <p className="mt-3 line-clamp-2 flex-1 text-sm text-[var(--color-muted)]">{d.description}</p>
                      ) : <div className="flex-1" />}

                      <div className="mt-3.5 flex flex-wrap gap-1.5">
                        <Badge icon="people">{d.member_count} members</Badge>
                        {d.join_policy === "open" ? (
                          <Badge tone="positive">Open to join</Badge>
                        ) : (
                          <Badge tone="caution" icon="lock">Approval required</Badge>
                        )}
                      </div>

                      <div className="mt-4 border-t border-[var(--color-line)] pt-4">
                        {mine ? (
                          <Link href={`/s/${setId}/departments/${d.id}`} className="btn btn-soft btn-sm w-full">
                            Open community
                          </Link>
                        ) : (
                          <JoinDepartmentButton departmentId={d.id} setId={setId} name={d.name} />
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {canCreate ? (
            <section className="mt-10">
              <h2 className="t-h3 mb-1">Add a department</h2>
              <p className="mb-4 text-sm text-[var(--color-muted)]">
                Creating one automatically sets up its private channels and department roles.
              </p>
              <form action={createDepartment} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="field-label" htmlFor="name">Department name</label>
                  <input id="name" name="name" required className="field" placeholder="Computer Science" />
                </div>
                <div className="min-w-0 flex-1">
                  <label className="field-label" htmlFor="description">Short description</label>
                  <input id="description" name="description" className="field" placeholder="Optional" />
                </div>
                <button className="btn btn-primary shrink-0">
                  <IconPlus size={16} /> Create
                </button>
              </form>
            </section>
          ) : (
            <p className="mt-8 flex items-center gap-2 text-sm text-[var(--color-subtle)]">
              <IconLock size={15} /> Only set administrators can create departments.
            </p>
          )}
        </>
      )}
    </div>
  );
}
