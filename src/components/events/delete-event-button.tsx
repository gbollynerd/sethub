"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/forms";
import { IconClose } from "@/components/icons";

// Deleting an event has no undo, so this asks the browser's native confirm
// dialog before it touches the database — same "are you sure" gate as any
// other destructive action, just without a bespoke modal for a one-off.
export function DeleteEventButton({ setId, eventId }: { setId: string; eventId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const remove = () => {
    if (!window.confirm("Delete this event? This can't be undone.")) return;
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { error: err } = await supabase.from("events").delete().eq("id", eventId).eq("set_id", setId);
      if (err) {
        setError(err.message);
        return;
      }
      router.push(`/s/${setId}/events`);
      router.refresh();
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="btn btn-ghost btn-sm text-[var(--color-critical)] hover:bg-[var(--color-critical-soft)]"
      >
        {pending ? <><Spinner /> Deleting…</> : <><IconClose size={14} /> Delete event</>}
      </button>
      {error ? <p className="mt-1.5 text-xs text-[var(--color-critical)]">{error}</p> : null}
    </div>
  );
}
