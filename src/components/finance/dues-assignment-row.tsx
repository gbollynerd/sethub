"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Badge } from "@/components/ui";
import { Alert, Spinner } from "@/components/forms";
import { IconBell, IconCheck } from "@/components/icons";
import { formatDate, money, relativeTime } from "@/lib/format";

export interface AssignmentRow {
  id: string;
  membershipId: string;
  name: string;
  avatar: string | null;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: string;
  dueDate: string | null;
  lastReminderAt: string | null;
  reminderCount: number;
}

const TONE: Record<string, "positive" | "caution" | "critical" | "plum" | "default"> = {
  confirmed: "positive",
  partial: "caution",
  pending: "default",
  waived: "plum",
};

/** One row on the dues detail/ledger page — record-payment, remind, and waive
 * are all admin-only actions, gated by the `manage` flag the page passes in. */
export function DuesAssignmentRow({
  assignment,
  setId,
  duesId,
  currency,
  manage,
}: {
  assignment: AssignmentRow;
  setId: string;
  duesId: string;
  currency: string;
  manage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [amount, setAmount] = useState(String(assignment.balance || assignment.amountDue));
  const [method, setMethod] = useState("cash");

  const remind = () =>
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { error: err } = await supabase.rpc("send_dues_reminders", {
        p_dues_id: duesId,
        p_membership_ids: [assignment.membershipId],
      });
      if (err) { setError(err.message); return; }
      router.refresh();
    });

  const waive = () => {
    const reason = window.prompt("Reason for waiving this due (shown to admins only):");
    if (reason === null) return;
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase
        .from("dues_assignments")
        .update({ status: "waived", waived_reason: reason || null, waived_by: user?.id ?? null })
        .eq("id", assignment.id);
      if (err) { setError(err.message); return; }
      router.refresh();
    });
  };

  const recordPayment = () =>
    start(async () => {
      setError(null);
      const amt = Number(amount);
      if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase.from("payments").insert({
        set_id: setId,
        membership_id: assignment.membershipId,
        dues_id: duesId,
        assignment_id: assignment.id,
        amount: amt,
        currency,
        method,
        status: "confirmed",
        paid_at: new Date().toISOString(),
        note: "Recorded by an administrator",
        confirmed_by: user?.id ?? null,
        confirmed_at: new Date().toISOString(),
        created_by: user?.id ?? null,
      });
      if (err) { setError(err.message); return; }
      setRecording(false);
      router.refresh();
    });

  return (
    <li className="border-b border-[var(--color-line)] p-4 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={assignment.name} src={assignment.avatar} size={30} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{assignment.name}</p>
            <p className="text-xs text-[var(--color-subtle)]">
              {money(assignment.amountPaid, currency)} of {money(assignment.amountDue, currency)}
              {assignment.dueDate ? ` · due ${formatDate(assignment.dueDate)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={TONE[assignment.status] ?? "default"}>{assignment.status}</Badge>
          {manage && assignment.balance > 0 && assignment.status !== "waived" ? (
            pending ? <Spinner /> : (
              <>
                <button onClick={remind} className="btn btn-quiet btn-sm" title="Send a reminder">
                  <IconBell size={13} />
                  {assignment.reminderCount > 0 ? ` ${assignment.reminderCount}` : ""}
                </button>
                <button onClick={() => setRecording((v) => !v)} className="btn btn-ghost btn-sm">
                  Record payment
                </button>
                <button onClick={waive} className="btn btn-quiet btn-sm text-[var(--color-subtle)]">
                  Waive
                </button>
              </>
            )
          ) : null}
        </div>
      </div>

      {assignment.lastReminderAt ? (
        <p className="mt-1.5 text-xs text-[var(--color-subtle)]">
          Last reminded {relativeTime(assignment.lastReminderAt)}
        </p>
      ) : null}

      {error ? <div className="mt-2"><Alert tone="error">{error}</Alert></div> : null}

      {recording ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-3">
          <div>
            <label className="field-label">Amount</label>
            <input
              className="field w-32" type="number" min={0} step={100}
              value={amount} onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Method</label>
            <select className="field" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button onClick={recordPayment} disabled={pending} className="btn btn-primary btn-sm">
            {pending ? <Spinner /> : <IconCheck size={14} />} Save
          </button>
        </div>
      ) : null}
    </li>
  );
}
