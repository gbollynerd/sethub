import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, StatTile, Table, Td, Tr } from "@/components/ui";
import { first } from "@/lib/rows";
import { formatDate, money, titleCase } from "@/lib/format";

export const metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const canRecord = can(ws, "finance.expenses_record");
  const canApprove = can(ws, "finance.expenses_approve");

  const [{ data: expenses }, { data: categories }] = await Promise.all([
    supabase
      .from("expenses")
      .select(
        "id, title, description, amount, currency, spent_on, vendor, method, status, reference, finance_categories ( name ), profiles!expenses_recorded_by_fkey ( display_name )",
      )
      .eq("set_id", setId)
      .order("spent_on", { ascending: false })
      .limit(100),
    supabase
      .from("finance_categories")
      .select("id, name")
      .eq("set_id", setId)
      .eq("direction", "expense")
      .order("sort_order"),
  ]);

  async function recordExpense(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);
    if (!can(workspace, "finance.expenses_record")) return;

    await supabase.from("expenses").insert({
      set_id: setId,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      amount: Number(formData.get("amount")),
      currency: workspace.set.currency,
      spent_on: String(formData.get("spent_on") ?? new Date().toISOString().slice(0, 10)),
      vendor: String(formData.get("vendor") ?? "").trim() || null,
      category_id: String(formData.get("category_id") ?? "") || null,
      method: String(formData.get("method") ?? "bank_transfer"),
      reference: String(formData.get("reference") ?? "").trim() || null,
      status: can(workspace, "finance.expenses_approve") ? "approved" : "submitted",
      approved_by: can(workspace, "finance.expenses_approve") ? workspace.userId : null,
      approved_at: can(workspace, "finance.expenses_approve") ? new Date().toISOString() : null,
      recorded_by: workspace.userId,
    });

    redirect(`/s/${setId}/finances/expenses`);
  }

  const rows = (expenses ?? []).map((e) => ({
    id: e.id as string,
    title: e.title as string,
    amount: Number(e.amount),
    currency: e.currency as string,
    spentOn: e.spent_on as string,
    vendor: e.vendor as string | null,
    status: e.status as string,
    category: (first(e.finance_categories) as { name: string } | null)?.name ?? null,
    recordedBy: (first(e.profiles) as { display_name: string | null } | null)?.display_name ?? null,
  }));

  const approved = rows.filter((r) => r.status === "approved" || r.status === "paid");
  const awaiting = rows.filter((r) => r.status === "submitted");
  const total = approved.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Expenses"
        description="Every naira the set spends, with the vendor, the category and who approved it."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Approved spend" value={money(total, ws.set.currency)} icon="wallet" tone="caution" />
        <StatTile label="Awaiting approval" value={awaiting.length} icon="clock" tone={awaiting.length ? "critical" : "positive"} />
        <StatTile label="Recorded lines" value={rows.length} icon="document" tone="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          {rows.length === 0 ? (
            <EmptyState icon="wallet" title="No expenses recorded" description="Recording spending as it happens is what makes the year-end report painless." />
          ) : (
            <Table headers={["Date", "Expense", "Category", "Vendor", "Amount", "Status"]}>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap text-[var(--color-muted)]">{formatDate(r.spentOn)}</Td>
                  <Td className="max-w-[14rem] truncate font-medium">
                    {r.title}
                    {r.recordedBy ? (
                      <span className="block text-xs text-[var(--color-subtle)]">by {r.recordedBy}</span>
                    ) : null}
                  </Td>
                  <Td className="text-[var(--color-muted)]">{r.category ?? "—"}</Td>
                  <Td className="max-w-[10rem] truncate text-[var(--color-muted)]">{r.vendor ?? "—"}</Td>
                  <Td className="tabular whitespace-nowrap font-semibold">{money(r.amount, r.currency)}</Td>
                  <Td>
                    <Badge
                      tone={
                        r.status === "approved" || r.status === "paid" ? "positive"
                        : r.status === "rejected" || r.status === "void" ? "critical" : "caution"
                      }
                    >
                      {titleCase(r.status)}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </div>

        {canRecord ? (
          <Card>
            <SectionHeader
              title="Record an expense"
              hint={canApprove ? "Approved immediately — it posts to the ledger" : "Submitted for approval"}
            />
            <form action={recordExpense} className="space-y-3.5">
              <div>
                <label className="field-label" htmlFor="title">What was it for?</label>
                <input id="title" name="title" required className="field" placeholder="Venue deposit for AGM" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="amount">Amount ({ws.set.currency})</label>
                  <input id="amount" name="amount" type="number" min={1} step={100} required className="field" />
                </div>
                <div>
                  <label className="field-label" htmlFor="spent_on">Date</label>
                  <input
                    id="spent_on" name="spent_on" type="date" className="field"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="category_id">Category</label>
                <select id="category_id" name="category_id" className="field">
                  <option value="">Uncategorised</option>
                  {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="vendor">Paid to</label>
                <input id="vendor" name="vendor" className="field" placeholder="Sheraton Hotel" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="method">Method</label>
                  <select id="method" name="method" className="field">
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="reference">Reference</label>
                  <input id="reference" name="reference" className="field" placeholder="Transfer ref" />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="description">Notes</label>
                <textarea id="description" name="description" rows={2} className="field" placeholder="Anything the auditor should know" />
              </div>
              <button className="btn btn-primary w-full">Record expense</button>
              <p className="text-center text-xs text-[var(--color-subtle)]">
                Attach the receipt afterwards from the expense detail page.
              </p>
            </form>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
