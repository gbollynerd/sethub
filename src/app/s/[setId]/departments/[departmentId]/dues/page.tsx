import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { SectionHeader, StatTile } from "@/components/ui";
import { DuesList } from "@/components/lists";
import { money } from "@/lib/format";

export const metadata = { title: "Department dues" };
export const dynamic = "force-dynamic";

export default async function DepartmentDuesPage({
  params,
}: {
  params: Promise<{ setId: string; departmentId: string }>;
}) {
  const { setId, departmentId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const canManage =
    ws.departmentAdminIds.includes(departmentId) ||
    ws.permissions.includes("finance.dues_manage") ||
    ws.isOwner;

  const [{ data: dues }, { data: mine }] = await Promise.all([
    supabase
      .from("dues")
      .select(
        "id, title, period_label, amount, currency, due_date, frequency, assigned_count, paid_count, expected_total, collected_total",
      )
      .eq("department_id", departmentId)
      .order("due_date", { ascending: false }),
    supabase
      .from("dues_assignments")
      .select("amount_due, amount_paid, balance, status, dues!inner ( id, title, department_id )")
      .eq("membership_id", ws.membershipId)
      .eq("dues.department_id", departmentId),
  ]);

  const myOutstanding = (mine ?? []).reduce((s, a) => s + Number(a.balance ?? 0), 0);
  const expected = (dues ?? []).reduce((s, d) => s + Number(d.expected_total), 0);
  const collected = (dues ?? []).reduce((s, d) => s + Number(d.collected_total), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Your department dues"
          value={money(myOutstanding, ws.set.currency)}
          icon="wallet"
          tone={myOutstanding > 0 ? "caution" : "positive"}
          sub={myOutstanding > 0 ? "Outstanding" : "Fully paid"}
        />
        <StatTile label="Collected" value={money(collected, ws.set.currency)} icon="finance" tone="positive" />
        <StatTile label="Expected" value={money(expected, ws.set.currency)} icon="chart" tone="info" />
      </div>

      <div>
        <SectionHeader
          title="Department levies"
          hint="Separate from set-wide dues — this purse belongs to the department"
        />
        <DuesList setId={setId} items={dues ?? []} manage={canManage} />
      </div>
    </div>
  );
}
