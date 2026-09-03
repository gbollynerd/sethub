"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/forms";
import { IconClose } from "@/components/icons";

export function DeleteDuesButton({ setId, duesId }: { setId: string; duesId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const remove = () => {
    if (!window.confirm("Delete this due? Any assignments and payment history tied to it go too. This can't be undone.")) return;
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { error: err } = await supabase.from("dues").delete().eq("id", duesId).eq("set_id", setId);
      if (err) {
        setError(err.message);
        return;
      }
      router.push(`/s/${setId}/finances/dues`);
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
        {pending ? <><Spinner /> Deleting…</> : <><IconClose size={14} /> Delete due</>}
      </button>
      {error ? <p className="mt-1.5 text-xs text-[var(--color-critical)]">{error}</p> : null}
    </div>
  );
}
