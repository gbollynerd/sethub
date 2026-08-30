"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/forms";
import { Avatar, Badge } from "@/components/ui";
import {
  IconCheck, IconClose, IconCopy, IconPlus, IconUserPlus,
} from "@/components/icons";

interface Term {
  id: string;
  name: string;
  starts_on: string;
  is_current: boolean;
}

interface Position {
  id: string;
  name: string;
  seats: number;
  filled: number;
}

interface Holder {
  appointmentId: string;
  positionId: string;
  membershipId: string;
  name: string;
  avatar: string | null;
  status: string;
}

interface MemberOption {
  id: string;
  name: string;
  avatar: string | null;
}

/**
 * Admin controls for the EXCO page: switch/create the current term, add new
 * positions, and appoint someone to a position — either an existing member,
 * or (the gap this fills) someone who hasn't joined yet, via a single-use
 * invite that auto-completes the appointment when they sign up.
 */
export function ExcoManager({
  setId,
  currentTerm,
  terms,
  positions,
  holders,
  members,
  canManageTerms,
  canAssign,
}: {
  setId: string;
  currentTerm: Term | null;
  terms: Term[];
  positions: Position[];
  holders: Holder[];
  members: MemberOption[];
  canManageTerms: boolean;
  canAssign: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [termName, setTermName] = useState("");
  const [termStart, setTermStart] = useState("");
  const [showNewTerm, setShowNewTerm] = useState(false);

  const [posName, setPosName] = useState("");
  const [posSeats, setPosSeats] = useState("1");
  const [showNewPosition, setShowNewPosition] = useState(false);

  const [openFor, setOpenFor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [lastInvite, setLastInvite] = useState<{ label: string; url: string; code: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [members, query]);

  const closePicker = () => {
    setOpenFor(null);
    setQuery("");
    setInviteEmail("");
  };

  const createTerm = () =>
    start(async () => {
      setError(null);
      if (!termName.trim() || !termStart) {
        setError("Give the term a name and a start date.");
        return;
      }
      const { data, error: err } = await supabase
        .from("exco_terms")
        .insert({ set_id: setId, name: termName.trim(), starts_on: termStart })
        .select("id")
        .single();
      if (err || !data) {
        setError(err?.message ?? "Could not create the term.");
        return;
      }
      const { error: err2 } = await supabase.rpc("set_current_exco_term", { p_term_id: data.id });
      if (err2) {
        setError(err2.message);
        return;
      }
      setTermName("");
      setTermStart("");
      setShowNewTerm(false);
      router.refresh();
    });

  const switchTerm = (termId: string) =>
    start(async () => {
      setError(null);
      const { error: err } = await supabase.rpc("set_current_exco_term", { p_term_id: termId });
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    });

  const addPosition = () =>
    start(async () => {
      setError(null);
      if (!posName.trim()) {
        setError("Give the position a name.");
        return;
      }
      const { error: err } = await supabase
        .from("exco_positions")
        .insert({ set_id: setId, name: posName.trim(), seats: Math.max(1, Number(posSeats) || 1) });
      if (err) {
        setError(err.message);
        return;
      }
      setPosName("");
      setPosSeats("1");
      setShowNewPosition(false);
      router.refresh();
    });

  const assignExisting = (positionId: string, membershipId: string) =>
    start(async () => {
      setError(null);
      if (!currentTerm) return;
      const { error: err } = await supabase.from("exco_appointments").insert({
        term_id: currentTerm.id,
        position_id: positionId,
        membership_id: membershipId,
        status: "accepted",
      });
      if (err) {
        setError(err.message.includes("duplicate") ? "That member already holds this position." : err.message);
        return;
      }
      closePicker();
      router.refresh();
    });

  const inviteNew = (positionId: string) =>
    start(async () => {
      setError(null);
      if (!currentTerm) return;
      if (!inviteEmail.trim()) {
        setError("Enter an email address to invite them.");
        return;
      }
      const { data, error: err } = await supabase.rpc("invite_to_exco", {
        p_term_id: currentTerm.id,
        p_position_id: positionId,
        p_email: inviteEmail.trim(),
        p_label: null,
      });
      if (err || !data) {
        setError(err?.message ?? "Could not create the invite.");
        return;
      }
      const result = data as { token: string; code: string | null };
      setLastInvite({
        label: positions.find((p) => p.id === positionId)?.name ?? "position",
        url: `${origin}/invite/${result.token}`,
        code: result.code,
      });
      closePicker();
      router.refresh();
    });

  const removeHolder = (appointmentId: string) =>
    start(async () => {
      setError(null);
      const { error: err } = await supabase
        .from("exco_appointments")
        .update({ status: "removed", removed_at: new Date().toISOString() })
        .eq("id", appointmentId);
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    });

  const copyInvite = async () => {
    if (!lastInvite) return;
    await navigator.clipboard.writeText(lastInvite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!canManageTerms && !canAssign) return null;

  return (
    <div className="mt-6 space-y-5">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {lastInvite ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Invite sent for {lastInvite.label}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                They&apos;ll be appointed automatically once they sign up with this link.
              </p>
              <code className="mt-2 block truncate rounded-[var(--radius-xs)] bg-[var(--color-surface)] px-3 py-2 text-xs">
                {lastInvite.url}
              </code>
              {lastInvite.code ? (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                  Or the code <strong className="font-mono tracking-wider">{lastInvite.code}</strong>
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={copyInvite} className="btn btn-ghost btn-sm">
                {copied ? <><IconCheck size={14} /> Copied</> : <><IconCopy size={14} /> Copy</>}
              </button>
              <button onClick={() => setLastInvite(null)} className="btn btn-quiet btn-icon" aria-label="Dismiss">
                <IconClose size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {canManageTerms ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">Terms</p>
            <button onClick={() => setShowNewTerm((v) => !v)} className="btn btn-ghost btn-sm">
              <IconPlus size={14} /> New term
            </button>
          </div>

          {terms.length > 1 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {terms.map((t) => (
                <button
                  key={t.id}
                  onClick={() => (t.is_current ? undefined : switchTerm(t.id))}
                  disabled={pending || t.is_current}
                  className={`btn btn-sm ${t.is_current ? "btn-primary" : "btn-ghost"}`}
                >
                  {t.name}{t.is_current ? " · current" : ""}
                </button>
              ))}
            </div>
          ) : null}

          {showNewTerm ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <input
                className="field" value={termName} onChange={(e) => setTermName(e.target.value)}
                placeholder="2026 - 2028 Executive"
              />
              <input
                className="field" type="date" value={termStart}
                onChange={(e) => setTermStart(e.target.value)}
              />
              <button onClick={createTerm} disabled={pending} className="btn btn-primary btn-sm">
                {pending ? <Spinner /> : "Create & make current"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {canAssign ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">Add a position</p>
            <button onClick={() => setShowNewPosition((v) => !v)} className="btn btn-ghost btn-sm">
              <IconPlus size={14} /> New position
            </button>
          </div>
          {showNewPosition ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <input
                className="field" value={posName} onChange={(e) => setPosName(e.target.value)}
                placeholder="Financial Secretary"
              />
              <input
                className="field" type="number" min={1} value={posSeats}
                onChange={(e) => setPosSeats(e.target.value)} placeholder="Seats"
              />
              <button onClick={addPosition} disabled={pending} className="btn btn-primary btn-sm">
                {pending ? <Spinner /> : "Add"}
              </button>
            </div>
          ) : null}

          {!currentTerm ? (
            <p className="mt-3 text-xs text-[var(--color-subtle)]">
              Create a term above before appointing anyone.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {positions.map((p) => {
                const holdersForPos = holders.filter((h) => h.positionId === p.id);
                const vacant = holdersForPos.length < p.seats;
                return (
                  <li key={p.id} className="rounded-[var(--radius-sm)] border border-[var(--color-line)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        {holdersForPos.length ? (
                          <ul className="mt-1 space-y-1">
                            {holdersForPos.map((h) => (
                              <li key={h.appointmentId} className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                                <Avatar name={h.name} src={h.avatar} size={18} />
                                {h.name}
                                {h.status !== "accepted" ? <Badge tone="caution">{h.status}</Badge> : null}
                                <button
                                  onClick={() => removeHolder(h.appointmentId)}
                                  disabled={pending}
                                  className="btn btn-quiet btn-icon !h-6 !w-6"
                                  aria-label={`Remove ${h.name}`}
                                >
                                  <IconClose size={12} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      {vacant ? (
                        <button
                          onClick={() => setOpenFor(openFor === p.id ? null : p.id)}
                          className="btn btn-soft btn-sm shrink-0"
                        >
                          <IconUserPlus size={14} /> Appoint
                        </button>
                      ) : null}
                    </div>

                    {openFor === p.id ? (
                      <div className="mt-3 space-y-3 border-t border-[var(--color-line)] pt-3">
                        <div>
                          <label className="field-label">Search existing members</label>
                          <input
                            className="field" value={query} onChange={(e) => setQuery(e.target.value)}
                            placeholder="Start typing a name…" autoFocus
                          />
                          {matches.length ? (
                            <ul className="mt-2 space-y-1">
                              {matches.map((m) => (
                                <li key={m.id}>
                                  <button
                                    onClick={() => assignExisting(p.id, m.id)}
                                    disabled={pending}
                                    className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm transition hover:bg-[var(--color-surface)]"
                                  >
                                    <Avatar name={m.name} src={m.avatar} size={22} />
                                    {m.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : query.trim() ? (
                            <p className="mt-2 text-xs text-[var(--color-subtle)]">No members match that search.</p>
                          ) : null}
                        </div>

                        <div>
                          <label className="field-label">Or invite someone who hasn&apos;t joined yet</label>
                          <div className="flex gap-2">
                            <input
                              className="field" type="email" value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="name@example.com"
                            />
                            <button
                              onClick={() => inviteNew(p.id)} disabled={pending}
                              className="btn btn-ghost btn-sm shrink-0"
                            >
                              {pending ? <Spinner /> : "Invite"}
                            </button>
                          </div>
                          <p className="mt-1.5 text-xs text-[var(--color-subtle)]">
                            They&apos;ll be appointed the moment they accept the invite.
                          </p>
                        </div>

                        <button onClick={closePicker} className="btn btn-quiet btn-sm">Cancel</button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
