"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/forms";
import { IconCheck, IconUpload } from "@/components/icons";
import { money } from "@/lib/format";

interface Assignment {
  id: string;
  duesId: string;
  label: string;
  balance: number;
}

/**
 * Members record their own payment; it lands as `submitted` and only becomes
 * ledger money once an officer with `finance.payments_confirm` approves it.
 */
export function RecordPayment({
  setId,
  membershipId,
  currency,
  assignments,
}: {
  setId: string;
  membershipId: string;
  currency: string;
  assignments: Assignment[];
}) {
  const router = useRouter();
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? "");
  const [amount, setAmount] = useState(String(assignments[0]?.balance ?? ""));
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const selected = assignments.find((a) => a.id === assignmentId);

  const submit = () =>
    start(async () => {
      setError(null);
      if (!amount || Number(amount) <= 0) {
        setError("Enter the amount you transferred.");
        return;
      }

      const supabase = createClient();
      const { error: err } = await supabase.from("payments").insert({
        set_id: setId,
        membership_id: membershipId,
        assignment_id: assignmentId || null,
        dues_id: selected?.duesId || null,
        amount: Number(amount),
        currency,
        method,
        status: "submitted",
        reference: reference.trim() || null,
        note: note.trim() || null,
        paid_at: new Date().toISOString(),
      });

      if (err) {
        setError(err.message);
        return;
      }
      setDone(true);
      router.refresh();
    });

  if (done) {
    return (
      <div className="rounded-[var(--radius-md)] bg-[var(--color-positive-soft)] p-4 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[var(--color-positive)] text-white">
          <IconCheck size={20} />
        </span>
        <p className="mt-3 font-display text-sm font-semibold">Payment submitted</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-2)]">
          The financial secretary will confirm it against the bank statement. You will get a
          notification once it clears.
        </p>
        <button onClick={() => setDone(false)} className="btn btn-ghost btn-sm mt-3">
          Record another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div>
        <label className="field-label" htmlFor="pay-for">What are you paying?</label>
        <select
          id="pay-for" className="field" value={assignmentId}
          onChange={(e) => {
            setAssignmentId(e.target.value);
            const a = assignments.find((x) => x.id === e.target.value);
            if (a) setAmount(String(a.balance));
          }}
        >
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} — {money(a.balance, currency)} outstanding
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="pay-amount">Amount ({currency})</label>
          <input
            id="pay-amount" type="number" min={1} step={100} className="field"
            value={amount} onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="pay-method">Method</label>
          <select id="pay-method" className="field" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="ussd">USSD</option>
            <option value="card">Card</option>
            <option value="paystack">Paystack</option>
            <option value="flutterwave">Flutterwave</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="pay-ref">Transfer reference</label>
        <input
          id="pay-ref" className="field" value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="The narration on your bank app"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="pay-note">Note (optional)</label>
        <input
          id="pay-note" className="field" value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Paid two months together"
        />
      </div>

      <button onClick={submit} disabled={pending} className="btn btn-primary w-full">
        {pending ? <><Spinner /> Submitting…</> : <><IconUpload size={16} /> Record my payment</>}
      </button>

      <p className="text-center text-xs text-[var(--color-subtle)]">
        Recording a payment does not move money — it tells the treasurer to look for your transfer.
      </p>
    </div>
  );
}
