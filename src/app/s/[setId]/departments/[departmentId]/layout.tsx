import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Badge } from "@/components/ui";
import { IconDepartment, IconLock } from "@/components/icons";
import { DepartmentTabs } from "@/components/departments/department-tabs";
import { JoinDepartmentButton } from "@/components/departments/join-department-button";

export default async function DepartmentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ setId: string; departmentId: string }>;
}) {
  const { setId, departmentId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: department } = await supabase
    .from("set_departments")
    .select("id, name, short_name, description, color, member_count, join_policy, is_visible_to_set, faculty_id")
    .eq("id", departmentId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!department) notFound();

  const isMember = ws.myDepartments.some((d) => d.id === departmentId);
  const isDeptAdmin = ws.departmentAdminIds.includes(departmentId);

  return (
    <div className="mx-auto max-w-[76rem]">
      <Link href={`/s/${setId}/departments`} className="btn btn-quiet btn-sm mb-4">
        ← All departments
      </Link>

      <header className="card overflow-hidden p-0">
        <div
          className="relative h-24"
          style={{
            background: `linear-gradient(130deg, ${department.color ?? "#0898A0"} 0%, var(--color-brand-deep) 100%)`,
          }}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/12 blur-2xl" />
        </div>
        <div className="px-5 pb-5 sm:px-7 sm:pb-6">
          <div className="-mt-9 flex flex-wrap items-end gap-4">
            <span
              className="grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-[var(--radius-lg)] text-white ring-4 ring-[var(--color-surface)]"
              style={{ background: department.color ?? "var(--color-brand)" }}
            >
              <IconDepartment size={30} />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="t-h2 truncate">{department.name}</h1>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                {ws.set.institution.short_name ?? ws.set.institution.name} · {ws.set.name}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <Badge icon="people">{department.member_count} members</Badge>
              {isDeptAdmin ? <Badge tone="plum" icon="shield">Department admin</Badge> : null}
              {!isMember ? (
                <div className="w-48">
                  <JoinDepartmentButton departmentId={departmentId} setId={setId} name="department" />
                </div>
              ) : null}
            </div>
          </div>

          {department.description ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-2)]">
              {department.description}
            </p>
          ) : null}
        </div>
      </header>

      {isMember ? (
        <>
          <DepartmentTabs setId={setId} departmentId={departmentId} />
          <div className="mt-6">{children}</div>
        </>
      ) : (
        <div className="card mt-6 flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
            <IconLock size={26} />
          </span>
          <h2 className="t-h3">This is a closed community</h2>
          <p className="max-w-md text-sm leading-relaxed text-[var(--color-muted)]">
            {department.name} keeps its own channels, announcements, events and dues private to its
            members. Join the department to see inside — you keep full access to the set-wide space
            either way.
          </p>
          <div className="mt-2 w-full max-w-xs">
            <JoinDepartmentButton departmentId={departmentId} setId={setId} name={department.name} />
          </div>
        </div>
      )}
    </div>
  );
}
