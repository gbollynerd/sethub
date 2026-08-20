"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge, Progress } from "@/components/ui";
import { Spinner } from "@/components/forms";
import { IconCheck, IconLock } from "@/components/icons";
import { countdown, num } from "@/lib/format";

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
}: {
  poll: PollShape;
  membershipId: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [choices, setChoices] = useState<string[]>(poll.myChoices);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[1.02rem] font-semibold leading-snug">{poll.question}</h3>
          {poll.description ? (
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">{poll.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {poll.isAnonymous ? <Badge icon="lock">Anonymous</Badge> : <Badge>Open vote</Badge>}
          {hasVoted ? <Badge tone="positive" icon="check">You voted</Badge> : null}
        </div>
      </div>

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

      {error ? <p className="mt-3 text-sm text-[var(--color-critical)]">{error}</p> : null}

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
