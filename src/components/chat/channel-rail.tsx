"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { IconHash, IconLock, IconMegaphone, IconPlus, IconSearch, IconDepartment } from "@/components/icons";
import type { ChannelRow, SetDepartment } from "@/lib/types";

export function ChannelRail({
  setId,
  channels,
  departments,
  myDepartmentIds,
  membership,
  canCreate,
}: {
  setId: string;
  channels: ChannelRow[];
  departments: SetDepartment[];
  myDepartmentIds: string[];
  membership: Array<{ channelId: string; lastReadAt: string | null }>;
  canCreate: boolean;
}) {
  const pathname = usePathname();
  const params = useParams();
  const activeId = params?.channelId as string | undefined;
  const [filter, setFilter] = useState("");

  const joined = useMemo(() => new Set(membership.map((m) => m.channelId)), [membership]);

  const visible = channels.filter((c) =>
    filter ? c.name.toLowerCase().includes(filter.toLowerCase()) : true,
  );

  const setChannels = visible.filter((c) => !c.department_id);
  const byDepartment = departments
    .map((d) => ({ department: d, items: visible.filter((c) => c.department_id === d.id) }))
    .filter((g) => g.items.length);

  return (
    <aside
      className={`w-full shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-canvas-2)] sm:w-[16.5rem] ${
        activeId ? "hidden sm:flex" : "flex"
      }`}
    >
      <div className="border-b border-[var(--color-line)] px-4 py-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[1.05rem] font-semibold">Channels</h2>
          {canCreate ? (
            <Link
              href={`/s/${setId}/chat/new`}
              className="btn btn-quiet btn-icon"
              aria-label="Create channel"
            >
              <IconPlus size={17} />
            </Link>
          ) : null}
        </div>
        <div className="relative mt-3">
          <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter channels"
            className="field py-2 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="scroll-slim flex-1 overflow-y-auto px-2.5 py-3">
        <Group title="Set-wide">
          {setChannels.map((c) => (
            <ChannelLink
              key={c.id}
              setId={setId}
              channel={c}
              active={activeId === c.id || pathname.endsWith(c.id)}
              joined={joined.has(c.id)}
            />
          ))}
          {setChannels.length === 0 ? (
            <p className="px-2 py-2 text-xs text-[var(--color-subtle)]">No channels match.</p>
          ) : null}
        </Group>

        {byDepartment.map(({ department, items }) => (
          <Group
            key={department.id}
            title={department.name}
            accent={department.color}
            note={myDepartmentIds.includes(department.id) ? undefined : "Not a member"}
          >
            {items.map((c) => (
              <ChannelLink
                key={c.id}
                setId={setId}
                channel={c}
                active={activeId === c.id}
                joined={joined.has(c.id)}
                locked={!myDepartmentIds.includes(department.id)}
              />
            ))}
          </Group>
        ))}

        {departments.length && !byDepartment.length ? (
          <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3.5">
            <p className="flex items-center gap-2 text-xs font-semibold text-[var(--color-ink-2)]">
              <IconDepartment size={15} className="text-[var(--color-brand)]" />
              Department channels
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)]">
              Join a department to see its private channels.
            </p>
            <Link href={`/s/${setId}/departments`} className="btn btn-soft btn-sm mt-2.5 w-full">
              Browse departments
            </Link>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Group({
  title,
  children,
  accent,
  note,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string | null;
  note?: string;
}) {
  return (
    <div className="mb-4">
      <p className="mb-1 flex items-center gap-2 px-2 text-[0.66rem] font-bold uppercase tracking-[0.13em] text-[var(--color-subtle)]">
        {accent ? <span className="h-2 w-2 rounded-full" style={{ background: accent }} /> : null}
        <span className="truncate">{title}</span>
        {note ? <span className="ml-auto font-medium normal-case tracking-normal">{note}</span> : null}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function ChannelLink({
  setId,
  channel,
  active,
  joined,
  locked,
}: {
  setId: string;
  channel: ChannelRow;
  active: boolean;
  joined: boolean;
  locked?: boolean;
}) {
  const Icon = channel.is_announcement ? IconMegaphone : channel.visibility === "private" ? IconLock : IconHash;
  return (
    <li>
      <Link
        href={`/s/${setId}/chat/${channel.id}`}
        data-active={active}
        className={`nav-item w-full ${locked ? "opacity-55" : ""}`}
      >
        <Icon size={16} />
        <span className="min-w-0 flex-1 truncate">{channel.name}</span>
        {!joined && !locked ? <span className="chip px-1.5 py-0.5 text-[0.6rem]">Join</span> : null}
      </Link>
    </li>
  );
}
