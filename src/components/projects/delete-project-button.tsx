"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/forms";
import { IconClose } from "@/components/icons";

export function DeleteProjectButton({ setId, projectId }: { setId: string; projectId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const remove = () => {
    if (!window.confirm("Delete this project? This can't be undone.")) return;
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { error: err } = await supabase.from("projects").delete().eq("id", projectId);
      if (err) {
        setError(err.message);
        return;
      }
      router.push(`/s/${setId}/projects`);
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
        {pending ? <><Spinner /> Deleting…</> : <><IconClose size={14} /> Delete project</>}
      </button>
      {error ? <p className="mt-1.5 text-xs text-[var(--color-critical)]">{error}</p> : null}
    </div>
  );
}
