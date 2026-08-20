import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Card } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { slugify } from "@/lib/slug";

export const metadata = { title: "Create an event" };

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "agm", label: "Annual general meeting" },
  { value: "reunion", label: "Reunion" },
  { value: "meeting", label: "Committee meeting" },
  { value: "dinner", label: "Dinner" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "school_visit", label: "School visit" },
  { value: "trivia", label: "Trivia night" },
  { value: "sports", label: "Sports" },
  { value: "memorial", label: "Memorial" },
  { value: "webinar", label: "Webinar" },
];

export default async function NewEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ department?: string }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);

  if (!can(ws, "events.create", sp.department ?? null)) redirect(`/s/${setId}/events`);

  async function createEvent(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);

    const title = String(formData.get("title") ?? "").trim();
    const startsAt = String(formData.get("starts_at") ?? "");
    if (!title || !startsAt) return;

    const isVirtual = Boolean(formData.get("is_virtual"));

    const { data, error } = await supabase
      .from("events")
      .insert({
        set_id: setId,
        department_id: String(formData.get("department_id") ?? "") || null,
        title,
        slug: slugify(title),
        description: String(formData.get("description") ?? "").trim() || null,
        category: String(formData.get("category") ?? "general"),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: formData.get("ends_at") ? new Date(String(formData.get("ends_at"))).toISOString() : null,
        location_name: String(formData.get("location_name") ?? "").trim() || null,
        address: String(formData.get("address") ?? "").trim() || null,
        city: String(formData.get("city") ?? "").trim() || null,
        is_virtual: isVirtual,
        meeting_url: isVirtual ? String(formData.get("meeting_url") ?? "").trim() || null : null,
        capacity: Number(formData.get("capacity")) || null,
        ticket_amount: Number(formData.get("ticket_amount")) || 0,
        requires_rsvp: Boolean(formData.get("requires_rsvp")),
        created_by: workspace.userId,
      })
      .select("id")
      .single();

    if (error || !data) redirect(`/s/${setId}/events`);
    redirect(`/s/${setId}/events/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/s/${setId}/events`} className="btn btn-quiet btn-sm mb-4">← Back to events</Link>
      <h1 className="t-h1">Create an event</h1>
      <p className="t-lead mb-7 mt-2">
        It lands on the set&apos;s unified calendar straight away, and goes out to any connected
        WhatsApp group or mailing list.
      </p>

      <Card>
        <form action={createEvent} className="space-y-4">
          <Field label="Event title" name="title" required placeholder="AGM 2026" />
          <TextArea label="Description" name="description" rows={4} placeholder="Agenda, dress code, what to bring…" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" name="category" options={CATEGORIES} defaultValue="general" />
            {ws.departments.length ? (
              <Select
                label="Scope" name="department_id"
                options={ws.departments.map((d) => ({ value: d.id, label: d.name }))}
                defaultValue={sp.department ?? ""}
                placeholder="Whole set"
                hint="Choose a department to keep it inside that community."
              />
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" name="starts_at" type="datetime-local" required />
            <Field label="Ends" name="ends_at" type="datetime-local" />
          </div>

          <Toggle label="This is an online event" name="is_virtual" hint="Adds a join link instead of an address." />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Venue name" name="location_name" placeholder="Sheraton Hotel, Ikeja" />
            <Field label="City" name="city" placeholder="Lagos" />
          </div>
          <Field label="Address" name="address" placeholder="30 Mobolaji Bank Anthony Way" />
          <Field label="Meeting link (online events)" name="meeting_url" type="url" placeholder="https://meet.google.com/…" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Capacity" name="capacity" type="number" min={1} placeholder="Unlimited" />
            <Field
              label={`Contribution (${ws.set.currency})`} name="ticket_amount" type="number" min={0} step={100}
              placeholder="0" hint="Leave at zero if the event is free."
            />
          </div>

          <Toggle label="Ask members to RSVP" name="requires_rsvp" defaultChecked />

          <SubmitButton pendingLabel="Creating…">Create event</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
