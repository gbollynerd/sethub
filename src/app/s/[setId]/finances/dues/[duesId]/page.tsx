import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Card, PageHeader, EmptyState, StatTile, Progress } from "@/components/ui";
import { DuesAssignmentRow, type AssignmentRow } from "@/components/finance/dues-assignment-row";
import { SendDuesRemindersButton } from "@/components/finance/send-dues-reminders-button";
import { first } from "@/lib/rows";
import { money, pct } from "@/lib/format";

export const metadata = { title: "Due" };
export const dynamic = "force-dynamic";

export default async function DuesDetailPage({
  params,
}: {
  params: Promise<{ setId: string; duesId: string }>;
}) {
  const { setId, duesId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: due } = await supabase
    .from("dues")
    .select(
      "id, title, description, frequency, amount, currency, period_label, due_date, applies_to, department_id, is_mandatory, allow_partial, assigned_count, paid_count, expected_total, collected_total, set_departments ( name )",
    )
    .eq("id", duesId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!due) notFound();
  const manage = can(ws, "finance.dues_manage", due.department_id as string | null);

  const { data: assignments } = await supabase
    .from("dues_assignments")
    .select(
      "id, membership_id, amount_due, amount_paid, balance, status, due_date, last_reminder_at, reminder_count, set_memberships ( id, nickname, profiles!set_memberships_user_id_fkey ( display_name, avatar_url ) )",
    )
    .eq("dues_id", duesId)
    .order("status");

  const rows: AssignmentRow[] = (assignments ?? []).map((a) => {
    const sm = first(a.set_memberships) as
      | { id: string; nickname: string | null; profiles: unknown }
      | null;
    const prof = first(sm?.profiles as { display_name: string | null; avatar_url: string | null }) as
      | { display_name: string | null; avatar_url: string | null }
      | null;
    return {
      id: a.id as string,
      membershipId: a.membership_id as string,
      name: prof?.display_name ?? sm?.nickname ?? "Member",
      avatar: prof?.avatar_url ?? null,
      amountDue: Number(a.amount_due),
      amountPaid: Number(a.amount_paid),
      balance: Number(a.balance),
      status: a.status as string,
      dueDate: a.due_date as string | null,
      lastReminderAt: a.last_reminder_at as string | null,
      reminderCount: (a.reminder_count as number) ?? 0,
    };
  });

  const department = first(due.set_departments) as { name: string } | null;
  const expected = Number(due.expected_total);
  const collected = Number(due.collected_total);
  const rate = expected > 0 ? (collected / expected) * 100 : 0;
  const owingCount = rows.filter((r) => r.balance > 0 && r.status !== "waived").length;

  return (
    <div className="mx-auto max-w-[52rem]">
      <Link href={`/s/${setId}/finances/dues`} className="btn btn-quiet btn-sm mb-4">← All dues</Link>

      <PageHeader
        eyebrow={department?.name ?? ws.set.name}
        title={due.title}
        description={due.description ?? undefined}
        action={
          manage ? (
            <div className="flex items-center gap-2">
              <Link href={`/s/${setId}/finances/dues/${duesId}/edit`} className="btn btn-ghost btn-sm">
                Edit
              </Link>
              {owingCount > 0 ? <SendDuesRemindersButton duesId={duesId} /> : null}
            </div>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Expected" value={money(expected, due.currency)} icon="chart" tone="brand" />
        <StatTile label="Collected" value={money(collected, due.currency)} icon="check" tone="positive" />
        <StatTile label="Collection rate" value={pct(rate)} icon="finance" tone={rate >= 80 ? "positive" : "caution"} />
      </div>

      <Card className="mb-6 !p-0">
        <div className="p-5">
          <Progress value={rate} tone={rate >= 90 ? "positive" : "brand"} label={`${due.paid_count} of ${due.assigned_count} members paid in full`} />
        </div>
      </Card>

      <Card className="!p-0">
        {rows.length === 0 ? (
          <EmptyState icon="wallet" title="No one assigned yet" description="This due has no assignments." />
        ) : (
          <ul>
            {rows.map((r) => (
              <DuesAssignmentRow key={r.id} assignment={r} setId={setId} duesId={duesId} currency={due.currency} manage={manage} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
