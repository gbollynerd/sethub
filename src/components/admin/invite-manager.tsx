"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/forms";
import { Badge } from "@/components/ui";
import {
  IconCheck, IconCopy, IconClose, IconLink, IconPlus, IconWhatsapp, IconGrid,
} from "@/components/icons";
import { formatDate, relativeTime } from "@/lib/format";

interface Invite {
  id: string;
  scope: string;
  token: string;
  code: string | null;
  label: string | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  auto_approve: boolean;
  created_at: string;
  department_id: string | null;
}

/**
 * Invite links, issued by set administrators or by a department admin for their
 * own department. Every link carries a short human-typeable code as well, for
 * people reading it out on a call.
 */
export function InviteManager({
  setId,
  departmentId = null,
  scopeLabel = "this set",
}: {
  setId: string;
  departmentId?: string | null;
  scopeLabel?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<Invite | null>(null);
  const [pending, start] = useTransition();

  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresIn, setExpiresIn] = useState("30");
  const [autoApprove, setAutoApprove] = useState(true);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const linkFor = useCallback((i: Invite) => `${origin}/invite/${i.token}`, [origin]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("invites")
      .select("id, scope, token, code, label, max_uses, use_count, expires_at, revoked_at, auto_approve, created_at, department_id")
      .eq("set_id", setId)
      .order("created_at", { ascending: false })
      .limit(25);
    q = departmentId ? q.eq("department_id", departmentId) : q.is("department_id", null);
    const { data } = await q;
    setInvites((data ?? []) as Invite[]);
    setLoading(false);
  }, [supabase, setId, departmentId]);

  useEffect(() => { load(); }, [load]);

  const create = () =>
    start(async () => {
      setError(null);
      const { error: err } = await supabase.rpc("create_invite", {
        p_set_id: setId,
        p_scope: departmentId ? "department" : "set",
        p_department_id: departmentId,
        p_group_id: null,
        p_channel_id: null,
        p_label: label.trim() || null,
        p_email: null,
        p_max_uses: maxUses ? Number(maxUses) : null,
        p_expires_in_days: expiresIn ? Number(expiresIn) : null,
        p_auto_approve: autoApprove,
        p_role_id: null,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setLabel("");
      setMaxUses("");
      await load();
    });

  const revoke = async (id: string) => {
    await supabase.from("invites").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const copy = async (invite: Invite) => {
    await navigator.clipboard.writeText(linkFor(invite));
    setCopied(invite.id);
    setTimeout(() => setCopied(null), 1800);
  };

  const whatsappShare = (invite: Invite) =>
    `https://wa.me/?text=${encodeURIComponent(
      `You're invited to join ${scopeLabel} on SetHub.\n\n${linkFor(invite)}\n\nOr enter the code ${invite.code ?? ""} after signing up.`,
    )}`;

  const status = (i: Invite) => {
    if (i.revoked_at) return { tone: "critical" as const, label: "Revoked" };
    if (i.expires_at && new Date(i.expires_at) < new Date()) return { tone: "critical" as const, label: "Expired" };
    if (i.max_uses && i.use_count >= i.max_uses) return { tone: "caution" as const, label: "Used up" };
    return { tone: "positive" as const, label: "Active" };
  };

  return (
    <div>
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
        <p className="text-sm font-semibold">Create a new invite link</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="inv-label">Label</label>
            <input
              id="inv-label" className="field" value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="WhatsApp group blast"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="inv-uses">Max uses</label>
            <input
              id="inv-uses" className="field" type="number" min={1} value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="inv-expiry">Expires in</label>
            <select id="inv-expiry" className="field" value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)}>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="">Never</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox" checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            Approve automatically — no admin review needed
          </label>
          <button onClick={create} disabled={pending} className="btn btn-primary btn-sm">
            {pending ? <><Spinner /> Creating…</> : <><IconPlus size={15} /> Create link</>}
          </button>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="skeleton h-20 w-full" />)}</div>
        ) : invites.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-subtle)]">
            No invite links yet. Create one and drop it in the WhatsApp group.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {invites.map((i) => {
              const s = status(i);
              return (
                <li key={i.id} className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-sm font-semibold">
                          {i.label ?? (i.scope === "department" ? "Department invite" : "Set invite")}
                        </p>
                        <Badge tone={s.tone}>{s.label}</Badge>
                        {i.auto_approve ? <Badge tone="brand">Auto-approve</Badge> : <Badge>Needs review</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-subtle)]">
                        {i.use_count} {i.max_uses ? `of ${i.max_uses}` : ""} uses
                        {i.expires_at ? ` · expires ${formatDate(i.expires_at)}` : " · never expires"}
                        {" · created "}{relativeTime(i.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => revoke(i.id)}
                      disabled={Boolean(i.revoked_at)}
                      className="btn btn-quiet btn-sm shrink-0"
                    >
                      <IconClose size={14} /> Revoke
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-ink-2)]">
                      {linkFor(i)}
                    </code>
                    <button onClick={() => copy(i)} className="btn btn-ghost btn-sm shrink-0">
                      {copied === i.id ? <><IconCheck size={14} /> Copied</> : <><IconCopy size={14} /> Copy</>}
                    </button>
                    <a
                      href={whatsappShare(i)} target="_blank" rel="noreferrer"
                      className="btn btn-soft btn-sm shrink-0"
                    >
                      <IconWhatsapp size={14} /> WhatsApp
                    </a>
                    <button onClick={() => setShowQr(i)} className="btn btn-ghost btn-sm shrink-0">
                      <IconGrid size={14} /> QR
                    </button>
                  </div>

                  {i.code ? (
                    <p className="mt-2 text-xs text-[var(--color-muted)]">
                      Or read out the code{" "}
                      <strong className="font-mono tracking-wider text-[var(--color-ink)]">{i.code}</strong>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showQr ? (
        <QrModal invite={showQr} url={linkFor(showQr)} onClose={() => setShowQr(null)} />
      ) : null}
    </div>
  );
}

function QrModal({ invite, url, onClose }: { invite: Invite; url: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((QR) =>
        QR.toDataURL(url, {
          width: 640,
          margin: 2,
          color: { dark: "#1B1B2F", light: "#FFFFFF" },
        }),
      )
      .then((d) => { if (!cancelled) setDataUrl(d); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[var(--color-ink)]/45 backdrop-blur-sm" />
      <div className="animate-pop relative w-full max-w-xs rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 text-center shadow-2xl">
        <button onClick={onClose} className="btn btn-quiet btn-icon absolute right-3 top-3" aria-label="Close">
          <IconClose size={16} />
        </button>
        <p className="t-eyebrow">Scan to join</p>
        <h3 className="t-h3 mt-1.5">{invite.label ?? "Invite link"}</h3>
        <div className="mt-4 grid place-items-center">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="Invite QR code" className="h-52 w-52 rounded-[var(--radius-md)]" />
          ) : (
            <div className="skeleton h-52 w-52" />
          )}
        </div>
        {invite.code ? (
          <p className="mt-4 font-mono text-sm tracking-widest text-[var(--color-ink-2)]">{invite.code}</p>
        ) : null}
        <a
          href={dataUrl ?? "#"} download={`sethub-invite-${invite.code ?? invite.id}.png`}
          className="btn btn-ghost btn-sm mt-4 w-full"
        >
          <IconLink size={14} /> Download QR
        </a>
      </div>
    </div>
  );
}
