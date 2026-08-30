"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/forms";
import { IconClose } from "@/components/icons";

// Groups are soft-deleted (archived_at set) — the groups list and RLS
// already filter on archived_at is null, so this is enough to retire a
// group without losing its history (past messages, member list, etc).
export function DeleteGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const remove = () => {
    if (!window.confirm(`Delete "${groupName}"? Members will lose access; this can't be undone from here.`)) return;
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { error: err } = await supabase
        .from("groups")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", groupId);
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="btn btn-ghost btn-sm w-full text-[var(--color-critical)] hover:bg-[var(--color-critical-soft)]"
      >
        {pending ? <><Spinner /> Deleting…</> : <><IconClose size={14} /> Delete group</>}
      </button>
      {error ? <p className="mt-1.5 text-xs text-[var(--color-critical)]">{error}</p> : null}
    </div>
  );
}
