import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Card } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea } from "@/components/forms";
import { ProjectMilestoneEditor } from "@/components/projects/project-milestone-editor";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";

export const metadata = { title: "Edit project" };
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

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ setId: string; projectId: string }>;
}) {
  const { setId, projectId } = await params;
  const ws = await getWorkspace(setId);
  if (!can(ws, "projects.manage")) redirect(`/s/${setId}/projects/${projectId}`);

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      `id, title, summary, description, category, currency, estimated_cost, starts_on, target_end_on,
       beneficiaries, location, school_liaison_name, school_liaison_role, school_liaison_phone, school_liaison_email`,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (!project) notFound();

  const { data: milestones } = await supabase
    .from("project_milestones")
    .select("id, title, due_on, completed_on")
    .eq("project_id", projectId)
    .order("sort_order");

  async function updateProject(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);
    if (!can(workspace, "projects.manage")) redirect(`/s/${setId}/projects/${projectId}`);

    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    await supabase
      .from("projects")
      .update({
        title,
        summary: String(formData.get("summary") ?? "").trim() || null,
        description: String(formData.get("description") ?? "").trim() || null,
        category: String(formData.get("category") ?? "infrastructure"),
        currency: String(formData.get("currency") ?? "NGN").trim() || "NGN",
        estimated_cost: Number(formData.get("estimated_cost")) || 0,
        starts_on: String(formData.get("starts_on") ?? "") || null,
        target_end_on: String(formData.get("target_end_on") ?? "") || null,
        beneficiaries: String(formData.get("beneficiaries") ?? "").trim() || null,
        location: String(formData.get("location") ?? "").trim() || null,
        school_liaison_name: String(formData.get("school_liaison_name") ?? "").trim() || null,
        school_liaison_role: String(formData.get("school_liaison_role") ?? "").trim() || null,
        school_liaison_phone: String(formData.get("school_liaison_phone") ?? "").trim() || null,
        school_liaison_email: String(formData.get("school_liaison_email") ?? "").trim() || null,
      })
      .eq("id", projectId);

    redirect(`/s/${setId}/projects/${projectId}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/s/${setId}/projects/${projectId}`} className="btn btn-quiet btn-sm mb-4">← Back to project</Link>
      <h1 className="t-h1">Edit project</h1>
      <p className="t-lead mb-7 mt-2">Changes apply immediately across every set participating in this project.</p>

      <Card>
        <form action={updateProject} className="space-y-6">
          <section className="space-y-4">
            <Field label="Project title" name="title" required defaultValue={project.title} />
            <TextArea label="Summary" name="summary" rows={2} defaultValue={project.summary ?? ""} />
            <TextArea label="Description" name="description" rows={5} defaultValue={project.description ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" name="category" options={CATEGORIES} defaultValue={project.category} />
              <Field label="Currency" name="currency" defaultValue={project.currency} />
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Estimated cost" name="estimated_cost" type="number" min={0} step={1000} defaultValue={project.estimated_cost} />
              <Field label="Beneficiaries" name="beneficiaries" defaultValue={project.beneficiaries ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts on" name="starts_on" type="date" defaultValue={project.starts_on ?? ""} />
              <Field label="Target end date" name="target_end_on" type="date" defaultValue={project.target_end_on ?? ""} />
            </div>
            <Field label="Location" name="location" defaultValue={project.location ?? ""} />
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div><h2 className="font-display text-lg font-semibold">School contact</h2></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Liaison name" name="school_liaison_name" defaultValue={project.school_liaison_name ?? ""} />
              <Field label="Liaison role" name="school_liaison_role" defaultValue={project.school_liaison_role ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Liaison phone" name="school_liaison_phone" defaultValue={project.school_liaison_phone ?? ""} />
              <Field label="Liaison email" name="school_liaison_email" type="email" defaultValue={project.school_liaison_email ?? ""} />
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
            <DeleteProjectButton setId={setId} projectId={projectId} />
            <SubmitButton className="btn btn-primary" pendingLabel="Saving…">Save changes</SubmitButton>
          </div>
        </form>
      </Card>

      <div className="mt-6">
        <ProjectMilestoneEditor
          projectId={projectId}
          milestones={(milestones ?? []).map((m) => ({
            id: m.id as string,
            title: m.title as string,
            due_on: m.due_on as string | null,
            completed_on: m.completed_on as string | null,
          }))}
        />
      </div>
    </div>
  );
}
