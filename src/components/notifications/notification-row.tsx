"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui";
import { Spinner } from "@/components/forms";
import { IconCheck, IconClose } from "@/components/icons";
import { relativeTime } from "@/lib/format";

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
  priority: string;
}

/** One row on the full /notifications page — mark-read and archive both save
 * immediately, matching the per-row live-mutation pattern used throughout
 * (exco-manager.tsx, election-position-editor.tsx, etc.) rather than a form. */
export function NotificationRow({ notification }: { notification: NotificationItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = !notification.read_at;

  const markRead = () =>
    start(async () => {
      const supabase = createClient();
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notification.id);
      router.refresh();
    });

  const archive = () =>
    start(async () => {
      const supabase = createClient();
      await supabase.from("notifications").update({ archived_at: new Date().toISOString() }).eq("id", notification.id);
      router.refresh();
    });

  return (
    <li className={`flex items-start gap-3 border-b border-[var(--color-line)] px-4 py-3.5 last:border-0 ${unread ? "bg-[var(--color-brand-soft)]/30" : ""}`}>
      {unread ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand)]" aria-hidden />
      ) : (
        <span className="mt-2 h-2 w-2 shrink-0" aria-hidden />
      )}
      <Link href={notification.href ?? "#"} className="min-w-0 flex-1" onClick={() => unread && markRead()}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold leading-snug">{notification.title}</p>
          {notification.priority === "urgent" ? <Badge tone="critical">Urgent</Badge> : null}
          {notification.priority === "high" ? <Badge tone="brand">Important</Badge> : null}
        </div>
        {notification.body ? (
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">{notification.body}</p>
        ) : null}
        <p className="mt-1 text-xs text-[var(--color-subtle)]">{relativeTime(notification.created_at)}</p>
      </Link>
      <div className="flex shrink-0 items-center gap-1">
        {pending ? (
          <Spinner />
        ) : (
          <>
            {unread ? (
              <button
                type="button"
                onClick={markRead}
                className="btn btn-quiet btn-icon"
                aria-label="Mark as read"
              >
                <IconCheck size={14} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={archive}
              className="btn btn-quiet btn-icon"
              aria-label="Archive"
            >
              <IconClose size={14} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
