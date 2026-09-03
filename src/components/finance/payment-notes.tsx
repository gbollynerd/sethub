"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui";
import { Alert, Spinner } from "@/components/forms";
import { relativeTime } from "@/lib/format";

export interface PaymentNote {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string; avatar: string | null };
  isMine: boolean;
}

/** A lightweight comment thread on a single payment — for a member to explain
 * a reference number, or ask why something was rejected, without needing a
 * full channel. Notes are permanent once posted (no edit/delete, matching
 * the audit-trail nature of a finance record). */
export function PaymentNotes({ paymentId, notes }: { paymentId: string; notes: PaymentNote[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");

  const post = () => {
    const text = body.trim();
    if (!text) return;
    start(async () => {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: err } = await supabase.from("payment_notes").insert({
        payment_id: paymentId,
        author_id: user.id,
        body: text,
      });
      if (err) { setError(err.message); return; }
      setBody("");
      router.refresh();
    });
  };

  return (
    <div>
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}

      {notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-subtle)]">
          No messages yet — ask a question about this payment here.
        </p>
      ) : (
        <ul className="space-y-4">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start gap-2.5">
              <Avatar name={n.author.name} src={n.author.avatar} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold">{n.author.name}{n.isMine ? " (you)" : ""}</p>
                  <p className="text-xs text-[var(--color-subtle)]">{relativeTime(n.createdAt)}</p>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-[var(--color-ink-2)]">{n.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-end gap-2 border-t border-[var(--color-line)] pt-4">
        <textarea
          className="field flex-1"
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ask a question about this payment…"
        />
        <button
          type="button"
          onClick={post}
          disabled={pending || !body.trim()}
          className="btn btn-primary btn-sm shrink-0"
        >
          {pending ? <><Spinner /> Sending…</> : "Send"}
        </button>
      </div>
    </div>
  );
}
