"use client";

import { useState } from "react";
import { IconClose, IconPlus } from "@/components/icons";

type Milestone = { id: number; title: string; due_on: string };

/** Collects milestones created alongside a new project. */
export function ProjectMilestoneBuilder() {
  const [milestones, setMilestones] = useState<Milestone[]>([{ id: 1, title: "", due_on: "" }]);

  const update = (id: number, field: "title" | "due_on", value: string) =>
    setMilestones((current) => current.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  const add = () => setMilestones((current) => [...current, { id: Date.now(), title: "", due_on: "" }]);
  const remove = (id: number) => setMilestones((current) => current.filter((m) => m.id !== id));

  return (
    <section className="border-t border-[var(--color-line)] pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Milestones</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Optional — sketch out the key dates now, add more later.</p>
        </div>
        <button type="button" onClick={add} className="btn btn-ghost btn-sm">
          <IconPlus size={15} /> Add milestone
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {milestones.map((m, index) => (
          <div key={m.id} className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
            <div>
              <label className="field-label" htmlFor={`milestone-title-${m.id}`}>Milestone {index + 1}</label>
              <input
                id={`milestone-title-${m.id}`}
                name="milestone_title"
                className="field"
                value={m.title}
                onChange={(e) => update(m.id, "title", e.target.value)}
                placeholder="e.g. Foundation laid"
              />
            </div>
            <div>
              <label className="field-label" htmlFor={`milestone-due-${m.id}`}>Due date</label>
              <input
                id={`milestone-due-${m.id}`}
                name="milestone_due_on"
                type="date"
                className="field"
                value={m.due_on}
                onChange={(e) => update(m.id, "due_on", e.target.value)}
              />
            </div>
            {milestones.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(m.id)}
                className="btn btn-quiet btn-sm self-end text-[var(--color-critical)]"
                aria-label={`Remove milestone ${index + 1}`}
              >
                <IconClose size={14} /> Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
