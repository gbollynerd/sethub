import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Table, Td, Tr } from "@/components/ui";
import { ExportPanel } from "@/components/finance/export-panel";
import { IconDownload, IconLock, IconUpload } from "@/components/icons";
import { formatDate, money, titleCase } from "@/lib/format";

export const metadata = { title: "Financial reports & export" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const canExport = can(ws, "finance.export");
  const canUpload = can(ws, "finance.statements");

  const [{ data: statements }, { data: exports }, { data: monthly }] = await Promise.all([
    supabase
      .from("financial_statements")
      .select("id, title, kind, period_start, period_end, is_published, summary, created_at")
      .eq("set_id", setId)
      .order("period_end", { ascending: false })
      .limit(20),
    canExport
      ? supabase
          .from("finance_exports")
          .select("id, scope, format, period_start, period_end, row_count, created_at, status")
          .eq("set_id", setId)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    supabase.from("monthly_cashflow").select("*").eq("set_id", setId).order("month", { ascending: false }).limit(12),
  ]);

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Reports & export"
        description="Pull the numbers out whenever you need them — for an AGM pack, an auditor, or a member who simply wants to check."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          {canExport ? (
            <Card>
              <SectionHeader
                title="Export financial data"
                hint="CSV opens directly in Excel, Numbers or Google Sheets"
              />
              <ExportPanel setId={setId} departments={ws.departments} />
            </Card>
          ) : (
            <Card>
              <div className="flex items-start gap-3">
                <IconLock size={20} className="mt-0.5 shrink-0 text-[var(--color-subtle)]" />
                <div>
                  <p className="font-display text-sm font-semibold">Export is permissioned</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                    The treasurer, financial secretary and auditor can export the full ledger. You can
                    still see the balance and the transaction list on the finances page.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <SectionHeader title="Monthly cash flow" hint="Straight from the ledger" />
            {monthly?.length ? (
              <Table headers={["Month", "Income", "Expenses", "Net"]} dense>
                {monthly.map((m) => {
                  const net = Number(m.income) - Number(m.expense);
                  return (
                    <Tr key={String(m.month)}>
                      <Td className="whitespace-nowrap font-medium">
                        {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
                          .format(new Date(m.month))}
                      </Td>
                      <Td className="tabular text-[var(--color-positive)]">{money(m.income, ws.set.currency)}</Td>
                      <Td className="tabular text-[var(--color-plum)]">{money(m.expense, ws.set.currency)}</Td>
                      <Td className={`tabular font-semibold ${net >= 0 ? "text-[var(--color-ink)]" : "text-[var(--color-critical)]"}`}>
                        {money(net, ws.set.currency)}
                      </Td>
                    </Tr>
                  );
                })}
              </Table>
            ) : (
              <EmptyState icon="chart" title="No cash flow yet" description="Once payments and expenses are recorded, the monthly view fills in." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-end justify-between gap-3">
              <SectionHeader title="Statements & audit files" hint="Bank statements, monthly reports, auditor letters" />
              {canUpload ? (
                <Link href={`/s/${setId}/finances/reports/upload`} className="btn btn-primary btn-sm shrink-0">
                  <IconUpload size={15} /> Upload
                </Link>
              ) : null}
            </div>
            {statements?.length ? (
              <ul className="space-y-2">
                {statements.map((s) => (
                  <li key={s.id} className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-semibold">{s.title}</p>
                        <p className="mt-0.5 text-xs text-[var(--color-subtle)]">
                          {titleCase(s.kind)}
                          {s.period_start && s.period_end
                            ? ` · ${formatDate(s.period_start)} – ${formatDate(s.period_end)}`
                            : s.period_end
                              ? ` · ${formatDate(s.period_end)}`
                              : ""}
                        </p>
                        {s.summary ? (
                          <p className="mt-1.5 line-clamp-2 text-sm text-[var(--color-muted)]">{s.summary}</p>
                        ) : null}
                      </div>
                      <Badge tone={s.is_published ? "positive" : "caution"}>
                        {s.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="document"
                title="No statements uploaded"
                description="Publishing the bank statement each month is the single most effective trust-builder a set has."
              />
            )}
          </Card>

          {canExport && exports?.length ? (
            <Card>
              <SectionHeader title="Export history" hint="Every export is logged" />
              <ul className="space-y-2 text-sm">
                {exports.map((e) => (
                  <li key={String(e.id)} className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{titleCase(String(e.scope))}</p>
                      <p className="text-xs text-[var(--color-subtle)]">
                        {String(e.format).toUpperCase()} · {String(e.row_count ?? 0)} rows ·{" "}
                        {formatDate(String(e.created_at))}
                      </p>
                    </div>
                    <IconDownload size={15} className="shrink-0 text-[var(--color-subtle)]" />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
