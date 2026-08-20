import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, Card, SectionHeader } from "@/components/ui";
import { IconClock, IconGlobe, IconPin, IconPeople, IconDownload } from "@/components/icons";
import { RsvpControl } from "@/components/events/rsvp-control";
import { first } from "@/lib/rows";
import { countdown, formatDate, formatTime, money, relativeTime } from "@/lib/format";

export const metadata = { title: "Event" };
export const dynamic = "force-dynamic";

export default async function EventPage({
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
      `id, title, description, category, cover_url, starts_at, ends_at, all_day, location_name,
       address, city, state, is_virtual, meeting_url, meeting_provider, capacity, requires_rsvp,
       rsvp_deadline, ticket_amount, going_count, status, department_id,
       set_departments ( name, color ), profiles!events_created_by_fkey ( display_name, avatar_url )`,
    )
    .eq("id", eventId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!event) notFound();

  const [{ data: rsvps }, { data: mine }] = await Promise.all([
    supabase
      .from("event_rsvps")
      .select("id, status, guests, membership_id, set_memberships ( id, profiles!set_memberships_user_id_fkey ( display_name, avatar_url ) )")
      .eq("event_id", eventId)
      .in("status", ["going", "maybe", "attended"])
      .limit(60),
    supabase
      .from("event_rsvps")
      .select("id, status, guests")
      .eq("event_id", eventId)
      .eq("membership_id", ws.membershipId)
      .maybeSingle(),
  ]);

  const attendees = (rsvps ?? []).map((r) => {
    const sm = first(r.set_memberships) as { id: string; profiles: unknown } | null;
    const p = first(sm?.profiles as { display_name: string | null; avatar_url: string | null }) as
      | { display_name: string | null; avatar_url: string | null }
      | null;
    return {
      id: r.id as string,
      membershipId: sm?.id ?? "",
      name: p?.display_name ?? "Member",
      avatar: p?.avatar_url ?? null,
      status: r.status as string,
    };
  });

  const department = first(event.set_departments) as { name: string; color: string | null } | null;
  const organiser = first(event.profiles) as { display_name: string | null; avatar_url: string | null } | null;
  const upcoming = new Date(event.starts_at) > new Date();

  const calendarLink = buildIcsHref(event);

  return (
    <div className="mx-auto max-w-[62rem]">
      <Link href={`/s/${setId}/events`} className="btn btn-quiet btn-sm mb-4">← All events</Link>

      <div className="card overflow-hidden p-0">
        <div className="relative h-32 bg-gradient-to-br from-[var(--color-brand-deep)] via-[var(--color-brand)] to-[#14b3ba] sm:h-40">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/12 blur-2xl" />
          <div className="absolute bottom-4 left-5 flex flex-wrap gap-2 sm:left-7">
            <Badge tone="brand">{String(event.category).replace(/_/g, " ")}</Badge>
            {department ? <Badge tone="plum">{department.name}</Badge> : null}
            {event.is_virtual ? <Badge tone="info" icon="globe">Online</Badge> : null}
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <h1 className="t-h1">{event.title}</h1>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
                <IconClock size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">When</p>
                <p className="mt-0.5 font-medium">
                  {formatDate(event.starts_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-sm text-[var(--color-muted)]">
                  {event.all_day
                    ? "All day"
                    : `${formatTime(event.starts_at)}${event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}`}
                  {upcoming ? ` · ${countdown(event.starts_at)}` : ` · ${relativeTime(event.starts_at)}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
                {event.is_virtual ? <IconGlobe size={19} /> : <IconPin size={19} />}
              </span>
              <div className="min-w-0">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">Where</p>
                <p className="mt-0.5 font-medium">
                  {event.is_virtual ? event.meeting_provider ?? "Online" : event.location_name ?? "To be announced"}
                </p>
                {event.address || event.city ? (
                  <p className="text-sm text-[var(--color-muted)]">
                    {[event.address, event.city, event.state].filter(Boolean).join(", ")}
                  </p>
                ) : null}
                {event.is_virtual && event.meeting_url ? (
                  <a
                    href={event.meeting_url} target="_blank" rel="noreferrer"
                    className="mt-1 inline-block text-sm font-semibold text-[var(--color-brand-dark)]"
                  >
                    Join link
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {Number(event.ticket_amount) > 0 ? (
            <p className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-caution-soft)] px-3.5 py-2 text-sm font-semibold text-[var(--color-caution)]">
              Contribution: {money(event.ticket_amount, ws.set.currency)}
            </p>
          ) : null}

          {event.description ? (
            <div className="mt-6 whitespace-pre-wrap leading-relaxed text-[var(--color-ink-2)]">
              {event.description}
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-6">
            {event.requires_rsvp ? (
              <RsvpControl
                eventId={eventId}
                membershipId={ws.membershipId}
                current={mine ? { status: mine.status as string, guests: mine.guests as number } : null}
              />
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No RSVP needed — just show up.</p>
            )}
            <a href={calendarLink} download={`${event.title}.ics`} className="btn btn-ghost btn-sm">
              <IconDownload size={15} /> Add to calendar
            </a>
            {can(ws, "events.manage", event.department_id as string | null) ? (
              <Link href={`/s/${setId}/events/${eventId}/edit`} className="btn btn-ghost btn-sm">
                Edit event
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <SectionHeader
            title={`${event.going_count} attending`}
            hint={event.capacity ? `Capacity ${event.capacity}` : undefined}
          />
          {attendees.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-subtle)]">
              Nobody has responded yet. Be the first.
            </p>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {attendees.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/s/${setId}/people/${a.membershipId}`}
                    className="flex items-center gap-2.5 rounded-[var(--radius-sm)] p-1.5 transition hover:bg-[var(--color-surface-2)]"
                  >
                    <Avatar name={a.name} src={a.avatar} size={30} />
                    <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                    {a.status === "maybe" ? <Badge tone="caution">Maybe</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeader title="Organised by" />
          {organiser ? (
            <div className="flex items-center gap-3">
              <Avatar name={organiser.display_name} src={organiser.avatar_url} size={42} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{organiser.display_name ?? "An administrator"}</p>
                <p className="text-xs text-[var(--color-subtle)]">
                  {department ? `${department.name} department` : ws.set.name}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">{ws.set.name}</p>
          )}

          <div className="mt-5 border-t border-[var(--color-line)] pt-4">
            <p className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <IconPeople size={15} />
              {department
                ? "Only members of this department can see this event."
                : "Everyone in the set can see this event."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Minimal iCalendar payload so members can drop the event into any calendar app. */
function buildIcsHref(event: {
  id: string; title: string; description: string | null;
  starts_at: string; ends_at: string | null; location_name: string | null;
}) {
  const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 2 * 3600_000).toISOString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SetHub//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@sethub`,
    `DTSTART:${stamp(new Date(event.starts_at).toISOString())}`,
    `DTEND:${stamp(new Date(end).toISOString())}`,
    `SUMMARY:${event.title.replace(/\n/g, " ")}`,
    event.location_name ? `LOCATION:${event.location_name}` : "",
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, "\\n").slice(0, 500)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
