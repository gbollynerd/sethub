import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { formatDate, money, pct } from "@/lib/format";

export const metadata = { title: "Financial report" };
export const dynamic = "force-dynamic";

/** A print-optimised report. Browsers save this straight to PDF. */
export default async function PrintableReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const currency = ws.set.currency;

  const { data: report } = await supabase.rpc("finance_export_data", {
    p_set_id: setId,
    p_scope: "full_report",
    p_from: sp.from || null,
    p_to: sp.to || null,
    p_department_id: null,
  });

  const r = (report ?? {}) as {
    summary?: { total_income: number; total_expense: number; balance: number };
    monthly?: Array<{ month: string; income: number; expense: number }>;
    by_category?: Array<{ category: string; direction: string; total: number }>;
    dues?: Array<{ title: string; period_label: string | null; expected_total: number; collected_total: number; assigned_count: number; paid_count: number }>;
  };

  return (
    <div className="mx-auto max-w-[52rem] bg-white p-8 text-[var(--color-ink)] print:p-0">
      <style>{`@media print { .no-print { display: none } body { background: #fff } }`}</style>

      <header className="border-b-2 border-[var(--color-brand)] pb-5">
        <p className="t-eyebrow">Financial report</p>
        <h1 className="t-h1 mt-1.5">{ws.set.institution.name}</h1>
        <p className="mt-1 text-[var(--color-muted)]">
          {ws.set.name}
          {sp.from || sp.to ? ` · ${sp.from ?? "start"} to ${sp.to ?? "today"}` : " · all time"}
        </p>
        <p className="mt-0.5 text-sm text-[var(--color-subtle)]">
          Generated {formatDate(new Date())} by SetHub
        </p>
      </header>

      <section className="mt-7 grid grid-cols-3 gap-4">
        {[
          ["Total income", r.summary?.total_income ?? 0],
          ["Total expenses", r.summary?.total_expense ?? 0],
          ["Closing balance", r.summary?.balance ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-4">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">{label}</p>
            <p className="tabular mt-1.5 font-display text-xl font-semibold">{money(Number(value), currency)}</p>
          </div>
        ))}
      </section>

      {r.monthly?.length ? (
        <section className="mt-8">
          <h2 className="t-h3 mb-3">Monthly cash flow</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line-strong)] text-left">
                <th className="py-2">Month</th>
                <th className="py-2 text-right">Income</th>
                <th className="py-2 text-right">Expenses</th>
                <th className="py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {r.monthly.map((m) => (
                <tr key={m.month} className="border-b border-[var(--color-line)]">
                  <td className="py-2">
                    {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
                      .format(new Date(m.month))}
                  </td>
                  <td className="tabular py-2 text-right">{money(m.income, currency)}</td>
                  <td className="tabular py-2 text-right">{money(m.expense, currency)}</td>
                  <td className="tabular py-2 text-right font-semibold">
                    {money(Number(m.income) - Number(m.expense), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {r.by_category?.length ? (
        <section className="mt-8">
          <h2 className="t-h3 mb-3">By category</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line-strong)] text-left">
                <th className="py-2">Category</th>
                <th className="py-2">Direction</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {r.by_category.map((c, i) => (
                <tr key={`${c.category}-${i}`} className="border-b border-[var(--color-line)]">
                  <td className="py-2">{c.category}</td>
                  <td className="py-2 capitalize">{c.direction}</td>
                  <td className="tabular py-2 text-right">{money(c.total, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {r.dues?.length ? (
        <section className="mt-8">
          <h2 className="t-h3 mb-3">Dues position</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line-strong)] text-left">
                <th className="py-2">Dues</th>
                <th className="py-2 text-right">Expected</th>
                <th className="py-2 text-right">Collected</th>
                <th className="py-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {r.dues.map((d, i) => (
                <tr key={i} className="border-b border-[var(--color-line)]">
                  <td className="py-2">
                    {d.title}
                    {d.period_label ? <span className="text-[var(--color-subtle)]"> · {d.period_label}</span> : null}
                  </td>
                  <td className="tabular py-2 text-right">{money(d.expected_total, currency)}</td>
                  <td className="tabular py-2 text-right">{money(d.collected_total, currency)}</td>
                  <td className="tabular py-2 text-right">
                    {pct(Number(d.expected_total) > 0 ? (Number(d.collected_total) / Number(d.expected_total)) * 100 : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <footer className="mt-10 border-t border-[var(--color-line)] pt-5 text-xs text-[var(--color-subtle)]">
        <p>
          Prepared from the SetHub ledger. Every line traces back to a confirmed payment or an
          approved expense with an audit entry.
        </p>
      </footer>

      <div className="no-print mt-8 flex gap-2">
        <a href={`/s/${setId}/finances/reports`} className="btn btn-ghost btn-sm">← Back</a>
      </div>
    </div>
  );
}
