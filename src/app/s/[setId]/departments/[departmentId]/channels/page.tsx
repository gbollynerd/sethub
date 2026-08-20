import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Badge, EmptyState, SectionHeader } from "@/components/ui";
import { IconHash, IconLock, IconMegaphone, IconPlus } from "@/components/icons";
import { relativeTime } from "@/lib/format";

export const metadata = { title: "Department channels" };
export const dynamic = "force-dynamic";

export default async function DepartmentChannelsPage({
  params,
}: {
  params: Promise<{ setId: string; departmentId: string }>;
}) {
  const { setId, departmentId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const isDeptAdmin = ws.departmentAdminIds.includes(departmentId);

  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, topic, visibility, is_announcement, message_count, member_count, last_message_at")
    .eq("department_id", departmentId)
    .is("archived_at", null)
    .order("name");

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <SectionHeader
          title="Channels"
          hint="Only members of this department can read or post here"
        />
        {isDeptAdmin ? (
          <Link href={`/s/${setId}/chat/new`} className="btn btn-primary btn-sm shrink-0">
            <IconPlus size={15} /> New channel
          </Link>
        ) : null}
      </div>

      {!channels?.length ? (
        <EmptyState icon="chat" title="No department channels yet" description="Department admins can create channels that only this department can see." />
      ) : (
        <ul className="stagger space-y-2">
          {channels.map((c) => (
            <li key={c.id}>
              <Link href={`/s/${setId}/chat/${c.id}`} className="card card-hover flex items-center gap-4 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
                  {c.is_announcement ? <IconMegaphone size={19} /> : <IconHash size={19} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[0.96rem] font-semibold">{c.name}</p>
                  <p className="truncate text-sm text-[var(--color-muted)]">
                    {c.topic ?? `${c.member_count} members · ${c.message_count} messages`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c.visibility === "private" ? <Badge icon="lock">Private</Badge> : null}
                  {c.last_message_at ? (
                    <span className="text-xs text-[var(--color-subtle)]">{relativeTime(c.last_message_at)}</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
