"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/forms";
import { IconSend } from "@/components/icons";
import type { SetDepartment } from "@/lib/types";

const AUDIENCES = [
  { value: "set", label: "Everyone in the set" },
  { value: "department", label: "One department" },
  { value: "exco", label: "EXCO only" },
  { value: "admins", label: "Administrators only" },
  { value: "debtors", label: "Members with outstanding dues" },
];

const CHANNELS = [
  { value: "in_app", label: "In-app" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Push" },
];

export function BroadcastComposer({
  setId,
  departments,
  integrations,
}: {
  setId: string;
  departments: SetDepartment[];
  integrations: Array<{ id: string; label: string; provider: string }>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("set");
  const [departmentId, setDepartmentId] = useState("");
  const [channels, setChannels] = useState<string[]>(["in_app", "email"]);
  const [selected, setSelected] = useState<string[]>(integrations.map((i) => i.id));
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      setError(null);
      if (!body.trim()) {
        setError("Write the message first.");
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error: err } = await supabase.from("broadcasts").insert({
        set_id: setId,
        department_id: audience === "department" ? departmentId || null : null,
        title: title.trim() || null,
        body: body.trim(),
        channels,
        integration_ids: selected,
        audience,
        status: "queued",
        created_by: user?.id ?? "",
      });

      if (err) {
        setError(err.message);
        return;
      }
      setTitle("");
      setBody("");
      setSent(true);
      router.refresh();
      setTimeout(() => setSent(false), 4000);
    });

  return (
    <div className="space-y-3.5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {sent ? <Alert tone="success">Queued — the worker will deliver it shortly.</Alert> : null}

      <div>
        <label className="field-label" htmlFor="bc-title">Subject (optional)</label>
        <input
          id="bc-title" className="field" value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Reminder: AGM is on Saturday"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="bc-body">Message</label>
        <textarea
          id="bc-body" className="field" rows={4} value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write it the way you would type it into the group…"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="bc-audience">Send to</label>
          <select id="bc-audience" className="field" value={audience} onChange={(e) => setAudience(e.target.value)}>
            {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        {audience === "department" && departments.length ? (
          <div>
            <label className="field-label" htmlFor="bc-dept">Department</label>
            <select id="bc-dept" className="field" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Choose…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        ) : null}
      </div>

      <div>
        <p className="field-label">Channels</p>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => {
            const on = channels.includes(c.value);
            return (
              <button
                key={c.value}
                onClick={() => setChannels(on ? channels.filter((x) => x !== c.value) : [...channels, c.value])}
                className={`chip transition ${on ? "chip-brand" : "hover:border-[var(--color-ink)]"}`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {integrations.length ? (
        <div>
          <p className="field-label">Connected groups</p>
          <div className="flex flex-wrap gap-2">
            {integrations.map((i) => {
              const on = selected.includes(i.id);
              return (
                <button
                  key={i.id}
                  onClick={() => setSelected(on ? selected.filter((x) => x !== i.id) : [...selected, i.id])}
                  className={`chip transition ${on ? "chip-positive" : "hover:border-[var(--color-ink)]"}`}
                >
                  {i.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-subtle)]">
          No channels connected yet — the message will still reach members in-app and by email.
        </p>
      )}

      <button onClick={send} disabled={pending} className="btn btn-primary w-full">
        {pending ? <><Spinner /> Queuing…</> : <><IconSend size={16} /> Send broadcast</>}
      </button>
    </div>
  );
}
