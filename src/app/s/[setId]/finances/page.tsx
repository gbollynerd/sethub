import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { BarPair, Card, Donut, EmptyState, PageHeader, Progress, SectionHeader, StatTile, Table, Td, Tr } from "@/components/ui";
import { IconDownload, IconPlus } from "@/components/icons";
import { first } from "@/lib/rows";
import { compactMoney, formatDate, money, num, pct, titleCase } from "@/lib/format";

export const metadata = { title: "Finances" };
export const dynamic = "force-dynamic";

export default async function FinancesPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const currency = ws.set.currency;

  const [
    { data: summary },
    { data: monthly },
    { data: ledger },
    { data: dues },
    { data: myDues },
    { data: statements },
  ] = await Promise.all([
    supabase.from("set_finance_summary").select("*").eq("set_id", setId).maybeSingle(),
    supabase.from("monthly_cashflow").select("*").eq("set_id", setId).order("month", { ascending: false }).limit(6),
    supabase
      .from("ledger_entries")
      .select("id, occurred_on, direction, amount, currency, description, source_type, finance_categories ( name )")
      .eq("set_id", setId)
      .order("occurred_on", { ascending: false })
      .limit(12),
    supabase
      .from("dues")
      .select("id, title, expected_total, collected_total, due_date, currency")
      .eq("set_id", setId)
      .order("due_date", { ascending: false })
      .limit(5),
    supabase
      .from("dues_assignments")
      .select("balance, amount_due, amount_paid, status, dues ( title, due_date, currency )")
      .eq("membership_id", ws.membershipId)
      .gt("balance", 0),
    supabase
      .from("financial_statements")
      .select("id, title, kind, period_end, is_published")
      .eq("set_id", setId)
      .eq("is_published", true)
      .order("period_end", { ascending: false })
      .limit(5),
  ]);

  const canSeeDetail = can(ws, "finance.view");
  const myOutstanding = (myDues ?? []).reduce((s, a) => s + Number(a.balance ?? 0), 0);

  const income = Number(summary?.total_income ?? 0);
  const expense = Number(summary?.total_expense ?? 0);
  const balance = Number(summary?.balance ?? 0);

  const chart = (monthly ?? [])
    .slice()
    .reverse()
    .map((m) => ({
      label: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(m.month)),
      a: Number(m.income),
      b: Number(m.expense),
    }));

  const totalExpected = (dues ?? []).reduce((s, d) => s + Number(d.expected_total), 0);
  const totalCollected = (dues ?? []).reduce((s, d) => s + Number(d.collected_total), 0);
  const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Finances"
        description="One ledger, open to the whole set. Every confirmed payment and approved expense lands here automatically."
        action={
          <>
            <Link href={`/s/${setId}/finances/reports`} className="btn btn-ghost btn-sm">
              <IconDownload size={15} /> Export
            </Link>
            {can(ws, "finance.dues_manage") ? (
              <Link href={`/s/${setId}/finances/dues/new`} className="btn btn-primary btn-sm">
                <IconPlus size={15} /> Create dues
              </Link>
            ) : null}
          </>
        }
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Set balance" value={compactMoney(balance, currency)} icon="finance" tone="brand" sub="Income minus expenses" />
        <StatTile label="Total income" value={compactMoney(income, currency)} icon="chart" tone="positive" sub="Dues, donations, events" />
        <StatTile label="Total spent" value={compactMoney(expense, currency)} icon="wallet" tone="caution" sub="Approved expenses only" />
        <StatTile
          label="Your outstanding dues"
          value={money(myOutstanding, currency)}
          icon="clock"
          tone={myOutstanding > 0 ? "critical" : "positive"}
          href={`/s/${setId}/finances/my-dues`}
          sub={myOutstanding > 0 ? "Settle up" : "Fully paid"}
        />
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card>
            <SectionHeader title="Money in and out" hint="Last six months" />
            {chart.length ? (
              <BarPair data={chart} formatValue={(n) => money(n, currency)} />
            ) : (
              <p className="py-10 text-center text-sm text-[var(--color-subtle)]">
                No transactions recorded yet.
              </p>
            )}
          </Card>

          <section>
            <SectionHeader title="Recent transactions" href={`/s/${setId}/finances/payments`} linkLabel="All payments" />
            {ledger?.length ? (
              <Table headers={["Date", "Description", "Category", "Type", "Amount"]}>
                {ledger.map((e) => {
                  const cat = first(e.finance_categories) as { name: string } | null;
                  return (
                    <Tr key={e.id}>
                      <Td className="whitespace-nowrap text-[var(--color-muted)]">{formatDate(e.occurred_on)}</Td>
                      <Td className="max-w-[16rem] truncate font-medium">{e.description}</Td>
                      <Td className="text-[var(--color-muted)]">{cat?.name ?? "—"}</Td>
                      <Td>
                        <span className={e.direction === "income" ? "chip chip-positive" : "chip chip-plum"}>
                          {titleCase(e.direction)}
                        </span>
                      </Td>
                      <Td className={`tabular whitespace-nowrap text-right font-semibold ${
                        e.direction === "income" ? "text-[var(--color-positive)]" : "text-[var(--color-ink)]"
                      }`}>
                        {e.direction === "income" ? "+" : "−"}{money(e.amount, e.currency)}
                      </Td>
                    </Tr>
                  );
                })}
              </Table>
            ) : (
              <EmptyState
                icon="finance"
                title="No transactions yet"
                description="Confirmed dues payments and approved expenses appear here automatically."
              />
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <SectionHeader title="Where the money goes" />
            {income > 0 || expense > 0 ? (
              <Donut
                size={156}
                centerValue={compactMoney(balance, currency)}
                centerLabel="balance"
                data={[
                  { label: "Income", value: income, color: "var(--color-brand)" },
                  { label: "Expenses", value: expense, color: "var(--color-plum)" },
                ]}
              />
            ) : (
              <p className="py-8 text-center text-sm text-[var(--color-subtle)]">Nothing to chart yet.</p>
            )}
          </Card>

          <Card>
            <SectionHeader title="Dues collection" href={`/s/${setId}/finances/dues`} />
            <Progress
              value={collectionRate}
              tone={collectionRate >= 80 ? "positive" : collectionRate >= 50 ? "brand" : "caution"}
              label={`${pct(collectionRate)} collected`}
            />
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Expected" value={money(totalExpected, currency)} />
              <Row label="Collected" value={money(totalCollected, currency)} />
              <Row label="Outstanding" value={money(Math.max(totalExpected - totalCollected, 0), currency)} />
            </dl>
            {dues?.length ? (
              <ul className="mt-5 space-y-3 border-t border-[var(--color-line)] pt-4">
                {dues.map((d) => {
                  const exp = Number(d.expected_total);
                  const col = Number(d.collected_total);
                  return (
                    <li key={d.id}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">{d.title}</span>
                        <span className="tabular shrink-0 text-xs text-[var(--color-subtle)]">
                          {num(exp > 0 ? Math.round((col / exp) * 100) : 0)}%
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <Progress value={exp > 0 ? (col / exp) * 100 : 0} height={5} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </Card>

          {canSeeDetail ? (
            <Card>
              <SectionHeader title="Published statements" href={`/s/${setId}/finances/reports`} />
              {statements?.length ? (
                <ul className="space-y-2">
                  {statements.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.title}</p>
                        <p className="text-xs text-[var(--color-subtle)]">
                          {titleCase(s.kind)}{s.period_end ? ` · ${formatDate(s.period_end)}` : ""}
                        </p>
                      </div>
                      <IconDownload size={16} className="shrink-0 text-[var(--color-subtle)]" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-5 text-center text-sm text-[var(--color-subtle)]">
                  No statements published yet.
                </p>
              )}
            </Card>
          ) : null}

          <Card className="!bg-[var(--color-brand-soft)] !border-[var(--color-brand)]/25">
            <p className="font-display text-sm font-semibold text-[var(--color-brand-deep)]">
              Financial transparency
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-brand-dark)]">
              Every member of this set can see the ledger and the balance. Detail — who paid what,
              receipts, statements — stays with the people holding the finance permissions.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="tabular font-semibold">{value}</dd>
    </div>
  );
}
