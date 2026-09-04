"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/forms";
import { IconClose, IconPlus } from "@/components/icons";

export interface EditablePosition {
  id: string;
  title: string;
  description: string | null;
  seats: number;
  sortOrder: number;
}

/**
 * Per-row live editor for an election's positions — each row saves itself on
 * blur, mirroring the mutation style in admin/exco-manager.tsx rather than
 * bundling everything behind one form submit.
 */
export function ElectionPositionEditor({
  electionId,
  positions,
}: {
  electionId: string;
  positions: EditablePosition[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (id: string, patch: { title?: string; description?: string | null; seats?: number }) =>
    start(async () => {
      setError(null);
      const { error: err } = await supabase.from("election_positions").update(patch).eq("id", id);
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    });

  const remove = (id: string) => {
    if (!window.confirm("Remove this position? Any candidates for it will be removed too.")) return;
    start(async () => {
      setError(null);
      const { error: err } = await supabase.from("election_positions").delete().eq("id", id);
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    });
  };

  const add = () =>
    start(async () => {
      setError(null);
      const { error: err } = await supabase.from("election_positions").insert({
        election_id: electionId,
        title: "New position",
        seats: 1,
        sort_order: positions.length,
      });
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    });

  return (
    <section className="border-t border-[var(--color-line)] pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Positions</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Changes save automatically as you leave a field.</p>
        </div>
        <button type="button" onClick={add} disabled={pending} className="btn btn-ghost btn-sm">
          <IconPlus size={15} /> Add position
        </button>
      </div>

      {error ? <div className="mt-3"><Alert tone="error">{error}</Alert></div> : null}

      <div className="mt-4 space-y-3">
        {positions.map((position) => (
          <PositionRow key={position.id} position={position} pending={pending} onSave={save} onRemove={remove} />
        ))}
        {positions.length === 0 ? (
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-3.5 text-sm text-[var(--color-subtle)]">
            No positions yet. Add one above.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PositionRow({
  position,
  pending,
  onSave,
  onRemove,
}: {
  position: EditablePosition;
  pending: boolean;
  onSave: (id: string, patch: { title?: string; description?: string | null; seats?: number }) => void;
  onRemove: (id: string) => void;
}) {
  const [title, setTitle] = useState(position.title);
  const [description, setDescription] = useState(position.description ?? "");
  const [seats, setSeats] = useState(String(position.seats));

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onRemove(position.id)}
          disabled={pending}
          className="btn btn-quiet btn-sm text-[var(--color-critical)]"
          aria-label={`Remove ${position.title}`}
        >
          <IconClose size={14} /> Remove
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <div>
          <label className="field-label">Position title</label>
          <input
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== position.title && onSave(position.id, { title: title.trim() })}
          />
        </div>
        <div>
          <label className="field-label">Seats</label>
          <input
            className="field"
            type="number"
            min={1}
            max={20}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            onBlur={() => {
              const n = Math.max(1, Math.min(20, Number(seats) || 1));
              if (n !== position.seats) onSave(position.id, { seats: n });
            }}
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="field-label">Brief description <span className="normal-case tracking-normal text-[var(--color-subtle)]">(optional)</span></label>
        <input
          className="field"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            const next = description.trim() || null;
            if (next !== (position.description ?? null)) onSave(position.id, { description: next });
          }}
        />
      </div>
    </div>
  );
}
