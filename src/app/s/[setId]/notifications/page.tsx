import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { PageHeader, EmptyState } from "@/components/ui";
import { NotificationRow, type NotificationItem } from "@/components/notifications/notification-row";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

// Notifications are global to the account, not scoped to the set you're
// currently viewing — same cross-app behaviour as the bell in the topbar.
export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { setId } = await params;
  const { filter } = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const unreadOnly = filter === "unread";

  let query = supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at, priority")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(80);
  if (unreadOnly) query = query.is("read_at", null);

  const { data: notifications } = await query;

  async function markAllRead() {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);
    if (!workspace.userId) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    redirect(`/s/${setId}/notifications${unreadOnly ? "?filter=unread" : ""}`);
  }

  return (
    <div className="mx-auto max-w-[42rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Notifications"
        description="Everything relevant across every community you belong to, in one place."
        action={
          <form action={markAllRead}>
            <button type="submit" className="btn btn-ghost btn-sm">Mark all read</button>
          </form>
        }
      />

      <div className="mb-4 flex gap-2">
        <Link
          href={`/s/${setId}/notifications`}
          className={`btn btn-sm ${!unreadOnly ? "btn-primary" : "btn-ghost"}`}
        >
          All
        </Link>
        <Link
          href={`/s/${setId}/notifications?filter=unread`}
          className={`btn btn-sm ${unreadOnly ? "btn-primary" : "btn-ghost"}`}
        >
          Unread
        </Link>
      </div>

      <div className="card overflow-hidden !p-0">
        {!notifications || notifications.length === 0 ? (
          <EmptyState
            icon="bell"
            title={unreadOnly ? "You're all caught up" : "Nothing here yet"}
            description={
              unreadOnly
                ? "No unread notifications."
                : "Notifications about events, elections, polls, quizzes, projects and more will show up here."
            }
          />
        ) : (
          <ul>
            {(notifications as NotificationItem[]).map((n) => (
              <NotificationRow key={n.id} notification={n} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
