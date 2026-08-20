import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, Card, PageHeader, SectionHeader } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { IconDepartment, IconLock, IconShield } from "@/components/icons";

export const metadata = { title: "Set settings" };
export const dynamic = "force-dynamic";

const JOIN_POLICIES = [
  { value: "open", label: "Open — anyone who finds the set can join" },
  { value: "request", label: "Request — an administrator approves each person" },
  { value: "invite_only", label: "Invite only — a link or code is required" },
  { value: "closed", label: "Closed — nobody new for now" },
];

const CURRENCIES = [
  { value: "NGN", label: "Nigerian Naira (₦)" },
  { value: "GHS", label: "Ghanaian Cedi (₵)" },
  { value: "KES", label: "Kenyan Shilling (KSh)" },
  { value: "ZAR", label: "South African Rand (R)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "GBP", label: "Pound Sterling (£)" },
  { value: "EUR", label: "Euro (€)" },
];

export default async function SetSettingsPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const canManage = can(ws, "settings.manage");

  async function saveSettings(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);
    if (!can(workspace, "settings.manage")) return;

    await supabase
      .from("sets")
      .update({
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim() || null,
        motto: String(formData.get("motto") ?? "").trim() || null,
        join_policy: String(formData.get("join_policy") ?? "request"),
        currency: String(formData.get("currency") ?? "NGN"),
        discoverable: Boolean(formData.get("discoverable")),
        departments_enabled: Boolean(formData.get("departments_enabled")),
        department_required: Boolean(formData.get("department_required")),
      })
      .eq("id", setId);

    await supabase.rpc("log_audit", {
      p_set: setId,
      p_action: "set.settings_updated",
      p_entity_type: "set",
      p_entity_id: setId,
      p_label: null,
      p_summary: "Set settings changed",
      p_dept: null,
      p_before: null,
      p_after: null,
    });

    redirect(`/s/${setId}/settings?saved=1`);
  }

  return (
    <div className="mx-auto max-w-[52rem]">
      <PageHeader
        eyebrow={ws.set.institution.name}
        title="Set settings"
        description="How this community presents itself, who can get in, and whether it runs departments."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={`/s/${setId}/settings/profile`} className="btn btn-ghost btn-sm">My set profile</Link>
        <Link href={`/account`} className="btn btn-ghost btn-sm">My global account</Link>
        {canManage ? (
          <Link href={`/s/${setId}/admin`} className="btn btn-ghost btn-sm">Administration</Link>
        ) : null}
      </div>

      {!canManage ? (
        <Card>
          <div className="flex items-start gap-3">
            <IconLock size={20} className="mt-0.5 shrink-0 text-[var(--color-subtle)]" />
            <div>
              <p className="font-display text-sm font-semibold">Only administrators can change set settings</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                You can still edit your own profile in this set, and your notification preferences.
              </p>
              <Link href={`/s/${setId}/settings/profile`} className="btn btn-primary btn-sm mt-4">
                Edit my set profile
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <SectionHeader title="Identity" hint="What members and prospective members see" />
            <form action={saveSettings} className="space-y-4">
              <Field label="Set name" name="name" required defaultValue={ws.set.name} hint="Usually “Class of 2012”." />
              <Field label="Motto" name="motto" defaultValue={ws.set.motto ?? ""} placeholder="Once a Falcon, always a Falcon" />
              <TextArea
                label="Description" name="description" rows={3}
                placeholder="Who this set is and what it does"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Who can join" name="join_policy" options={JOIN_POLICIES} defaultValue={ws.set.join_policy} />
                <Select label="Currency" name="currency" options={CURRENCIES} defaultValue={ws.set.currency} />
              </div>

              <Toggle
                label="Discoverable in the directory" name="discoverable" defaultChecked
                hint="Other alumni searching for your school can find this set and request to join."
              />

              <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-4">
                <p className="flex items-center gap-2 font-display text-sm font-semibold">
                  <IconDepartment size={16} className="text-[var(--color-brand)]" /> Departments
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
                  University, polytechnic and college sets usually want these on: each department
                  becomes a closed community with its own channels, announcements, events and dues.
                  Secondary school sets normally leave them off.
                </p>
                <div className="mt-3.5 space-y-2.5">
                  <Toggle
                    label="Enable department sub-communities" name="departments_enabled"
                    defaultChecked={ws.set.departments_enabled}
                  />
                  <Toggle
                    label="Require a department at sign-up" name="department_required"
                    defaultChecked={ws.set.department_required}
                    hint="New members must pick their department before they finish joining."
                  />
                </div>
                {ws.set.departments_enabled ? (
                  <Link href={`/s/${setId}/departments`} className="btn btn-ghost btn-sm mt-3.5">
                    Manage the {ws.departments.length} departments
                  </Link>
                ) : null}
              </div>

              <SubmitButton className="btn btn-primary" pendingLabel="Saving…">Save settings</SubmitButton>
            </form>
          </Card>

          <Card>
            <SectionHeader title="Verification & ownership" />
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] p-4">
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold">Set verification</p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                    Verified sets get a badge and rank higher in the directory.
                  </p>
                </div>
                <Badge tone={ws.set.status === "verified" ? "positive" : "caution"}>
                  {ws.set.status === "verified" ? "Verified" : "Pending review"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-display text-sm font-semibold">
                    <IconShield size={15} className="text-[var(--color-brand)]" /> Ownership
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                    Exactly one person owns a set. Hand it to the incoming president when the term
                    changes — the transfer is recorded permanently.
                  </p>
                </div>
                {ws.isOwner ? (
                  <Link href={`/s/${setId}/settings/transfer`} className="btn btn-ghost btn-sm shrink-0">
                    Transfer ownership
                  </Link>
                ) : (
                  <Badge>Owner only</Badge>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
