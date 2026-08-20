"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/forms";
import { IconClose, IconPlus, IconPoll } from "@/components/icons";

export function PollComposer({ setId, departmentId = null }: { setId: string; departmentId?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [kind, setKind] = useState("single");
  const [maxChoices, setMaxChoices] = useState(2);
  const [anonymous, setAnonymous] = useState(true);
  const [closesAt, setClosesAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const create = () => {
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || clean.length < 2) {
      setError("A poll needs a question and at least two options.");
      return;
    }

    start(async () => {
      setError(null);
      const supabase = createClient();

      const { data: poll, error: err } = await supabase
        .from("polls")
        .insert({
          set_id: setId,
          department_id: departmentId,
          question: question.trim(),
          description: description.trim() || null,
          kind,
          max_choices: kind === "multiple" ? maxChoices : 1,
          is_anonymous: anonymous,
          status: "open",
          closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        })
        .select("id")
        .single();

      if (err || !poll) {
        setError(err?.message ?? "Could not create the poll.");
        return;
      }

      await supabase.from("poll_options").insert(
        clean.map((label, i) => ({ poll_id: poll.id, label, sort_order: i })),
      );

      setQuestion("");
      setDescription("");
      setOptions(["", ""]);
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="card card-hover flex w-full items-center gap-3.5 p-4 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-caution-soft)] text-[var(--color-caution)]">
          <IconPoll size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Create a poll</span>
          <span className="block text-xs text-[var(--color-muted)]">
            One vote per member, results live or hidden until it closes.
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="card animate-pop p-5">
      <h3 className="t-h3 mb-4">New poll</h3>
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}

      <div className="space-y-3.5">
        <div>
          <label className="field-label" htmlFor="poll-q">Question</label>
          <input
            id="poll-q" className="field" autoFocus value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Where should we hold the 2026 reunion?"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="poll-d">Context (optional)</label>
          <input
            id="poll-d" className="field" value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Budget is ₦4m, we need a venue for 180 people"
          />
        </div>

        <div>
          <label className="field-label">Options</label>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="field"
                  value={o}
                  onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 ? (
                  <button
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    className="btn btn-quiet btn-icon shrink-0"
                    aria-label="Remove option"
                  >
                    <IconClose size={15} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <button onClick={() => setOptions([...options, ""])} className="btn btn-quiet btn-sm mt-2">
            <IconPlus size={14} /> Add option
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="poll-kind">Type</label>
            <select id="poll-kind" className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="single">Pick one</option>
              <option value="multiple">Pick several</option>
            </select>
          </div>
          {kind === "multiple" ? (
            <div>
              <label className="field-label" htmlFor="poll-max">Max choices</label>
              <input
                id="poll-max" type="number" min={2} max={options.length} className="field"
                value={maxChoices} onChange={(e) => setMaxChoices(Number(e.target.value))}
              />
            </div>
          ) : null}
          <div>
            <label className="field-label" htmlFor="poll-close">Closes</label>
            <input
              id="poll-close" type="datetime-local" className="field"
              value={closesAt} onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-brand)]"
          />
          Anonymous — nobody can see who voted for what
        </label>
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
        <button onClick={create} disabled={pending} className="btn btn-primary btn-sm flex-1">
          {pending ? <><Spinner /> Creating…</> : "Open the poll"}
        </button>
      </div>
    </div>
  );
}
