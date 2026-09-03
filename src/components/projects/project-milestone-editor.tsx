"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/forms";
import { IconCheck, IconClose, IconPlus } from "@/components/icons";

export interface EditableMilestone {
  id: string;
  title: string;
  due_on: string | null;
  completed_on: string | null;
}

/** Per-row live editor for a project's milestones — same style as exco-manager.tsx. */
export function ProjectMilestoneEditor({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: EditableMilestone[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (id: string, patch: Record<string, unknown>) =>
    start(async () => {
      setError(null);
      const { error: err } = await supabase.from("project_milestones").update(patch).eq("id", id);
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    });

  const remove = (id: string) => {
    if (!window.confirm("Remove this milestone?")) return;
    start(async () => {
      setError(null);
      const { error: err } = await supabase.from("project_milestones").delete().eq("id", id);
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
      const { error: err } = await supabase.from("project_milestones").insert({
        project_id: projectId,
        title: "New milestone",
        sort_order: milestones.length,
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
          <h2 className="font-display text-lg font-semibold">Milestones</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Changes save automatically as you leave a field.</p>
        </div>
        <button type="button" onClick={add} disabled={pending} className="btn btn-ghost btn-sm">
          <IconPlus size={15} /> Add milestone
        </button>
      </div>

      {error ? <div className="mt-3"><Alert tone="error">{error}</Alert></div> : null}

      <div className="mt-4 space-y-3">
        {milestones.map((m) => (
          <MilestoneRow key={m.id} milestone={m} pending={pending} onSave={save} onRemove={remove} />
        ))}
        {milestones.length === 0 ? (
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-3.5 text-sm text-[var(--color-subtle)]">
            No milestones yet. Add one above.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function MilestoneRow({
  milestone,
  pending,
  onSave,
  onRemove,
}: {
  milestone: EditableMilestone;
  pending: boolean;
  onSave: (id: string, patch: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
}) {
  const [title, setTitle] = useState(milestone.title);
  const [dueOn, setDueOn] = useState(milestone.due_on ?? "");
  const completed = Boolean(milestone.completed_on);

  const toggleCompleted = () =>
    onSave(milestone.id, { completed_on: completed ? null : new Date().toISOString().slice(0, 10) });

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <div>
          <label className="field-label">Title</label>
          <input
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== milestone.title && onSave(milestone.id, { title: title.trim() })}
          />
        </div>
        <div>
          <label className="field-label">Due date</label>
          <input
            className="field"
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            onBlur={() => {
              const next = dueOn || null;
              if (next !== (milestone.due_on ?? null)) onSave(milestone.id, { due_on: next });
            }}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggleCompleted}
          disabled={pending}
          className={`btn btn-sm ${completed ? "btn-soft" : "btn-ghost"}`}
        >
          <IconCheck size={14} /> {completed ? "Completed" : "Mark completed"}
        </button>
        <button
          type="button"
          onClick={() => onRemove(milestone.id)}
          disabled={pending}
          className="btn btn-quiet btn-sm text-[var(--color-critical)]"
          aria-label={`Remove ${milestone.title}`}
        >
          <IconClose size={14} /> Remove
        </button>
      </div>
    </div>
  );
}
