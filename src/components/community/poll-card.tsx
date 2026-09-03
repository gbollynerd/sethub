"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge, Progress } from "@/components/ui";
import { Alert, Spinner } from "@/components/forms";
import { IconCheck, IconClose, IconLock, IconPlus } from "@/components/icons";
import { countdown, num } from "@/lib/format";

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in the viewer's local time.
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EditableOption {
  id: string;
  label: string;
  isNew: boolean;
}

export interface PollShape {
  id: string;
  question: string;
  description: string | null;
  kind: string;
  maxChoices: number;
  isAnonymous: boolean;
  showLiveResults: boolean;
  status: string;
  closesAt: string | null;
  voteCount: number;
  options: Array<{ id: string; label: string; description: string | null; vote_count: number }>;
  myChoices: string[];
}

export function PollCard({
  poll,
  membershipId,
  readOnly = false,
  canManage = false,
}: {
  poll: PollShape;
  membershipId: string;
  readOnly?: boolean;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [choices, setChoices] = useState<string[]>(poll.myChoices);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(poll.question);
  const [description, setDescription] = useState(poll.description ?? "");
  const [closesAt, setClosesAt] = useState(toLocalInput(poll.closesAt));
  const [isAnonymous, setIsAnonymous] = useState(poll.isAnonymous);
  const [showLiveResults, setShowLiveResults] = useState(poll.showLiveResults);
  const [editOptions, setEditOptions] = useState<EditableOption[]>(
    poll.options.map((o) => ({ id: o.id, label: o.label, isNew: false })),
  );
  const [removedOptionIds, setRemovedOptionIds] = useState<string[]>([]);

  const hasVoted = poll.myChoices.length > 0;
  const showResults = hasVoted || readOnly || poll.showLiveResults;
  const totalVotes = poll.options.reduce((s, o) => s + o.vote_count, 0);

  const toggle = (optionId: string) => {
    if (poll.kind === "single") {
      setChoices([optionId]);
    } else {
      setChoices((prev) =>
        prev.includes(optionId)
          ? prev.filter((c) => c !== optionId)
          : prev.length < poll.maxChoices
            ? [...prev, optionId]
            : prev,
      );
    }
  };

  const submit = () =>
    start(async () => {
      setError(null);
      const supabase = createClient();
      const rows = choices.map((option_id) => ({
        poll_id: poll.id,
        option_id,
        membership_id: membershipId,
      }));
      const { error: err } = await supabase.from("poll_votes").insert(rows);
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    });

  const removePoll = () => {
    if (!window.confirm("Delete this poll? This can't be undone.")) return;
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { error: err } = await supabase.from("polls").delete().eq("id", poll.id);
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    });
  };

  const updateOptionLabel = (id: string, label: string) =>
    setEditOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));

  const addOption = () =>
    setEditOptions((prev) => [...prev, { id: `new-${Date.now()}`, label: "", isNew: true }]);

  const removeOption = (id: string, isNew: boolean) => {
    setEditOptions((prev) => prev.filter((o) => o.id !== id));
    if (!isNew) setRemovedOptionIds((prev) => [...prev, id]);
  };

  const saveEdits = () =>
    start(async () => {
      setError(null);
      const supabase = createClient();

      const { error: pollErr } = await supabase
        .from("polls")
        .update({
          question: question.trim(),
          description: description.trim() || null,
          closes_at: closesAt ? new Date(closesAt).toISOString() : null,
          is_anonymous: isAnonymous,
          show_live_results: showLiveResults,
        })
        .eq("id", poll.id);
      if (pollErr) {
        setError(pollErr.message);
        return;
      }

      for (const optId of removedOptionIds) {
        const { error: err } = await supabase.from("poll_options").delete().eq("id", optId);
        if (err) {
          setError(err.message);
          return;
        }
      }

      for (const [index, opt] of editOptions.entries()) {
        const label = opt.label.trim();
        if (!label) continue;
        if (opt.isNew) {
          const { error: err } = await supabase
            .from("poll_options")
            .insert({ poll_id: poll.id, label, sort_order: index });
          if (err) {
            setError(err.message);
            return;
          }
        } else {
          const original = poll.options.find((o) => o.id === opt.id);
          if (original && original.label !== label) {
            const { error: err } = await supabase.from("poll_options").update({ label }).eq("id", opt.id);
            if (err) {
              setError(err.message);
              return;
            }
          }
        }
      }

      setEditing(false);
      setRemovedOptionIds([]);
      router.refresh();
    });

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[1.02rem] font-semibold leading-snug">{poll.question}</h3>
          {poll.description ? (
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">{poll.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {poll.isAnonymous ? <Badge icon="lock">Anonymous</Badge> : <Badge>Open vote</Badge>}
          {hasVoted ? <Badge tone="positive" icon="check">You voted</Badge> : null}
          {canManage ? (
            <>
              <button type="button" onClick={() => setEditing((v) => !v)} className="btn btn-quiet btn-sm">
                {editing ? "Cancel" : "Edit"}
              </button>
              <button
                type="button"
                onClick={removePoll}
                disabled={pending}
                className="btn btn-quiet btn-sm text-[var(--color-critical)]"
                aria-label="Delete poll"
              >
                <IconClose size={14} /> Delete
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <div className="mt-3"><Alert tone="error">{error}</Alert></div> : null}

      {editing ? (
        <div className="mt-4 space-y-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
          <div>
            <label className="field-label">Question</label>
            <input className="field" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Description</label>
            <input className="field" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Closes at</label>
            <input
              className="field" type="datetime-local" value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
            Anonymous
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={showLiveResults} onChange={(e) => setShowLiveResults(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
            Show live results before voting
          </label>

          <div>
            <label className="field-label">Options</label>
            <div className="space-y-2">
              {editOptions.map((o) => (
                <div key={o.id} className="flex items-center gap-2">
                  <input
                    className="field" value={o.label}
                    onChange={(e) => updateOptionLabel(o.id, e.target.value)}
                    placeholder="Option label"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(o.id, o.isNew)}
                    className="btn btn-quiet btn-icon shrink-0 text-[var(--color-critical)]"
                    aria-label="Remove option"
                  >
                    <IconClose size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addOption} className="btn btn-ghost btn-sm mt-2">
              <IconPlus size={14} /> Add option
            </button>
          </div>

          <div className="flex justify-end border-t border-[var(--color-line)] pt-3">
            <button onClick={saveEdits} disabled={pending || !question.trim()} className="btn btn-primary btn-sm">
              {pending ? <><Spinner /> Saving…</> : "Save changes"}
            </button>
          </div>
        </div>
      ) : null}

      <ul className="mt-4 space-y-2">
        {poll.options.map((o) => {
          const selected = choices.includes(o.id);
          const mine = poll.myChoices.includes(o.id);
          const share = totalVotes > 0 ? (o.vote_count / totalVotes) * 100 : 0;

          if (showResults) {
            return (
              <li key={o.id} className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {o.label}
                    {mine ? <IconCheck size={13} className="ml-1.5 inline text-[var(--color-positive)]" /> : null}
                  </span>
                  <span className="tabular shrink-0 text-sm font-semibold">
                    {share.toFixed(0)}%
                    <span className="ml-1.5 text-xs font-normal text-[var(--color-subtle)]">
                      ({num(o.vote_count)})
                    </span>
                  </span>
                </div>
                <div className="mt-2">
                  <Progress value={share} tone={mine ? "positive" : "brand"} height={6} />
                </div>
              </li>
            );
          }

          return (
            <li key={o.id}>
              <button
                onClick={() => toggle(o.id)}
                disabled={readOnly}
                className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition ${
                  selected
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                    : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center border-2 ${
                    poll.kind === "single" ? "rounded-full" : "rounded-[5px]"
                  } ${selected ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white" : "border-[var(--color-line-strong)]"}`}
                >
                  {selected ? <IconCheck size={12} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{o.label}</span>
                  {o.description ? (
                    <span className="block truncate text-xs text-[var(--color-subtle)]">{o.description}</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
        <p className="text-xs text-[var(--color-subtle)]">
          {num(poll.voteCount)} {poll.voteCount === 1 ? "vote" : "votes"}
          {poll.closesAt ? ` · ${countdown(poll.closesAt)}` : ""}
          {poll.kind === "multiple" ? ` · pick up to ${poll.maxChoices}` : ""}
        </p>
        {!showResults && !readOnly ? (
          <button onClick={submit} disabled={!choices.length || pending} className="btn btn-primary btn-sm">
            {pending ? <><Spinner /> Submitting…</> : "Submit vote"}
          </button>
        ) : readOnly ? (
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-subtle)]">
            <IconLock size={13} /> Closed
          </span>
        ) : null}
      </div>
    </article>
  );
}
