"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Badge, Card } from "@/components/ui";
import { Alert, Spinner } from "@/components/forms";
import { IconCheck, IconLock, IconVote } from "@/components/icons";

interface Candidate {
  id: string;
  membershipId: string;
  name: string;
  avatar: string | null;
  sub: string | null;
  manifesto: string | null;
}

interface Race {
  id: string;
  title: string;
  description: string | null;
  seats: number;
  candidates: Candidate[];
}

/**
 * A ballot is cast in one atomic RPC call, so a member can never half-vote.
 * For anonymous elections the server deliberately drops the voter link.
 */
export function BallotBox({
  electionId,
  setId,
  races,
}: {
  electionId: string;
  setId: string;
  races: Race[];
}) {
  const router = useRouter();
  const [choices, setChoices] = useState<Record<string, string | "abstain">>({});
  const [confirming, setConfirming] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const decided = races.filter((r) => choices[r.id]).length;
  const complete = decided === races.length;

  const cast = () =>
    start(async () => {
      setError(null);
      const supabase = createClient();
      const payload = races.map((r) => ({
        position_id: r.id,
        candidate_id: choices[r.id] === "abstain" ? null : choices[r.id],
        abstain: choices[r.id] === "abstain",
      }));

      const { data, error: err } = await supabase.rpc("cast_election_ballot", {
        p_election: electionId,
        p_choices: payload,
      });

      if (err) {
        setError(err.message);
        setConfirming(false);
        return;
      }
      setReceipt(data as string);
      setTimeout(() => router.refresh(), 2500);
    });

  if (receipt) {
    return (
      <Card className="border-[var(--color-positive)]/40 bg-[var(--color-positive-soft)] text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--color-positive)] text-white">
          <IconCheck size={26} />
        </span>
        <h2 className="t-h3 mt-4">Your ballot is in</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--color-ink-2)]">
          Keep this receipt. It proves you voted without revealing what you chose.
        </p>
        <p className="mt-4 font-mono text-lg tracking-[0.2em] text-[var(--color-ink)]">{receipt}</p>
      </Card>
    );
  }

  return (
    <div>
      <Card className="mb-5 border-[var(--color-brand)]/35 bg-[var(--color-brand-soft)]">
        <div className="flex flex-wrap items-center gap-3">
          <IconVote size={22} className="shrink-0 text-[var(--color-brand-deep)]" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-[var(--color-brand-deep)]">
              Voting is open — you get one ballot
            </p>
            <p className="text-sm text-[var(--color-brand-dark)]">
              Choose a candidate for each position, or abstain. You cannot change it afterwards.
            </p>
          </div>
          <Badge tone="brand">{decided} of {races.length} decided</Badge>
        </div>
      </Card>

      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}

      <div className="space-y-5">
        {races.map((race) => (
          <Card key={race.id}>
            <div className="mb-4">
              <h3 className="t-h3">{race.title}</h3>
              {race.description ? (
                <p className="mt-1 text-sm text-[var(--color-muted)]">{race.description}</p>
              ) : null}
            </div>

            <ul className="space-y-2.5">
              {race.candidates.map((c) => {
                const selected = choices[race.id] === c.id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setChoices({ ...choices, [race.id]: c.id })}
                      className={`flex w-full items-start gap-3.5 rounded-[var(--radius-md)] border p-4 text-left transition ${
                        selected
                          ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                          : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
                      }`}
                    >
                      <Avatar name={c.name} src={c.avatar} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-[0.96rem] font-semibold">{c.name}</span>
                        {c.sub ? <span className="block text-sm text-[var(--color-muted)]">{c.sub}</span> : null}
                        {c.manifesto ? (
                          <span className="mt-1.5 block line-clamp-2 text-sm leading-relaxed text-[var(--color-ink-2)]">
                            {c.manifesto}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                          selected ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white" : "border-[var(--color-line-strong)]"
                        }`}
                      >
                        {selected ? <IconCheck size={12} /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}

              <li>
                <button
                  onClick={() => setChoices({ ...choices, [race.id]: "abstain" })}
                  className={`w-full rounded-[var(--radius-md)] border border-dashed p-3 text-sm font-medium transition ${
                    choices[race.id] === "abstain"
                      ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)] text-[var(--color-plum)]"
                      : "border-[var(--color-line-strong)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  Abstain from this position
                </button>
              </li>
            </ul>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-4 mt-6">
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            disabled={!complete}
            className="btn btn-primary btn-lg w-full shadow-[var(--shadow-lift)]"
          >
            {complete ? "Review and cast my ballot" : `Choose ${races.length - decided} more to continue`}
          </button>
        ) : (
          <Card className="shadow-[var(--shadow-lift)]">
            <p className="flex items-center gap-2 font-display text-sm font-semibold">
              <IconLock size={16} className="text-[var(--color-brand)]" />
              Cast your ballot — this cannot be undone
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {races.map((r) => {
                const choice = choices[r.id];
                const candidate = r.candidates.find((c) => c.id === choice);
                return (
                  <li key={r.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[var(--color-muted)]">{r.title}</span>
                    <span className="shrink-0 font-semibold">
                      {choice === "abstain" ? "Abstained" : (candidate?.name ?? "—")}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm">Go back</button>
              <button onClick={cast} disabled={pending} className="btn btn-primary btn-sm flex-1">
                {pending ? <><Spinner /> Casting…</> : "Confirm and cast"}
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
