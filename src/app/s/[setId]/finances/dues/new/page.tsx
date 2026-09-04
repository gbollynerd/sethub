import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Card } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { DuesScopeFields } from "@/components/finance/dues-scope-fields";
import { first } from "@/lib/rows";

export const metadata = { title: "Create dues" };
export const dynamic = "force-dynamic";

const FREQUENCIES = [
  { value: "one_time", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannual", label: "Twice a year" },
  { value: "annual", label: "Annual" },
  { value: "levy", label: "Levy" },
];

export default async function NewDuesPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  if (!can(ws, "finance.dues_manage")) redirect(`/s/${setId}/finances/dues`);

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("set_memberships")
    .select("id, nickname, course, profiles!set_memberships_user_id_fkey ( display_name, avatar_url )")
    .eq("set_id", setId)
    .eq("status", "active")
    .limit(500);

  const pickable = (members ?? []).map((m) => {
    const prof = first(m.profiles) as
      | { display_name: string | null; avatar_url: string | null }
      | null;
    return {
      id: m.id as string,
      name: prof?.display_name ?? (m.nickname as string | null) ?? "Member",
      avatar: prof?.avatar_url ?? null,
      sub: (m.course as string | null) ?? (m.nickname as string | null),
    };
  });

  async function createDues(formData: FormData) {
    "use server";
    const workspace = await getWorkspace(setId);
    if (!can(workspace, "finance.dues_manage")) redirect(`/s/${setId}/finances/dues`);

    const title = String(formData.get("title") ?? "").trim();
    const amount = Number(formData.get("amount"));
    if (!title || !amount || amount <= 0) return;

    const scope = String(formData.get("scope") ?? "all");
    const departmentId = scope === "department" ? String(formData.get("department_id") ?? "") || null : null;
    if (scope === "department" && !departmentId) return;

    const dueDate = String(formData.get("due_date") ?? "") || null;
    const supabase = await createClient();

    const { data: due, error } = await supabase
      .from("dues")
      .insert({
        set_id: setId,
        department_id: departmentId,
        title,
        description: String(formData.get("description") ?? "").trim() || null,
        frequency: String(formData.get("frequency") ?? "annual"),
        amount,
        currency: String(formData.get("currency") ?? workspace.set.currency).trim() || workspace.set.currency,
        period_label: String(formData.get("period_label") ?? "").trim() || null,
        due_date: dueDate,
        is_mandatory: Boolean(formData.get("is_mandatory")),
        allow_partial: Boolean(formData.get("allow_partial")),
        applies_to: scope,
        status: "open",
        created_by: workspace.userId,
      })
      .select("id")
      .single();

    if (error || !due) redirect(`/s/${setId}/finances/dues/new`);

    let membershipIds: string[] = [];
    if (scope === "custom") {
      membershipIds = formData.getAll("member_ids").map(String).filter(Boolean);
    } else {
      let q = supabase.from("set_memberships").select("id").eq("set_id", setId).eq("status", "active");
      if (departmentId) q = q.eq("department_id", departmentId);
      const { data: matched } = await q;
      membershipIds = (matched ?? []).map((m) => m.id as string);
    }

    if (membershipIds.length) {
      const rows = membershipIds.map((mid) => ({
        dues_id: due.id,
        membership_id: mid,
        amount_due: amount,
        due_date: dueDate,
      }));
      await supabase.from("dues_assignments").insert(rows);
    }

    redirect(`/s/${setId}/finances/dues/${due.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/s/${setId}/finances/dues`} className="btn btn-quiet btn-sm mb-4">← Back to dues</Link>
      <h1 className="t-h1">Create dues</h1>
      <p className="t-lead mb-7 mt-2">
        Assignments are created immediately for whoever this applies to — each member sees their balance on their dues page.
      </p>

      <Card>
        <form action={createDues} className="space-y-6">
          <section className="space-y-4">
            <Field label="Title" name="title" required placeholder="2026 annual dues" />
            <TextArea label="Description" name="description" rows={2} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Frequency" name="frequency" options={FREQUENCIES} defaultValue="annual" />
              <Field label="Period label" name="period_label" placeholder="e.g. 2026, Q1 2026" />
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount per member" name="amount" type="number" min={0} step={100} required />
              <Field label="Currency" name="currency" defaultValue={ws.set.currency} />
            </div>
            <Field label="Due date" name="due_date" type="date" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Mandatory" name="is_mandatory" defaultChecked hint="Shown as required, not optional, to members." />
              <Toggle label="Allow partial payments" name="allow_partial" defaultChecked />
            </div>
          </section>

          <section className="border-t border-[var(--color-line)] pt-6">
            <DuesScopeFields
              departments={ws.departments.map((d) => ({ value: d.id, label: d.name }))}
              members={pickable}
            />
          </section>

          <SubmitButton className="btn btn-primary" pendingLabel="Creating…">Create dues</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
