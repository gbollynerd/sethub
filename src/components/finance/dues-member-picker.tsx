"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui";

export interface PickableMember {
  id: string;
  name: string;
  avatar: string | null;
  sub: string | null;
}

/** Search-and-add member picker for "custom" dues scope — filters a
 * server-fetched roster client-side, same pattern as the EXCO assign flow's
 * member search. Selected members are submitted as repeated hidden
 * `member_ids` inputs so the create-dues server action can read them via
 * formData.getAll("member_ids"). */
export function DuesMemberPicker({ members }: { members: PickableMember[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PickableMember[]>([]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const chosen = new Set(selected.map((s) => s.id));
    return members
      .filter((m) => !chosen.has(m.id) && m.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [members, query, selected]);

  const add = (m: PickableMember) => {
    setSelected((prev) => (prev.some((s) => s.id === m.id) ? prev : [...prev, m]));
    setQuery("");
  };

  const remove = (id: string) => setSelected((prev) => prev.filter((s) => s.id !== id));

  return (
    <div>
      <label className="field-label">Search members to add</label>
      <input
        className="field"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Start typing a name…"
      />
      {matches.length ? (
        <ul className="mt-2 space-y-1 rounded-[var(--radius-sm)] border border-[var(--color-line)] p-1.5">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => add(m)}
                className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm transition hover:bg-[var(--color-surface-2)]"
              >
                <Avatar name={m.name} src={m.avatar} size={22} />
                {m.name}
                {m.sub ? <span className="text-xs text-[var(--color-subtle)]">{m.sub}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim() ? (
        <p className="mt-2 text-xs text-[var(--color-subtle)]">No members match that search.</p>
      ) : null}

      {selected.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selected.map((m) => (
            <span key={m.id} className="chip flex items-center gap-1.5">
              <input type="hidden" name="member_ids" value={m.id} />
              {m.name}
              <button
                type="button"
                onClick={() => remove(m.id)}
                className="text-[var(--color-subtle)] hover:text-[var(--color-critical)]"
                aria-label={`Remove ${m.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-subtle)]">No members selected yet.</p>
      )}
    </div>
  );
}
