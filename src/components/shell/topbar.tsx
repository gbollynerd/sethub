"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Badge } from "@/components/ui";
import { IconBell, IconChevronDown, IconLogout, IconSearch, IconSettings, IconClose } from "@/components/icons";
import { relativeTime } from "@/lib/format";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
  set_id: string | null;
  priority: string;
}

interface SearchResults {
  members?: Array<{ id: string; display_name: string; nickname: string | null; department: string | null }>;
  channels?: Array<{ id: string; name: string; topic: string | null }>;
  messages?: Array<{ id: string; body: string; channel: string; channel_id: string; author: string }>;
  events?: Array<{ id: string; title: string; starts_at: string }>;
  documents?: Array<{ id: string; title: string; category: string }>;
  announcements?: Array<{ id: string; title: string }>;
  projects?: Array<{ id: string; title: string; status: string }>;
  businesses?: Array<{ id: string; name: string; category: string | null }>;
}

export function TopBar({
  setId,
  setName,
  institutionName,
  userName,
  avatarUrl,
  contextLabel,
}: {
  setId: string;
  setName: string;
  institutionName: string;
  userName: string;
  avatarUrl: string | null;
  contextLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/88 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-7">
        <div className="hidden min-w-0 sm:block">
          <p className="truncate font-display text-[0.95rem] font-semibold leading-tight">
            {institutionName}
          </p>
          <p className="truncate text-xs text-[var(--color-subtle)]">
            {contextLabel ?? setName}
          </p>
        </div>
        <div className="ml-auto flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <OmniSearch setId={setId} />
          <NotificationBell />
          <UserMenu name={userName} avatarUrl={avatarUrl} setId={setId} />
        </div>
      </div>
    </header>
  );
}

