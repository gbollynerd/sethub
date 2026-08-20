import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { PageHeader, SectionHeader, StatTile } from "@/components/ui";
import { EventList } from "@/components/lists";
import { IconCalendar, IconPlus } from "@/components/icons";
import { first } from "@/lib/rows";

export const metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const now = new Date().toISOString();

  const select =
    "id, title, description, starts_at, ends_at, location_name, is_virtual, category, going_count, department_id, set_departments ( name )";

  let upcomingQuery = supabase
    .from("events").select(select).eq("set_id", setId)
    .gte("starts_at", now).order("starts_at").limit(40);
  if (sp.category) upcomingQuery = upcomingQuery.eq("category", sp.category);

  const [{ data: upcoming }, { data: past }, { data: myRsvps }] = await Promise.all([
    upcomingQuery,
    supabase
      .from("events").select(select).eq("set_id", setId)
      .lt("starts_at", now).order("starts_at", { ascending: false }).limit(12),
    supabase
      .from("event_rsvps")
      .select("event_id, status")
      .eq("membership_id", ws.membershipId)
      .eq("status", "going"),
  ]);

  const decorate = (rows: typeof upcoming) =>
    (rows ?? []).map((e) => ({
      ...e,
      department: first(e.set_departments) as { name: string } | null,
    }));

  const categories = [
    ["", "All events"], ["agm", "AGM"], ["reunion", "Reunion"], ["meeting", "Meetings"],
    ["fundraiser", "Fundraisers"], ["trivia", "Trivia"], ["school_visit", "School visits"],
    ["sports", "Sports"], ["dinner", "Dinner"],
  ] as const;

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Events"
        description="AGMs, reunions, committee meetings, trivia nights — everything the set is planning."
        action={
          <>
            <Link href={`/s/${setId}/calendar`} className="btn btn-ghost btn-sm">
              <IconCalendar size={15} /> Calendar
            </Link>
            {can(ws, "events.create") ? (
              <Link href={`/s/${setId}/events/new`} className="btn btn-primary btn-sm">
                <IconPlus size={15} /> New event
              </Link>
            ) : null}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Upcoming" value={(upcoming ?? []).length} icon="calendar" tone="brand" />
        <StatTile label="You are attending" value={(myRsvps ?? []).length} icon="check" tone="positive" />
        <StatTile label="Held so far" value={(past ?? []).length} icon="clock" tone="info" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {categories.map(([value, label]) => (
          <Link
            key={label}
            href={value ? `/s/${setId}/events?category=${value}` : `/s/${setId}/events`}
            className={`chip transition ${
              (sp.category ?? "") === value ? "chip-brand" : "hover:border-[var(--color-ink)]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <section className="mb-9">
        <SectionHeader title="Coming up" />
        <EventList setId={setId} items={decorate(upcoming)} />
      </section>

      {past?.length ? (
        <section>
          <SectionHeader title="Already happened" />
          <EventList setId={setId} items={decorate(past)} />
        </section>
      ) : null}
    </div>
  );
}
