import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { slugify } from "@/lib/slug";

export const metadata = { title: "Create a channel" };

export default async function NewChannelPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);

  if (!can(ws, "channels.create")) redirect(`/s/${setId}/chat`);

  async function createChannel(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);

    const name = slugify(String(formData.get("name") ?? "")) || "new-channel";
    const departmentId = String(formData.get("department_id") ?? "") || null;

    const { data, error } = await supabase
      .from("channels")
      .insert({
        set_id: setId,
        department_id: departmentId,
        name,
        slug: name,
        topic: String(formData.get("topic") ?? "").trim() || null,
        description: String(formData.get("description") ?? "").trim() || null,
        visibility: formData.get("private") ? "private" : "public",
        is_announcement: Boolean(formData.get("announcement")),
        allow_files: Boolean(formData.get("allow_files")),
        created_by: workspace.userId,
      })
      .select("id")
      .single();

    if (error || !data) redirect(`/s/${setId}/chat?error=${encodeURIComponent(error?.message ?? "failed")}`);

    await supabase.from("channel_members").insert({
      channel_id: data.id,
      membership_id: workspace.membershipId,
      role: "owner",
    });

    redirect(`/s/${setId}/chat/${data.id}`);
  }

  const departmentOptions = ws.departments.map((d) => ({ value: d.id, label: d.name }));

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-10">
      <Link href={`/s/${setId}/chat`} className="btn btn-quiet btn-sm mb-4">← Back to chat</Link>
      <h1 className="t-h2">Create a channel</h1>
      <p className="t-lead mb-7 mt-2">
        Channels keep conversations tidy — one for the reunion, one for the project committee, one
        for football arguments.
      </p>

      <form action={createChannel} className="card space-y-4 p-6">
        <Field
          label="Channel name" name="name" required placeholder="reunion-2026"
          hint="Lower case, no spaces. We will tidy it up for you."
        />
        <Field label="Topic" name="topic" placeholder="Planning the 2026 reunion" />
        <TextArea label="Description" name="description" rows={3} placeholder="What is this channel for?" />

        {departmentOptions.length ? (
          <Select
            label="Scope" name="department_id" options={departmentOptions}
            placeholder="Set-wide — everyone in the set"
            hint="Pick a department to make this a department-only channel."
          />
        ) : null}

        <div className="space-y-2.5">
          <Toggle
            label="Private channel" name="private"
            hint="Only invited members can see it or read its history."
          />
          <Toggle
            label="Announcement channel" name="announcement"
            hint="Only people with permission to post announcements can write here."
          />
          <Toggle label="Allow file sharing" name="allow_files" defaultChecked />
        </div>

        <SubmitButton pendingLabel="Creating…">Create channel</SubmitButton>
      </form>
    </div>
  );
}
