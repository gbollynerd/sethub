import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { PageHeader, StatTile } from "@/components/ui";
import { DuesList } from "@/components/lists";
import { IconPlus } from "@/components/icons";
import { first } from "@/lib/rows";
import { money, pct } from "@/lib/format";

export const metadata = { title: "Dues & levies" };
export const dynamic = "force-dynamic";

export default async function DuesPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: dues } = await supabase
    .from("dues")
    .select(
      "id, title, period_label, amount, currency, due_date, frequency, assigned_count, paid_count, expected_total, collected_total, department_id, set_departments ( name )",
    )
    .eq("set_id", setId)
    .order("due_date", { ascending: false })
    .limit(50);

  const items = (dues ?? []).map((d) => ({
    ...d,
    department: first(d.set_departments) as { name: string } | null,
  }));

  const expected = items.reduce((s, d) => s + Number(d.expected_total), 0);
  const collected = items.reduce((s, d) => s + Number(d.collected_total), 0);

  return (
    <div className="mx-auto max-w-[62rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Dues & levies"
        description="Monthly dues, annual subscriptions and one-off levies — with a live collection rate on each."
        action={
          can(ws, "finance.dues_manage") ? (
            <Link href={`/s/${setId}/finances/dues/new`} className="btn btn-primary btn-sm">
              <IconPlus size={15} /> Create dues
            </Link>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Expected" value={money(expected, ws.set.currency)} icon="chart" tone="brand" />
        <StatTile label="Collected" value={money(collected, ws.set.currency)} icon="check" tone="positive" />
        <StatTile
          label="Collection rate"
          value={pct(expected > 0 ? (collected / expected) * 100 : 0)}
          icon="finance"
          tone={collected / Math.max(expected, 1) >= 0.8 ? "positive" : "caution"}
        />
      </div>

      <DuesList setId={setId} items={items} manage={can(ws, "finance.dues_manage")} />
    </div>
  );
}
