"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui";
import { Alert, Spinner } from "@/components/forms";
import { Icon, IconPlus, IconClose, IconLink } from "@/components/icons";
import type { SetDepartment } from "@/lib/types";
import { relativeTime } from "@/lib/format";

interface Integration {
  id: string;
  provider: string;
  label: string;
  externalName: string | null;
  externalId: string | null;
  inviteUrl: string | null;
  direction: string;
  events: string[];
  isActive: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  departmentId: string | null;
}

const PROVIDERS = [
  { value: "whatsapp", label: "WhatsApp group", icon: "whatsapp", hint: "Group ID or the join link" },
  { value: "telegram", label: "Telegram channel", icon: "send", hint: "Chat ID (e.g. -1001234567890)" },
  { value: "slack", label: "Slack channel", icon: "hash", hint: "Incoming webhook URL" },
  { value: "email", label: "Email list", icon: "megaphone", hint: "List address" },
  { value: "sms", label: "SMS gateway", icon: "send", hint: "Sender ID" },
  { value: "webhook", label: "Generic webhook", icon: "link", hint: "POST endpoint" },
];

const EVENTS = [
  { value: "announcement.created", label: "New announcement" },
  { value: "event.created", label: "New event" },
  { value: "election.opened", label: "Election opens" },
  { value: "dues.created", label: "Dues published" },
  { value: "project.update", label: "Project update" },
  { value: "member.joined", label: "New member joins" },
];

export function IntegrationManager({
  setId,
  departments,
  existing,
}: {
  setId: string;
  departments: SetDepartment[];
  existing: Integration[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(existing.length === 0);
  const [provider, setProvider] = useState("whatsapp");
  const [label, setLabel] = useState("");
  const [externalId, setExternalId] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [events, setEvents] = useState<string[]>([
    "announcement.created", "event.created", "election.opened", "dues.created",
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setError(null);
      if (!label.trim()) {
        setError("Give the connection a name so other admins know what it is.");
        return;
      }
      const supabase = createClient();
      const { error: err } = await supabase.from("integrations").insert({
        set_id: setId,
        department_id: departmentId || null,
        provider,
        label: label.trim(),
        external_id: externalId.trim() || null,
        external_name: label.trim(),
        invite_url: inviteUrl.trim() || null,
        direction: "outbound",
        events,
        is_active: true,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setLabel("");
      setExternalId("");
      setInviteUrl("");
      setOpen(false);
      router.refresh();
    });

  const toggleActive = async (i: Integration) => {
    const supabase = createClient();
    await supabase.from("integrations").update({ is_active: !i.isActive }).eq("id", i.id);
    router.refresh();
  };

  const remove = async (id: string) => {
    const supabase = createClient();
    await supabase.from("integrations").delete().eq("id", id);
    router.refresh();
  };

  const active = PROVIDERS.find((p) => p.value === provider);

  return (
    <div>
      {existing.length ? (
        <ul className="mb-5 space-y-2.5">
          {existing.map((i) => {
            const meta = PROVIDERS.find((p) => p.value === i.provider);
            const dept = departments.find((d) => d.id === i.departmentId);
            return (
              <li key={i.id} className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] text-[var(--color-brand-dark)]">
                      <Icon name={meta?.icon ?? "link"} size={19} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-display text-sm font-semibold">{i.label}</p>
                        <Badge tone={i.isActive ? "positive" : "default"}>
                          {i.isActive ? "Active" : "Paused"}
                        </Badge>
                        {dept ? <Badge tone="plum">{dept.name}</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--color-subtle)]">
                        {meta?.label ?? i.provider}
                        {i.externalId ? ` · ${i.externalId}` : ""}
                        {i.lastSyncAt ? ` · last sent ${relativeTime(i.lastSyncAt)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button onClick={() => toggleActive(i)} className="btn btn-quiet btn-sm">
                      {i.isActive ? "Pause" : "Resume"}
                    </button>
                    <button onClick={() => remove(i.id)} className="btn btn-quiet btn-icon" aria-label="Remove">
                      <IconClose size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {i.events.map((e) => (
                    <span key={e} className="chip px-2 py-0.5 text-[0.66rem]">
                      {EVENTS.find((x) => x.value === e)?.label ?? e}
                    </span>
                  ))}
                </div>

                {i.inviteUrl ? (
                  <a
                    href={i.inviteUrl} target="_blank" rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-brand-dark)]"
                  >
                    <IconLink size={13} /> Group join link
                  </a>
                ) : null}

                {i.lastError ? (
                  <p className="mt-2 rounded-[var(--radius-xs)] bg-[var(--color-critical-soft)] px-2.5 py-1.5 text-xs text-[var(--color-critical)]">
                    Last error: {i.lastError}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {!open ? (
        <button onClick={() => setOpen(true)} className="btn btn-ghost w-full">
          <IconPlus size={16} /> Connect another channel
        </button>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
          {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}

          <div className="grid gap-2 sm:grid-cols-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => setProvider(p.value)}
                className={`flex items-center gap-2 rounded-[var(--radius-sm)] border p-2.5 text-left text-sm transition ${
                  provider === p.value
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                    : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-strong)]"
                }`}
              >
                <Icon name={p.icon} size={17} />
                <span className="truncate font-medium">{p.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="int-label">Name it</label>
              <input
                id="int-label" className="field" value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Class of 2012 main group"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="int-id">{active?.hint}</label>
              <input
                id="int-id" className="field" value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="int-invite">Group join link</label>
              <input
                id="int-invite" className="field" value={inviteUrl}
                onChange={(e) => setInviteUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/…"
              />
            </div>
            {departments.length ? (
              <div>
                <label className="field-label" htmlFor="int-dept">Scope</label>
                <select id="int-dept" className="field" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="">Whole set</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <p className="field-label">Push these events</p>
            <div className="flex flex-wrap gap-2">
              {EVENTS.map((e) => {
                const on = events.includes(e.value);
                return (
                  <button
                    key={e.value}
                    onClick={() =>
                      setEvents(on ? events.filter((x) => x !== e.value) : [...events, e.value])
                    }
                    className={`chip transition ${on ? "chip-brand" : "hover:border-[var(--color-ink)]"}`}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <button onClick={save} disabled={pending} className="btn btn-primary btn-sm flex-1">
              {pending ? <><Spinner /> Connecting…</> : "Connect channel"}
            </button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[var(--color-subtle)]">
            Credentials are read from the deployment environment, never stored in the browser. A
            worker drains the outbound queue and marks each delivery sent or failed.
          </p>
        </div>
      )}
    </div>
  );
}
