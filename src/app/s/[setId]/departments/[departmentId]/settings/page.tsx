import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { InviteManager } from "@/components/admin/invite-manager";
import { IconDepartment, IconLock } from "@/components/icons";

export const metadata = { title: "Department settings" };
export const dynamic = "force-dynamic";

const JOIN_POLICIES = [
  { value: "open", label: "Open — any member of the set can join" },
  { value: "request", label: "Request — a department admin approves" },
  { value: "invite_only", label: "Invite only — link or invitation required" },
  { value: "closed", label: "Closed — nobody new for now" },
];

export default async function DepartmentSettingsPage({
  params,
}: {
  params: Promise<{ setId: string; departmentId: string }>;
}) {
  const { setId, departmentId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const canEdit =
    ws.isOwner ||
    ws.departmentAdminIds.includes(departmentId) ||
    ws.permissions.includes("departments.edit");

  const { data: department } = await supabase
    .from("set_departments")
    .select("id, name, short_name, description, color, join_policy, is_visible_to_set")
    .eq("id", departmentId)
    .maybeSingle();

  if (!department) redirect(`/s/${setId}/departments`);

  async function save(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);
    const allowed =
      workspace.isOwner ||
      workspace.departmentAdminIds.includes(departmentId) ||
      workspace.permissions.includes("departments.edit");
    if (!allowed) return;

    await supabase
      .from("set_departments")
      .update({
        name: String(formData.get("name") ?? "").trim(),
        short_name: String(formData.get("short_name") ?? "").trim() || null,
        description: String(formData.get("description") ?? "").trim() || null,
        color: String(formData.get("color") ?? "#0898A0"),
        join_policy: String(formData.get("join_policy") ?? "open"),
        is_visible_to_set: Boolean(formData.get("is_visible_to_set")),
      })
      .eq("id", departmentId);

    redirect(`/s/${setId}/departments/${departmentId}/settings?saved=1`);
  }

  if (!canEdit) {
    return (
      <EmptyState
        icon="lock"
        title="Only department admins can change these settings"
        description="Ask a department administrator or a set administrator if something needs updating."
      />
    );
  }

  return (
    <div className="space-y-7">
      <Card>
        <SectionHeader title="Department details" hint="How this sub-community appears inside the set" />
        <form action={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department name" name="name" required defaultValue={department.name} />
            <Field label="Short name" name="short_name" defaultValue={department.short_name ?? ""} placeholder="CS" />
          </div>
          <TextArea
            label="Description" name="description" rows={3}
            defaultValue={department.description ?? ""}
            placeholder="What this department community is for"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="color">Accent colour</label>
              <input
                id="color" name="color" type="color"
                defaultValue={department.color ?? "#0898A0"}
                className="field h-[3.05rem] cursor-pointer p-1.5"
              />
            </div>
            <Select
              label="Who can join" name="join_policy" options={JOIN_POLICIES}
              defaultValue={department.join_policy}
            />
          </div>
          <Toggle
            label="Visible to the rest of the set" name="is_visible_to_set"
            defaultChecked={department.is_visible_to_set}
            hint="Other departments can see that this one exists and how many members it has — but never its channels, announcements or dues."
          />
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">Save changes</SubmitButton>
        </form>
      </Card>

      <Card>
        <SectionHeader
          title="Department invite links"
          hint="Department admins can invite people straight into this community"
        />
        <InviteManager setId={setId} departmentId={departmentId} scopeLabel={department.name} />
      </Card>

      <Card>
        <SectionHeader title="How departments fit together" />
        <ul className="space-y-3 text-sm leading-relaxed text-[var(--color-muted)]">
          <li className="flex gap-3">
            <IconLock size={17} className="mt-0.5 shrink-0 text-[var(--color-brand)]" />
            <span>
              <strong className="text-[var(--color-ink)]">Closed by default.</strong> Channels,
              announcements, events and dues created here are invisible to other departments.
            </span>
          </li>
          <li className="flex gap-3">
            <IconDepartment size={17} className="mt-0.5 shrink-0 text-[var(--color-brand)]" />
            <span>
              <strong className="text-[var(--color-ink)]">Still part of the set.</strong> Everyone here
              keeps full access to set-wide channels, the member directory and school projects.
            </span>
          </li>
        </ul>
        <Link href={`/s/${setId}/departments`} className="btn btn-ghost btn-sm mt-5">
          Back to all departments
        </Link>
      </Card>
    </div>
  );
}
