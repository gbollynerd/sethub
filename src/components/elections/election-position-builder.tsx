"use client";

import { useState } from "react";
import { IconClose, IconPlus } from "@/components/icons";

type Position = { id: number; title: string; description: string; seats: number };

const initialPositions: Position[] = [
  { id: 1, title: "President", description: "", seats: 1 },
  { id: 2, title: "Secretary", description: "", seats: 1 },
];

/** Collects the races that are created alongside a draft election. */
export function ElectionPositionBuilder() {
  const [positions, setPositions] = useState(initialPositions);
  const update = (id: number, field: keyof Omit<Position, "id">, value: string | number) =>
    setPositions((current) => current.map((position) => (position.id === id ? { ...position, [field]: value } : position)));
  const add = () =>
    setPositions((current) => [...current, { id: Date.now(), title: "", description: "", seats: 1 }]);

  return (
    <section className="border-t border-[var(--color-line)] pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Positions to fill</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Set up the races now. Candidates can be nominated after you open nominations.
          </p>
        </div>
        <button type="button" onClick={add} className="btn btn-ghost btn-sm">
          <IconPlus size={15} /> Add position
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {positions.map((position, index) => (
          <div key={position.id} className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">Position {index + 1}</p>
              {positions.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setPositions((current) => current.filter((item) => item.id !== position.id))}
                  className="btn btn-quiet btn-sm text-[var(--color-critical)]"
                  aria-label={`Remove position ${index + 1}`}
                >
                  <IconClose size={14} /> Remove
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
              <div>
                <label className="field-label" htmlFor={`position-title-${position.id}`}>Position title</label>
                <input
                  id={`position-title-${position.id}`}
                  name="position_title"
                  className="field"
                  required
                  value={position.title}
                  onChange={(event) => update(position.id, "title", event.target.value)}
                  placeholder="e.g. Treasurer"
                />
              </div>
              <div>
                <label className="field-label" htmlFor={`position-seats-${position.id}`}>Seats</label>
                <input
                  id={`position-seats-${position.id}`}
                  name="position_seats"
                  className="field"
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={position.seats}
                  onChange={(event) => update(position.id, "seats", Math.max(1, Number(event.target.value) || 1))}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="field-label" htmlFor={`position-description-${position.id}`}>Brief description <span className="normal-case tracking-normal text-[var(--color-subtle)]">(optional)</span></label>
              <input
                id={`position-description-${position.id}`}
                name="position_description"
                className="field"
                value={position.description}
                onChange={(event) => update(position.id, "description", event.target.value)}
                placeholder="What will this office be responsible for?"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
