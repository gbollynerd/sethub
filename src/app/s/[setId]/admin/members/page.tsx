import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, EmptyState, PageHeader, StatTile, Table, Td, Tr } from "@/components/ui";
import { IconCheck, IconClose, IconSearch, IconUserPlus } from "@/components/icons";
import { first } from "@/lib/rows";
import { formatDate, titleCase } from "@/lib/format";

export const metadata = { title: "Manage members" };
export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const canApprove = can(ws, "members.approve");
  const canRemove = can(ws, "members.remove");
  if (!canApprove && !canRemove && !can(ws, "members.edit_profile")) redirect(`/s/${setId}`);

  const status = sp.status ?? "active";

  let query = supabase
    .from("set_memberships")
    .select(
      `id, user_id, status, nickname, course, class_arm, student_id, joined_at, verification, is_founder,
       department_id, profiles!set_memberships_user_id_fkey ( display_name, avatar_url, email, phone ), set_departments ( name )`,
    )
    .eq("set_id", setId)
    .order("joined_at", { ascending: false })
    .limit(300);

  if (status !== "all") query = query.eq("status", status);

  const [{ data: members }, counts] = await Promise.all([
    query,
    Promise.all([
      supabase.from("set_memberships").select("id", { count: "exact", head: true }).eq("set_id", setId).eq("status", "active"),
      supabase.from("set_memberships").select("id", { count: "exact", head: true }).eq("set_id", setId).eq("status", "pending"),
      supabase.from("set_memberships").select("id", { count: "exact", head: true }).eq("set_id", setId).eq("status", "suspended"),
    ]),
  ]);

  const [activeCount, pendingCount, suspendedCount] = counts.map((c) => c.count ?? 0);

  async function updateStatus(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);
    const membershipId = String(formData.get("membership_id") ?? "");
    const next = String(formData.get("next") ?? "");

    if (!membershipId || !next) return;
    if (next === "active" && !can(workspace, "members.approve")) return;
    if (["removed", "rejected"].includes(next) && !can(workspace, "members.remove")) return;
    if (next === "suspended" && !can(workspace, "members.suspend")) return;

    await supabase
      .from("set_memberships")
      .update({
        status: next,
        approved_by: next === "active" ? workspace.userId : null,
        approved_at: next === "active" ? new Date().toISOString() : null,
      })
      .eq("id", membershipId)
      .eq("set_id", setId);

    await supabase.rpc("log_audit", {
      p_set: setId,
      p_action: `member.${next}`,
      p_entity_type: "membership",
      p_entity_id: membershipId,
      p_label: null,
      p_summary: `Membership set to ${next}`,
      p_dept: null,
      p_before: null,
      p_after: null,
    });

    revalidatePath(`/s/${setId}/admin/members`);
  }

  const rows = (members ?? [])
    .map((m) => {
      const p = first(m.profiles) as
        | { display_name: string | null; avatar_url: string | null; email: string; phone: string | null }
        | null;
      const dept = first(m.set_departments) as { name: string } | null;
      return {
        id: m.id as string,
        status: m.status as string,
        name: p?.display_name ?? "Member",
        avatar: p?.avatar_url ?? null,
        email: p?.email ?? "",
        phone: p?.phone ?? null,
        nickname: m.nickname as string | null,
        course: (m.course ?? m.class_arm) as string | null,
        studentId: m.student_id as string | null,
        joined: m.joined_at as string,
        department: dept?.name ?? null,
        verification: m.verification as string,
        isFounder: m.is_founder as boolean,
      };
    })
    .filter((r) =>
      sp.q ? r.name.toLowerCase().includes(sp.q.toLowerCase()) || r.email.toLowerCase().includes(sp.q.toLowerCase()) : true,
    );

  const tabs = [
    ["active", `Active (${activeCount})`],
    ["pending", `Pending (${pendingCount})`],
    ["suspended", `Suspended (${suspendedCount})`],
    ["all", "Everyone"],
  ] as const;

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Manage members"
        description="Approve requests, keep the directory accurate, and remove anyone who should not be here."
        action={
          <Link href={`/s/${setId}/admin/invites`} className="btn btn-primary btn-sm">
            <IconUserPlus size={15} /> Invite members
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Active" value={activeCount} icon="people" tone="brand" />
        <StatTile label="Awaiting approval" value={pendingCount} icon="clock" tone={pendingCount ? "critical" : "positive"} />
        <StatTile label="Suspended" value={suspendedCount} icon="lock" tone="caution" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map(([value, label]) => (
            <Link
              key={value}
              href={`/s/${setId}/admin/members?status=${value}`}
              className={`chip transition ${status === value ? "chip-brand" : "hover:border-[var(--color-ink)]"}`}
            >
              {label}
            </Link>
          ))}
        </div>
        <form className="relative ml-auto min-w-[14rem] flex-1 sm:max-w-xs">
          <input type="hidden" name="status" value={status} />
          <IconSearch size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name or email" className="field py-2 pl-10 text-sm" />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="people"
          title={status === "pending" ? "No requests waiting" : "Nobody here"}
          description={
            status === "pending"
              ? "Every join request has been dealt with."
              : "Invite your classmates and they will show up here."
          }
        />
      ) : (
        <Table headers={["Member", "Set profile", "Department", "Joined", "Status", "Actions"]}>
          {rows.map((r) => (
            <Tr key={r.id}>
              <Td>
                <Link href={`/s/${setId}/people/${r.id}`} className="flex items-center gap-3">
                  <Avatar name={r.name} src={r.avatar} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block truncate text-xs text-[var(--color-subtle)]">{r.email}</span>
                  </span>
                </Link>
              </Td>
              <Td className="max-w-[12rem] truncate text-[var(--color-muted)]">
                {r.nickname ? `“${r.nickname}”` : ""}
                {r.course ? <span className="block truncate text-xs">{r.course}</span> : null}
                {can(ws, "members.view_student_id") && r.studentId ? (
                  <span className="block truncate text-xs text-[var(--color-subtle)]">ID {r.studentId}</span>
                ) : null}
              </Td>
              <Td>{r.department ? <Badge tone="plum">{r.department}</Badge> : <span className="text-[var(--color-subtle)]">—</span>}</Td>
              <Td className="whitespace-nowrap text-[var(--color-muted)]">{formatDate(r.joined)}</Td>
              <Td>
                <span className="flex flex-wrap gap-1.5">
                  <Badge
                    tone={
                      r.status === "active" ? "positive"
                      : r.status === "pending" ? "caution"
                      : r.status === "suspended" ? "critical" : "default"
                    }
                  >
                    {titleCase(r.status)}
                  </Badge>
                  {r.isFounder ? <Badge tone="brand">Founder</Badge> : null}
                </span>
              </Td>
              <Td>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {r.status === "pending" && canApprove ? (
                    <>
                      <form action={updateStatus}>
                        <input type="hidden" name="membership_id" value={r.id} />
                        <input type="hidden" name="next" value="active" />
                        <button className="btn btn-soft btn-sm whitespace-nowrap">
                          <IconCheck size={14} /> Approve
                        </button>
                      </form>
                      <form action={updateStatus}>
                        <input type="hidden" name="membership_id" value={r.id} />
                        <input type="hidden" name="next" value="rejected" />
                        <button className="btn btn-quiet btn-sm whitespace-nowrap">
                          <IconClose size={14} /> Decline
                        </button>
                      </form>
                    </>
                  ) : null}
                  {r.status === "active" && canRemove ? (
                    <form action={updateStatus}>
                      <input type="hidden" name="membership_id" value={r.id} />
                      <input type="hidden" name="next" value="suspended" />
                      <button className="btn btn-quiet btn-sm whitespace-nowrap">Suspend</button>
                    </form>
                  ) : null}
                  {r.status === "suspended" && canApprove ? (
                    <form action={updateStatus}>
                      <input type="hidden" name="membership_id" value={r.id} />
                      <input type="hidden" name="next" value="active" />
                      <button className="btn btn-soft btn-sm whitespace-nowrap">Restore</button>
                    </form>
                  ) : null}
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}
