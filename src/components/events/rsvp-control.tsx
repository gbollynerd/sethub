"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/forms";
import { IconCheck, IconClose } from "@/components/icons";

const OPTIONS = [
  { value: "going", label: "I'm going", tone: "btn-primary" },
  { value: "maybe", label: "Maybe", tone: "btn-ghost" },
  { value: "not_going", label: "Can't make it", tone: "btn-ghost" },
] as const;

export function RsvpControl({
  eventId,
  membershipId,
  current,
}: {
  eventId: string;
  membershipId: string;
  current: { status: string; guests: number } | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(current?.status ?? null);
  const [guests, setGuests] = useState(current?.guests ?? 0);
  const [pending, start] = useTransition();

  const respond = (value: string, guestCount = guests) =>
    start(async () => {
      const supabase = createClient();
      await supabase.from("event_rsvps").upsert(
        {
          event_id: eventId,
          membership_id: membershipId,
          status: value,
          guests: guestCount,
          responded_at: new Date().toISOString(),
        },
        { onConflict: "event_id,membership_id" },
      );
      setStatus(value);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => respond(o.value)}
          disabled={pending}
          className={`btn btn-sm ${status === o.value ? "btn-primary" : "btn-ghost"}`}
        >
          {pending && status === o.value ? <Spinner /> : status === o.value ? <IconCheck size={14} /> : null}
          {o.label}
        </button>
      ))}

      {status === "going" ? (
        <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          Guests
          <input
            type="number" min={0} max={9} value={guests}
            onChange={(e) => {
              const g = Number(e.target.value);
              setGuests(g);
              respond("going", g);
            }}
            className="field w-16 px-2 py-1.5 text-center"
          />
        </label>
      ) : null}

      {status === "not_going" ? (
        <span className="flex items-center gap-1.5 text-sm text-[var(--color-subtle)]">
          <IconClose size={14} /> Noted — you will still see updates.
        </span>
      ) : null}
    </div>
  );
}
