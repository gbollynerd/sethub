import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Badge, Card, EmptyState, PageHeader, Progress, SectionHeader, StatTile, Table, Td, Tr } from "@/components/ui";
import { RecordPayment } from "@/components/finance/record-payment";
import { first } from "@/lib/rows";
import { formatDate, money, titleCase } from "@/lib/format";

export const metadata = { title: "My dues" };
export const dynamic = "force-dynamic";

export default async function MyDuesPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const currency = ws.set.currency;

  const [{ data: assignments }, { data: payments }, { data: accounts }] = await Promise.all([
    supabase
      .from("dues_assignments")
      .select("id, amount_due, amount_paid, balance, status, due_date, dues ( id, title, period_label, frequency, currency, department_id )")
      .eq("membership_id", ws.membershipId)
      .order("due_date", { ascending: false }),
    supabase
      .from("payments")
      .select("id, amount, currency, method, status, paid_at, reference, note, dues ( title )")
      .eq("membership_id", ws.membershipId)
      .order("paid_at", { ascending: false })
      .limit(20),
    supabase
      .from("finance_accounts")
      .select("id, name, bank_name, account_name, account_number, is_primary")
      .eq("set_id", setId)
      .eq("is_active", true)
      .order("is_primary", { ascending: false }),
  ]);

  const rows = (assignments ?? []).map((a) => ({
    id: a.id as string,
    due: first(a.dues) as { id: string; title: string; period_label: string | null; frequency: string; currency: string } | null,
    amountDue: Number(a.amount_due),
    amountPaid: Number(a.amount_paid),
    balance: Number(a.balance),
    status: a.status as string,
    dueDate: a.due_date as string | null,
  }));

  const outstanding = rows.reduce((s, r) => s + Math.max(r.balance, 0), 0);
  const paidTotal = rows.reduce((s, r) => s + r.amountPaid, 0);
  const expected = rows.reduce((s, r) => s + r.amountDue, 0);
  const unpaid = rows.filter((r) => r.balance > 0);

  return (
    <div className="mx-auto max-w-[62rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="My dues"
        description="What you owe this set, what you have already paid, and how to settle the balance."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Outstanding" value={money(outstanding, currency)} icon="clock"
          tone={outstanding > 0 ? "critical" : "positive"}
          sub={outstanding > 0 ? `${unpaid.length} unpaid` : "All settled"}
        />
        <StatTile label="Paid to date" value={money(paidTotal, currency)} icon="check" tone="positive" />
        <StatTile label="Assigned in total" value={money(expected, currency)} icon="wallet" tone="brand" />
      </div>

      {expected > 0 ? (
        <div className="mt-5">
          <Progress
            value={(paidTotal / expected) * 100}
            tone={outstanding > 0 ? "caution" : "positive"}
            label="Your payment record"
          />
        </div>
      ) : null}

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section>
            <SectionHeader title="What you owe" />
            {rows.length === 0 ? (
              <EmptyState icon="wallet" title="Nothing assigned to you yet" description="When the set creates dues you will see them here." />
            ) : (
              <Table headers={["Dues", "Due", "Amount", "Paid", "Balance", "Status"]}>
                {rows.map((r) => (
                  <Tr key={r.id}>
                    <Td className="font-medium">
                      {r.due?.title ?? "Dues"}
                      {r.due?.period_label ? (
                        <span className="block text-xs text-[var(--color-subtle)]">{r.due.period_label}</span>
                      ) : null}
                    </Td>
                    <Td className="whitespace-nowrap text-[var(--color-muted)]">
                      {r.dueDate ? formatDate(r.dueDate) : "—"}
                    </Td>
                    <Td className="tabular">{money(r.amountDue, currency)}</Td>
                    <Td className="tabular text-[var(--color-positive)]">{money(r.amountPaid, currency)}</Td>
                    <Td className={`tabular font-semibold ${r.balance > 0 ? "text-[var(--color-critical)]" : ""}`}>
                      {money(Math.max(r.balance, 0), currency)}
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          r.status === "confirmed" ? "positive"
                          : r.status === "partial" ? "caution"
                          : r.status === "waived" ? "plum" : "default"
                        }
                      >
                        {titleCase(r.status)}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Table>
            )}
          </section>

          <section>
            <SectionHeader title="Your payment history" />
            {payments?.length ? (
              <Table headers={["Date", "For", "Amount", "Method", "Status"]} dense>
                {payments.map((p) => {
                  const due = first(p.dues) as { title: string } | null;
                  return (
                    <Tr key={p.id}>
                      <Td className="whitespace-nowrap text-[var(--color-muted)]">{formatDate(p.paid_at)}</Td>
                      <Td className="max-w-[12rem] truncate">{due?.title ?? p.note ?? "Payment"}</Td>
                      <Td className="tabular font-semibold">{money(p.amount, p.currency)}</Td>
                      <Td className="text-[var(--color-muted)]">{titleCase(p.method)}</Td>
                      <Td>
                        <Badge tone={p.status === "confirmed" ? "positive" : p.status === "failed" ? "critical" : "caution"}>
                          {titleCase(p.status)}
                        </Badge>
                      </Td>
                    </Tr>
                  );
                })}
              </Table>
            ) : (
              <EmptyState icon="finance" title="No payments recorded" description="Once you pay, your record shows here permanently." />
            )}
          </section>
        </div>

        <div className="space-y-6">
          {unpaid.length ? (
            <Card>
              <SectionHeader title="Settle up" hint="Record a transfer and an officer will confirm it" />
              <RecordPayment
                setId={setId}
                membershipId={ws.membershipId}
                currency={currency}
                assignments={unpaid.map((u) => ({
                  id: u.id,
                  duesId: u.due?.id ?? "",
                  label: `${u.due?.title ?? "Dues"}${u.due?.period_label ? ` · ${u.due.period_label}` : ""}`,
                  balance: u.balance,
                }))}
              />
            </Card>
          ) : null}

          {accounts?.length ? (
            <Card>
              <SectionHeader title="Where to pay" />
              <ul className="space-y-3">
                {accounts.map((a) => (
                  <li key={a.id} className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-sm font-semibold">{a.name}</p>
                      {a.is_primary ? <Badge tone="brand">Primary</Badge> : null}
                    </div>
                    {a.bank_name ? <p className="mt-1 text-sm text-[var(--color-muted)]">{a.bank_name}</p> : null}
                    {a.account_name ? <p className="text-sm">{a.account_name}</p> : null}
                    {a.account_number ? (
                      <p className="tabular mt-1 font-mono text-sm tracking-wider">{a.account_number}</p>
                    ) : (
                      <p className="mt-1 text-xs text-[var(--color-subtle)]">
                        Account details have not been published yet.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <p className="font-display text-sm font-semibold">How payments are confirmed</p>
            <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-[var(--color-muted)]">
              <li>1. You transfer the money and record it here with the reference.</li>
              <li>2. The financial secretary matches it against the bank statement.</li>
              <li>3. Once confirmed, it posts to the set ledger — visible to everyone.</li>
            </ol>
            <Link href={`/s/${setId}/finances`} className="btn btn-ghost btn-sm mt-4 w-full">
              View the set ledger
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
