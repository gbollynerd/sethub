import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, EmptyState, PageHeader, Table, Td, Tr } from "@/components/ui";
import { ConfirmPaymentButton } from "@/components/finance/confirm-payment-button";
import { first } from "@/lib/rows";
import { formatDate, money, titleCase } from "@/lib/format";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const canConfirm = can(ws, "finance.payments_confirm");

  let query = supabase
    .from("payments")
    .select(
      "id, amount, currency, method, status, paid_at, reference, note, payer_name, is_anonymous, set_memberships ( id, profiles!set_memberships_user_id_fkey ( display_name, avatar_url ) ), dues ( title )",
    )
    .eq("set_id", setId)
    .order("paid_at", { ascending: false })
    .limit(100);

  if (sp.status) query = query.eq("status", sp.status);

  const { data: payments } = await query;

  const rows = (payments ?? []).map((p) => {
    const sm = first(p.set_memberships) as { id: string; profiles: unknown } | null;
    const prof = first(sm?.profiles as { display_name: string | null; avatar_url: string | null }) as
      | { display_name: string | null; avatar_url: string | null }
      | null;
    const due = first(p.dues) as { title: string } | null;
    return {
      id: p.id as string,
      amount: Number(p.amount),
      currency: p.currency as string,
      method: p.method as string,
      status: p.status as string,
      paidAt: p.paid_at as string,
      reference: p.reference as string | null,
      note: p.note as string | null,
      payer: p.is_anonymous ? "Anonymous" : (prof?.display_name ?? p.payer_name ?? "Member"),
      avatar: p.is_anonymous ? null : prof?.avatar_url ?? null,
      membershipId: sm?.id ?? "",
      due: due?.title ?? null,
    };
  });

  const pendingCount = rows.filter((r) => r.status === "submitted").length;
  const filters = ["", "submitted", "confirmed", "failed"] as const;

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Payments"
        description={
          canConfirm
            ? "Match submitted payments against the bank statement, then confirm them into the ledger."
            : "Every payment recorded for this set."
        }
      />

      {pendingCount > 0 && canConfirm ? (
        <div className="card mb-5 flex flex-wrap items-center gap-3 border-[var(--color-caution)]/40 bg-[var(--color-caution-soft)] p-4">
          <p className="min-w-0 flex-1 text-sm">
            <strong>{pendingCount} payment{pendingCount === 1 ? "" : "s"}</strong> waiting for
            confirmation. Nothing reaches the ledger until you approve it.
          </p>
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <a
            key={f || "all"}
            href={f ? `/s/${setId}/finances/payments?status=${f}` : `/s/${setId}/finances/payments`}
            className={`chip transition ${(sp.status ?? "") === f ? "chip-brand" : "hover:border-[var(--color-ink)]"}`}
          >
            {f ? titleCase(f) : "All payments"}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="finance" title="No payments yet" description="Members record payments from their dues page." />
      ) : (
        <Table headers={["Member", "For", "Amount", "Method", "Date", "Status", ""]}>
          {rows.map((r) => (
            <Tr key={r.id}>
              <Td>
                <span className="flex items-center gap-2.5">
                  <Avatar name={r.payer} src={r.avatar} size={30} />
                  <span className="truncate font-medium">{r.payer}</span>
                </span>
              </Td>
              <Td className="max-w-[12rem] truncate text-[var(--color-muted)]">
                {r.due ?? r.note ?? "—"}
                {r.reference ? <span className="block text-xs text-[var(--color-subtle)]">Ref {r.reference}</span> : null}
              </Td>
              <Td className="tabular whitespace-nowrap font-semibold">{money(r.amount, r.currency)}</Td>
              <Td className="whitespace-nowrap text-[var(--color-muted)]">{titleCase(r.method)}</Td>
              <Td className="whitespace-nowrap text-[var(--color-muted)]">{formatDate(r.paidAt)}</Td>
              <Td>
                <Badge
                  tone={
                    r.status === "confirmed" ? "positive"
                    : r.status === "failed" ? "critical"
                    : r.status === "waived" ? "plum" : "caution"
                  }
                >
                  {titleCase(r.status)}
                </Badge>
              </Td>
              <Td className="text-right">
                {canConfirm && r.status !== "confirmed" ? (
                  <ConfirmPaymentButton paymentId={r.id} />
                ) : null}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}
