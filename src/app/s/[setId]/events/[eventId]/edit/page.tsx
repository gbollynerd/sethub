import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Card } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { slugify } from "@/lib/slug";

export const metadata = { title: "Edit event" };
export const dynamic = "force-dynamic";

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

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in the viewer's local time,
// not the UTC ISO string Postgres hands back — otherwise the field shows the
// wrong time (or nothing) when the form loads with existing values.
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ setId: string; eventId: string }>;
}) {
  const { setId, eventId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, description, category, starts_at, ends_at, location_name, address, city, is_virtual, meeting_url, capacity, ticket_amount, requires_rsvp, department_id",
    )
    .eq("id", eventId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!event) notFound();
  if (!can(ws, "events.manage", event.department_id as string | null)) redirect(`/s/${setId}/events/${eventId}`);

  async function updateEvent(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);

    const { data: existing } = await supabase
      .from("events")
      .select("id, department_id")
      .eq("id", eventId)
      .eq("set_id", setId)
      .maybeSingle();
    if (!existing) redirect(`/s/${setId}/events`);
    if (!can(workspace, "events.manage", existing.department_id as string | null)) {
      redirect(`/s/${setId}/events/${eventId}`);
    }

    const title = String(formData.get("title") ?? "").trim();
    const startsAt = String(formData.get("starts_at") ?? "");
    if (!title || !startsAt) return;

    const isVirtual = Boolean(formData.get("is_virtual"));

    await supabase
      .from("events")
      .update({
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
      })
      .eq("id", eventId)
      .eq("set_id", setId);

    redirect(`/s/${setId}/events/${eventId}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/s/${setId}/events/${eventId}`} className="btn btn-quiet btn-sm mb-4">← Back to event</Link>
      <h1 className="t-h1">Edit event</h1>
      <p className="t-lead mb-7 mt-2">Changes apply immediately and show up on the calendar right away.</p>

      <Card>
        <form action={updateEvent} className="space-y-4">
          <Field label="Event title" name="title" required defaultValue={event.title} placeholder="AGM 2026" />
          <TextArea
            label="Description" name="description" rows={4}
            defaultValue={event.description ?? ""}
            placeholder="Agenda, dress code, what to bring…"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" name="category" options={CATEGORIES} defaultValue={event.category} />
            {ws.departments.length ? (
              <Select
                label="Scope" name="department_id"
                options={ws.departments.map((d) => ({ value: d.id, label: d.name }))}
                defaultValue={event.department_id ?? ""}
                placeholder="Whole set"
                hint="Choose a department to keep it inside that community."
              />
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" name="starts_at" type="datetime-local" required defaultValue={toLocalInput(event.starts_at)} />
            <Field label="Ends" name="ends_at" type="datetime-local" defaultValue={toLocalInput(event.ends_at)} />
          </div>

          <Toggle label="This is an online event" name="is_virtual" defaultChecked={event.is_virtual} hint="Adds a join link instead of an address." />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Venue name" name="location_name" defaultValue={event.location_name ?? ""} placeholder="Sheraton Hotel, Ikeja" />
            <Field label="City" name="city" defaultValue={event.city ?? ""} placeholder="Lagos" />
          </div>
          <Field label="Address" name="address" defaultValue={event.address ?? ""} placeholder="30 Mobolaji Bank Anthony Way" />
          <Field label="Meeting link (online events)" name="meeting_url" type="url" defaultValue={event.meeting_url ?? ""} placeholder="https://meet.google.com/…" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Capacity" name="capacity" type="number" min={1} defaultValue={event.capacity ?? undefined} placeholder="Unlimited" />
            <Field
              label={`Contribution (${ws.set.currency})`} name="ticket_amount" type="number" min={0} step={100}
              defaultValue={event.ticket_amount ?? 0} hint="Leave at zero if the event is free."
            />
          </div>

          <Toggle label="Ask members to RSVP" name="requires_rsvp" defaultChecked={event.requires_rsvp} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
            <DeleteEventButton setId={setId} eventId={eventId} />
            <SubmitButton className="btn btn-primary" pendingLabel="Saving…">Save changes</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
