import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Card } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { DeleteDuesButton } from "@/components/finance/delete-dues-button";

export const metadata = { title: "Edit dues" };
export const dynamic = "force-dynamic";

const FREQUENCIES = [
  { value: "one_time", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannual", label: "Twice a year" },
  { value: "annual", label: "Annual" },
  { value: "levy", label: "Levy" },
];

export default async function EditDuesPage({
  params,
}: {
  params: Promise<{ setId: string; duesId: string }>;
}) {
  const { setId, duesId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: due } = await supabase
    .from("dues")
    .select("id, title, description, frequency, amount, currency, period_label, due_date, is_mandatory, allow_partial, department_id")
    .eq("id", duesId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!due) notFound();
  if (!can(ws, "finance.dues_manage", due.department_id as string | null)) {
    redirect(`/s/${setId}/finances/dues/${duesId}`);
  }

  async function updateDues(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);

    const { data: existing } = await supabase
      .from("dues")
      .select("id, department_id")
      .eq("id", duesId)
      .eq("set_id", setId)
      .maybeSingle();
    if (!existing) redirect(`/s/${setId}/finances/dues`);
    if (!can(workspace, "finance.dues_manage", existing.department_id as string | null)) {
      redirect(`/s/${setId}/finances/dues/${duesId}`);
    }

    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    await supabase
      .from("dues")
      .update({
        title,
        description: String(formData.get("description") ?? "").trim() || null,
        frequency: String(formData.get("frequency") ?? "annual"),
        amount: Number(formData.get("amount")) || 0,
        currency: String(formData.get("currency") ?? "NGN").trim() || "NGN",
        period_label: String(formData.get("period_label") ?? "").trim() || null,
        due_date: String(formData.get("due_date") ?? "") || null,
        is_mandatory: Boolean(formData.get("is_mandatory")),
        allow_partial: Boolean(formData.get("allow_partial")),
      })
      .eq("id", duesId)
      .eq("set_id", setId);

    redirect(`/s/${setId}/finances/dues/${duesId}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/s/${setId}/finances/dues/${duesId}`} className="btn btn-quiet btn-sm mb-4">← Back to due</Link>
      <h1 className="t-h1">Edit dues</h1>
      <p className="t-lead mb-7 mt-2">
        This updates the due's own details. Existing member assignments keep the amount they were originally given — record individual payments or waivers from the due's page.
      </p>

      <Card>
        <form action={updateDues} className="space-y-6">
          <section className="space-y-4">
            <Field label="Title" name="title" required defaultValue={due.title} />
            <TextArea label="Description" name="description" rows={2} defaultValue={due.description ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Frequency" name="frequency" options={FREQUENCIES} defaultValue={due.frequency} />
              <Field label="Period label" name="period_label" defaultValue={due.period_label ?? ""} />
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount per member" name="amount" type="number" min={0} step={100} defaultValue={due.amount} hint="Only applies to new assignments." />
              <Field label="Currency" name="currency" defaultValue={due.currency} />
            </div>
            <Field label="Due date" name="due_date" type="date" defaultValue={due.due_date ?? ""} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Mandatory" name="is_mandatory" defaultChecked={due.is_mandatory} />
              <Toggle label="Allow partial payments" name="allow_partial" defaultChecked={due.allow_partial} />
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
            <DeleteDuesButton setId={setId} duesId={duesId} />
            <SubmitButton className="btn btn-primary" pendingLabel="Saving…">Save changes</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