function OmniSearch({ setId }: { setId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({});
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({});
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const supabase = createClient();
        const { data } = await supabase.rpc("search_set", {
          p_set_id: setId,
          p_query: query.trim(),
          p_limit: 5,
        });
        setResults((data as SearchResults) ?? {});
      });
    }, 220);
    return () => clearTimeout(t);
  }, [query, setId]);

  const groups: Array<[string, Array<{ id: string; label: string; sub?: string; href: string }>]> = [
    ["Members", (results.members ?? []).map((m) => ({
      id: m.id, label: m.display_name, sub: m.department ?? m.nickname ?? undefined,
      href: `/s/${setId}/people/${m.id}`,
    }))],
    ["Channels", (results.channels ?? []).map((c) => ({
      id: c.id, label: `#${c.name}`, sub: c.topic ?? undefined, href: `/s/${setId}/chat/${c.id}`,
    }))],
    ["Messages", (results.messages ?? []).map((m) => ({
      id: m.id, label: m.body?.slice(0, 70) ?? "", sub: `#${m.channel} · ${m.author}`,
      href: `/s/${setId}/chat/${m.channel_id}`,
    }))],
    ["Events", (results.events ?? []).map((e) => ({
      id: e.id, label: e.title, href: `/s/${setId}/events/${e.id}`,
    }))],
    ["Announcements", (results.announcements ?? []).map((a) => ({
      id: a.id, label: a.title, href: `/s/${setId}/community/announcements`,
    }))],
    ["Documents", (results.documents ?? []).map((d) => ({
      id: d.id, label: d.title, sub: d.category, href: `/s/${setId}/resources/documents`,
    }))],
    ["Projects", (results.projects ?? []).map((p) => ({
      id: p.id, label: p.title, sub: p.status, href: `/s/${setId}/projects/${p.id}`,
    }))],
    ["Businesses", (results.businesses ?? []).map((b) => ({
      id: b.id, label: b.name, sub: b.category ?? undefined, href: `/s/${setId}/people/businesses`,
    }))],
  ];
  const hasResults = groups.some(([, items]) => items.length);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-subtle)] transition hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] sm:min-w-[15rem]"
      >
        <IconSearch size={17} />
        <span className="hidden flex-1 text-left sm:block">Search this community…</span>
        <kbd className="hidden rounded border border-[var(--color-line)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[0.66rem] font-semibold sm:block">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[10vh]">
          <button
            aria-label="Close search"
            className="absolute inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="animate-pop relative w-full max-w-xl overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[var(--color-line)] px-4">
              <IconSearch size={19} className="text-[var(--color-subtle)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members, messages, events, documents…"
                className="flex-1 bg-transparent py-4 text-[0.95rem] outline-none placeholder:text-[var(--color-subtle)]"
              />
              <button onClick={() => setOpen(false)} className="btn btn-quiet btn-icon" aria-label="Close">
                <IconClose size={16} />
              </button>
            </div>
            <div className="scroll-slim max-h-[55vh] overflow-y-auto p-2">
              {query.trim().length < 2 ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--color-subtle)]">
                  Results stay inside this community — nothing from your other sets appears here.
                </p>
              ) : pending && !hasResults ? (
                <div className="space-y-2 p-2">
                  {[0, 1, 2].map((i) => <div key={i} className="skeleton h-11 w-full" />)}
                </div>
              ) : !hasResults ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--color-subtle)]">
                  Nothing matched “{query}”.
                </p>
              ) : (
                groups.map(([title, items]) =>
                  items.length ? (
                    <div key={title} className="mb-2">
                      <p className="t-eyebrow px-3 py-1.5">{title}</p>
                      <ul>
                        {items.map((it) => (
                          <li key={`${title}-${it.id}`}>
                            <Link
                              href={it.href}
                              onClick={() => setOpen(false)}
                              className="block rounded-[var(--radius-sm)] px-3 py-2 transition hover:bg-[var(--color-surface-2)]"
                            >
                              <span className="block truncate text-sm font-medium">{it.label}</span>
                              {it.sub ? (
                                <span className="block truncate text-xs text-[var(--color-subtle)]">
                                  {it.sub}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, href, read_at, created_at, set_id, priority")
        .order("created_at", { ascending: false })
        .limit(25);
      if (mounted) setItems((data ?? []) as Notification[]);
    };
    load();

    const channel = supabase
      .channel("notifications-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, load)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const markAllRead = async () => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost btn-icon relative"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <IconBell size={19} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-critical)] px-1 text-[0.6rem] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="animate-pop absolute right-0 top-[calc(100%+0.55rem)] z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-lift)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <p className="font-display text-sm font-semibold">Notifications</p>
            {unread > 0 ? (
              <button onClick={markAllRead} className="text-xs font-semibold text-[var(--color-brand-dark)]">
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="scroll-slim max-h-[24rem] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-[var(--color-subtle)]">
                You are all caught up.
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id} className="border-b border-[var(--color-line)] last:border-0">
                  <Link
                    href={n.href ?? "#"}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 transition hover:bg-[var(--color-surface-2)]"
                  >
                    <div className="flex items-start gap-2.5">
                      {!n.read_at ? (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand)]" />
                      ) : (
                        <span className="mt-1.5 h-2 w-2 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug">{n.title}</p>
                        {n.body ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted)]">{n.body}</p>
                        ) : null}
                        <p className="mt-1 text-[0.68rem] text-[var(--color-subtle)]">
                          {relativeTime(n.created_at)}
                        </p>
                      </div>
                      {n.priority === "urgent" ? <Badge tone="critical">Urgent</Badge> : null}
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function UserMenu({ name, avatarUrl, setId }: { name: string; avatarUrl: string | null; setId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-[var(--radius-pill)] p-0.5 transition hover:bg-[var(--color-surface)]"
        aria-label="Account menu"
      >
        <Avatar name={name} src={avatarUrl} size={36} />
        <IconChevronDown size={14} className="hidden text-[var(--color-subtle)] sm:block" />
      </button>

      {open ? (
        <div className="animate-pop absolute right-0 top-[calc(100%+0.55rem)] z-50 w-56 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-lift)]">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-xs text-[var(--color-subtle)]">Global SetHub account</p>
          </div>
          <div className="my-1 h-px bg-[var(--color-line)]" />
          <Link href="/account" onClick={() => setOpen(false)} className="nav-item w-full">
            <IconSettings size={17} /> My profile
          </Link>
          <Link href={`/s/${setId}/settings`} onClick={() => setOpen(false)} className="nav-item w-full">
            <IconSettings size={17} /> Set preferences
          </Link>
          <Link href="/app" onClick={() => setOpen(false)} className="nav-item w-full">
            <IconChevronDown size={17} className="-rotate-90" /> All communities
          </Link>
          <div className="my-1 h-px bg-[var(--color-line)]" />
          <button onClick={signOut} className="nav-item w-full text-[var(--color-critical)]">
            <IconLogout size={17} /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
