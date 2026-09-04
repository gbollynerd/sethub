import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, Card, PageHeader, SectionHeader } from "@/components/ui";
import { ConfirmPaymentButton } from "@/components/finance/confirm-payment-button";
import { RejectPaymentButton } from "@/components/finance/reject-payment-button";
import { PaymentNotes, type PaymentNote } from "@/components/finance/payment-notes";
import { first } from "@/lib/rows";
import { formatDate, money, titleCase } from "@/lib/format";

export const metadata = { title: "Payment" };
export const dynamic = "force-dynamic";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ setId: string; paymentId: string }>;
}) {
  const { setId, paymentId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select(
      "id, amount, currency, method, status, paid_at, reference, provider, note, payer_name, is_anonymous, rejected_reason, confirmed_at, membership_id, set_memberships ( id, user_id, profiles!set_memberships_user_id_fkey ( display_name, avatar_url ) ), dues ( id, title )",
    )
    .eq("id", paymentId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!payment) notFound();

  const sm = first(payment.set_memberships) as
    | { id: string; user_id: string; profiles: unknown }
    | null;
  const prof = first(sm?.profiles as { display_name: string | null; avatar_url: string | null }) as
    | { display_name: string | null; avatar_url: string | null }
    | null;
  const due = first(payment.dues) as { id: string; title: string } | null;

  const isPayer = sm?.user_id === ws.userId;
  const canView = isPayer || can(ws, "finance.view");
  if (!canView) notFound();
  const canConfirm = can(ws, "finance.payments_confirm");

  const { data: notes } = await supabase
    .from("payment_notes")
    .select("id, body, created_at, author_id, profiles ( display_name, avatar_url )")
    .eq("payment_id", paymentId)
    .order("created_at");

  const noteRows: PaymentNote[] = (notes ?? []).map((n) => {
    const author = first(n.profiles) as
      | { display_name: string | null; avatar_url: string | null }
      | null;
    return {
      id: n.id as string,
      body: n.body as string,
      createdAt: n.created_at as string,
      author: { name: author?.display_name ?? "Someone", avatar: author?.avatar_url ?? null },
      isMine: n.author_id === ws.userId,
    };
  });

  const payer = payment.is_anonymous ? "Anonymous" : (prof?.display_name ?? payment.payer_name ?? "Member");

  return (
    <div className="mx-auto max-w-[42rem]">
      <Link href={`/s/${setId}/finances/payments`} className="btn btn-quiet btn-sm mb-4">← All payments</Link>

      <PageHeader
        eyebrow={due?.title ?? ws.set.name}
        title={money(payment.amount, payment.currency)}
        action={
          <Badge
            tone={
              payment.status === "confirmed" ? "positive"
              : payment.status === "failed" ? "critical"
              : payment.status === "waived" ? "plum" : "caution"
            }
          >
            {titleCase(payment.status)}
          </Badge>
        }
      />

      <Card className="mb-5">
        <div className="flex items-center gap-3">
          <Avatar name={payer} src={payment.is_anonymous ? null : prof?.avatar_url ?? null} size={36} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{payer}</p>
            <p className="text-sm text-[var(--color-muted)]">
              {titleCase(payment.method)} · {formatDate(payment.paid_at)}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 border-t border-[var(--color-line)] pt-4 text-sm sm:grid-cols-2">
          {due ? (
            <div>
              <dt className="text-xs text-[var(--color-subtle)]">For</dt>
              <dd className="font-medium">{due.title}</dd>
            </div>
          ) : null}
          {payment.reference ? (
            <div>
              <dt className="text-xs text-[var(--color-subtle)]">Reference</dt>
              <dd className="font-medium">{payment.reference}</dd>
            </div>
          ) : null}
          {payment.note ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-[var(--color-subtle)]">Note</dt>
              <dd>{payment.note}</dd>
            </div>
          ) : null}
          {payment.status === "failed" && payment.rejected_reason ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-[var(--color-critical)]">Why this was rejected</dt>
              <dd>{payment.rejected_reason}</dd>
            </div>
          ) : null}
        </dl>

        {canConfirm && payment.status !== "confirmed" && payment.status !== "failed" ? (
          <div className="mt-4 flex gap-2 border-t border-[var(--color-line)] pt-4">
            <ConfirmPaymentButton paymentId={payment.id} />
            <RejectPaymentButton paymentId={payment.id} />
          </div>
        ) : null}
      </Card>

      <Card>
        <SectionHeader title="Discussion" hint="Visible to the payer and finance admins only." />
        <PaymentNotes paymentId={payment.id} notes={noteRows} />
      </Card>
    </div>
  );
}
