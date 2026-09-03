"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/forms";
import { IconClose } from "@/components/icons";

// Deleting an election has no undo, so this asks the browser's native confirm
// dialog before it touches the database — same pattern as delete-event-button.
export function DeleteElectionButton({ setId, electionId }: { setId: string; electionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const remove = () => {
    if (!window.confirm("Delete this election? This can't be undone.")) return;
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { error: err } = await supabase.from("elections").delete().eq("id", electionId).eq("set_id", setId);
      if (err) {
        setError(err.message);
        return;
      }
      router.push(`/s/${setId}/elections`);
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
        {pending ? <><Spinner /> Deleting…</> : <><IconClose size={14} /> Delete election</>}
      </button>
      {error ? <p className="mt-1.5 text-xs text-[var(--color-critical)]">{error}</p> : null}
    </div>
  );
}
