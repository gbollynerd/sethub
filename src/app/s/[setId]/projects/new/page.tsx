import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { Field, SubmitButton, TextArea, Select } from "@/components/forms";
import { ProjectMilestoneBuilder } from "@/components/projects/project-milestone-builder";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";

export const metadata = { title: "Propose a project" };
export const dynamic = "force-dynamic";

const CATEGORIES = [
  { value: "infrastructure", label: "Infrastructure" },
  { value: "equipment", label: "Equipment" },
  { value: "scholarship", label: "Scholarship" },
  { value: "welfare", label: "Welfare" },
  { value: "sports", label: "Sports" },
  { value: "library", label: "Library" },
  { value: "ict", label: "ICT" },
  { value: "renovation", label: "Renovation" },
  { value: "endowment", label: "Endowment" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

export default async function NewProjectPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  if (!can(ws, "projects.propose")) redirect(`/s/${setId}/projects`);

  async function createProject(formData: FormData) {
    "use server";
    const workspace = await getWorkspace(setId);
    if (!can(workspace, "projects.propose")) redirect(`/s/${setId}/projects`);

    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    const supabase = await createClient();

    const titles = formData.getAll("milestone_title");
    const dueDates = formData.getAll("milestone_due_on");
    const milestones = titles
      .map((rawTitle, index) => ({
        title: String(rawTitle).trim(),
        due_on: String(dueDates[index] ?? "") || null,
      }))
      .filter((m) => m.title);

    // Goes through a security-definer RPC rather than direct inserts: a plain
    // proposer only holds projects.propose/.create, not projects.manage, so
    // their own client-side insert into project_sets/project_milestones would
    // be rejected by RLS, leaving the project permanently unmanageable.
    const { data: projectId, error } = await supabase.rpc("propose_project", {
      p_set_id: setId,
      p_title: title,
      p_summary: String(formData.get("summary") ?? "").trim() || null,
      p_description: String(formData.get("description") ?? "").trim() || null,
      p_category: String(formData.get("category") ?? "infrastructure"),
      p_currency: String(formData.get("currency") ?? workspace.set.currency).trim() || workspace.set.currency,
      p_estimated_cost: Number(formData.get("estimated_cost")) || 0,
      p_starts_on: String(formData.get("starts_on") ?? "") || null,
      p_target_end_on: String(formData.get("target_end_on") ?? "") || null,
      p_beneficiaries: String(formData.get("beneficiaries") ?? "").trim() || null,
      p_location: String(formData.get("location") ?? "").trim() || null,
      p_school_liaison_name: String(formData.get("school_liaison_name") ?? "").trim() || null,
      p_school_liaison_role: String(formData.get("school_liaison_role") ?? "").trim() || null,
      p_school_liaison_phone: String(formData.get("school_liaison_phone") ?? "").trim() || null,
      p_school_liaison_email: String(formData.get("school_liaison_email") ?? "").trim() || null,
      p_milestones: milestones,
    });

    if (error || !projectId) redirect(`/s/${setId}/projects/new`);

    redirect(`/s/${setId}/projects/${projectId}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/s/${setId}/projects`} className="btn btn-quiet btn-sm mb-4">← Back to projects</Link>
      <h1 className="t-h1">Propose a project</h1>
      <p className="t-lead mb-7 mt-2">
        A project belongs to {ws.set.institution.name}, not just your set — other sets can join in and fund it with you.
      </p>

      <Card>
        <form action={createProject} className="space-y-6">
          <section className="space-y-4">
            <Field label="Project title" name="title" required placeholder="New science laboratory" />
            <TextArea label="Summary" name="summary" rows={2} placeholder="One or two lines shown on the project list." />
            <TextArea label="Description" name="description" rows={5} placeholder="Full details — scope, context, why it matters." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" name="category" options={CATEGORIES} defaultValue="infrastructure" />
              <Field label="Currency" name="currency" defaultValue={ws.set.currency} />
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Estimated cost" name="estimated_cost" type="number" min={0} step={1000} defaultValue={0} />
              <Field label="Beneficiaries" name="beneficiaries" placeholder="e.g. SS3 science students" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts on" name="starts_on" type="date" />
              <Field label="Target end date" name="target_end_on" type="date" />
            </div>
            <Field label="Location" name="location" placeholder="e.g. Main campus, block C" />
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div><h2 className="font-display text-lg font-semibold">School contact</h2></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Liaison name" name="school_liaison_name" />
              <Field label="Liaison role" name="school_liaison_role" placeholder="e.g. Vice Principal" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Liaison phone" name="school_liaison_phone" />
              <Field label="Liaison email" name="school_liaison_email" type="email" />
            </div>
          </section>

          <ProjectMilestoneBuilder />

          <SubmitButton pendingLabel="Submitting…">Propose project</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
