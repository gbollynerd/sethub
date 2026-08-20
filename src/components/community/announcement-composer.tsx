"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/forms";
import { IconMegaphone, IconWhatsapp, IconSend } from "@/components/icons";

/**
 * Posting an announcement writes one row; a database trigger fans it out to
 * every active outbound integration (WhatsApp group, Telegram, webhook) that
 * subscribes to `announcement.created`.
 */
export function AnnouncementComposer({
  setId,
  departmentId = null,
  scopeLabel = "the whole set",
}: {
  setId: string;
  departmentId?: string | null;
  scopeLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [pin, setPin] = useState(false);
  const [broadcast, setBroadcast] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const post = () => {
    if (!title.trim() || !body.trim()) {
      setError("An announcement needs a title and a body.");
      return;
    }
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { error: err } = await supabase.from("announcements").insert({
        set_id: setId,
        department_id: departmentId,
        title: title.trim(),
        body: body.trim(),
        summary: body.trim().slice(0, 200),
        priority,
        is_pinned: pin,
        audience: departmentId ? "department" : "set",
        status: "open",
        broadcast: broadcast ? ["in_app", "email", "whatsapp"] : ["in_app"],
      });
      if (err) {
        setError(err.message);
        return;
      }
      setTitle("");
      setBody("");
      setPin(false);
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card card-hover flex w-full items-center gap-3.5 p-4 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
          <IconMegaphone size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Post an announcement</span>
          <span className="block text-xs text-[var(--color-muted)]">
            Goes to {scopeLabel} — and out to your connected WhatsApp group if you want.
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="card animate-pop p-5">
      <h3 className="t-h3 mb-4">New announcement</h3>
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}

      <div className="space-y-3.5">
        <div>
          <label className="field-label" htmlFor="ann-title">Title</label>
          <input
            id="ann-title" className="field" value={title} autoFocus
            onChange={(e) => setTitle(e.target.value)}
            placeholder="AGM 2026 — Saturday 12 September"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="ann-body">Message</label>
          <textarea
            id="ann-body" className="field" rows={5} value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the notice as you want members to read it…"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="ann-priority">Priority</label>
            <select id="ann-priority" className="field" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
              Pin to the top
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
              <span className="flex items-center gap-1.5">
                <IconWhatsapp size={14} className="text-[var(--color-positive)]" />
                Push to connected channels
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
        <button onClick={post} disabled={pending} className="btn btn-primary btn-sm flex-1">
          {pending ? <><Spinner /> Posting…</> : <><IconSend size={15} /> Post announcement</>}
        </button>
      </div>
    </div>
  );
}
