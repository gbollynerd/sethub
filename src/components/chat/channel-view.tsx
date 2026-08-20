"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Badge } from "@/components/ui";
import { Spinner } from "@/components/forms";
import {
  IconHash, IconLock, IconMegaphone, IconPin, IconSend, IconUpload, IconClose, IconPeople,
} from "@/components/icons";
import { formatDate, formatTime, relativeTime } from "@/lib/format";

interface Message {
  id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  is_pinned: boolean;
  reaction_count: number;
  author_id: string | null;
  membership_id: string | null;
  kind: string;
  author_name?: string | null;
  author_avatar?: string | null;
}

interface Props {
  setId: string;
  channel: {
    id: string;
    name: string;
    topic: string | null;
    visibility: string;
    is_announcement: boolean;
    member_count: number;
    department_name: string | null;
  };
  membershipId: string;
  userId: string;
  canPost: boolean;
  canModerate: boolean;
  initialMessages: Message[];
  members: Array<{ id: string; name: string; avatar: string | null }>;
  files: Array<{ id: string; file_name: string; storage_path: string; created_at: string }>;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🙏", "🔥"];

export function ChannelView({
  setId, channel, membershipId, userId, canPost, canModerate, initialMessages, members, files,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [panel, setPanel] = useState<"none" | "members" | "files" | "pinned">("none");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const nameById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => { scrollToBottom(false); }, [scrollToBottom]);

  /* Realtime */
  useEffect(() => {
    const ch = supabase
      .channel(`messages:${channel.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channel.id}` },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          scrollToBottom();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channel.id}` },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channel.id}` },
        (payload) => {
          const row = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== row.id));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [channel.id, supabase, scrollToBottom]);

  /* Mark read on mount and when new messages land */
  useEffect(() => {
    supabase
      .from("channel_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("channel_id", channel.id)
      .eq("membership_id", membershipId)
      .then(() => undefined);
  }, [channel.id, membershipId, messages.length, supabase]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      body,
      created_at: new Date().toISOString(),
      edited_at: null,
      is_pinned: false,
      reaction_count: 0,
      author_id: userId,
      membership_id: membershipId,
      kind: "text",
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    scrollToBottom();

    const { data, error: err } = await supabase
      .from("messages")
      .insert({
        channel_id: channel.id,
        membership_id: membershipId,
        author_id: userId,
        body,
        body_plain: body,
        kind: "text",
      })
      .select("id, body, created_at, edited_at, is_pinned, reaction_count, author_id, membership_id, kind")
      .single();

    if (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(body);
      setError(err.message);
    } else if (data) {
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (data as Message) : m)));
    }
    setSending(false);
  };

  const react = async (messageId: string, emoji: string) => {
    await supabase.from("message_reactions").insert({
      message_id: messageId, membership_id: membershipId, emoji,
    });
  };

  const togglePin = async (m: Message) => {
    await supabase
      .from("messages")
      .update({ is_pinned: !m.is_pinned, pinned_at: m.is_pinned ? null : new Date().toISOString() })
      .eq("id", m.id);
  };

  const remove = async (m: Message) => {
    await supabase.from("messages").delete().eq("id", m.id);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
  };

  const pinned = messages.filter((m) => m.is_pinned);
  const Icon = channel.is_announcement ? IconMegaphone : channel.visibility === "private" ? IconLock : IconHash;

  /* Group consecutive messages from the same author within 5 minutes. */
  const grouped: Array<{ date: string; items: Array<{ message: Message; showHeader: boolean }> }> = [];
  let lastDate = "";
  let prev: Message | null = null;
  for (const m of messages) {
    const day = formatDate(m.created_at);
    if (day !== lastDate) {
      grouped.push({ date: day, items: [] });
      lastDate = day;
      prev = null;
    }
    const sameAuthor = prev?.membership_id === m.membership_id;
    const close = prev ? new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000 : false;
    grouped[grouped.length - 1].items.push({ message: m, showHeader: !(sameAuthor && close) });
    prev = m;
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-[var(--color-line)] px-4 py-3 sm:px-6">
          <Link href={`/s/${setId}/chat`} className="btn btn-quiet btn-icon sm:hidden" aria-label="Back">
            <IconClose size={17} />
          </Link>
          <Icon size={20} className="shrink-0 text-[var(--color-brand)]" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[1.02rem] font-semibold leading-tight">{channel.name}</h1>
            <p className="truncate text-xs text-[var(--color-subtle)]">
              {channel.member_count} members
              {channel.topic ? ` · ${channel.topic}` : ""}
              {channel.department_name ? ` · ${channel.department_name}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => setPanel(panel === "pinned" ? "none" : "pinned")}
              data-active={panel === "pinned"}
              className="btn btn-quiet btn-icon" aria-label="Pinned messages"
            >
              <IconPin size={17} />
            </button>
            <button
              onClick={() => setPanel(panel === "files" ? "none" : "files")}
              className="btn btn-quiet btn-icon" aria-label="Channel files"
            >
              <IconUpload size={17} />
            </button>
            <button
              onClick={() => setPanel(panel === "members" ? "none" : "members")}
              className="btn btn-quiet btn-icon" aria-label="Channel members"
            >
              <IconPeople size={17} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={listRef} className="scroll-slim min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                <Icon size={26} />
              </span>
              <h2 className="t-h3 mt-4">This is the beginning of #{channel.name}</h2>
              <p className="mt-1.5 max-w-sm text-sm text-[var(--color-muted)]">
                {channel.topic ?? "Say something to get the conversation going."}
              </p>
            </div>
          ) : (
            grouped.map((day) => (
              <div key={day.date}>
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-[var(--color-line)]" />
                  <span className="chip">{day.date}</span>
                  <span className="h-px flex-1 bg-[var(--color-line)]" />
                </div>
                {day.items.map(({ message: m, showHeader }) => {
                  const author = m.membership_id ? nameById.get(m.membership_id) : null;
                  const mine = m.author_id === userId;
                  return (
                    <div
                      key={m.id}
                      className={`group relative -mx-2 flex gap-3 rounded-[var(--radius-sm)] px-2 py-1 transition hover:bg-[var(--color-surface-2)] ${
                        showHeader ? "mt-3" : ""
                      }`}
                    >
                      <div className="w-9 shrink-0">
                        {showHeader ? (
                          <Avatar name={author?.name ?? m.author_name} src={author?.avatar ?? m.author_avatar} size={36} />
                        ) : (
                          <span className="mt-1 block text-center text-[0.6rem] text-transparent group-hover:text-[var(--color-subtle)]">
                            {formatTime(m.created_at).replace(/\s?[AP]M/i, "")}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {showHeader ? (
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-display text-[0.92rem] font-semibold">
                              {author?.name ?? m.author_name ?? "Member"}
                            </span>
                            <span className="text-[0.7rem] text-[var(--color-subtle)]">
                              {formatTime(m.created_at)}
                            </span>
                            {m.is_pinned ? <Badge icon="pin">Pinned</Badge> : null}
                          </div>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words text-[0.94rem] leading-relaxed text-[var(--color-ink-2)]">
                          {m.body}
                          {m.edited_at ? (
                            <span className="ml-1.5 text-[0.7rem] text-[var(--color-subtle)]">(edited)</span>
                          ) : null}
                        </p>
                        {m.reaction_count > 0 ? (
                          <div className="mt-1.5 flex gap-1.5">
                            <span className="chip">👍 {m.reaction_count}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Hover actions */}
                      <div className="absolute -top-3 right-2 hidden items-center gap-0.5 rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-surface)] px-1 py-0.5 shadow-[var(--shadow-card)] group-hover:flex">
                        {QUICK_REACTIONS.slice(0, 3).map((e) => (
                          <button
                            key={e}
                            onClick={() => react(m.id, e)}
                            className="rounded-full px-1.5 py-0.5 text-sm transition hover:bg-[var(--color-surface-2)]"
                            aria-label={`React ${e}`}
                          >
                            {e}
                          </button>
                        ))}
                        {canModerate ? (
                          <button
                            onClick={() => togglePin(m)}
                            className="rounded-full p-1 text-[var(--color-subtle)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                            aria-label={m.is_pinned ? "Unpin" : "Pin"}
                          >
                            <IconPin size={14} />
                          </button>
                        ) : null}
                        {mine || canModerate ? (
                          <button
                            onClick={() => remove(m)}
                            className="rounded-full p-1 text-[var(--color-subtle)] transition hover:bg-[var(--color-critical-soft)] hover:text-[var(--color-critical)]"
                            aria-label="Delete message"
                          >
                            <IconClose size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-[var(--color-line)] px-4 py-3.5 sm:px-6">
          {error ? (
            <p className="mb-2 text-xs text-[var(--color-critical)]">{error}</p>
          ) : null}
          {canPost ? (
            <div className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-2 focus-within:border-[var(--color-brand)] focus-within:shadow-[0_0_0_4px_rgba(8,152,160,0.11)]">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={`Message #${channel.name}`}
                className="max-h-40 min-h-[2.4rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-[0.94rem] outline-none placeholder:text-[var(--color-subtle)]"
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                className="btn btn-primary btn-icon shrink-0"
                aria-label="Send message"
              >
                {sending ? <Spinner /> : <IconSend size={17} />}
              </button>
            </div>
          ) : (
            <p className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-4 py-3 text-center text-sm text-[var(--color-muted)]">
              {channel.is_announcement
                ? "Only administrators can post in this announcement channel."
                : "You do not have permission to post here."}
            </p>
          )}
          <p className="mt-1.5 text-center text-[0.68rem] text-[var(--color-subtle)]">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </div>

      {/* Right panel */}
      {panel !== "none" ? (
        <aside className="hidden w-[17rem] shrink-0 flex-col border-l border-[var(--color-line)] bg-[var(--color-canvas-2)] lg:flex">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3.5">
            <p className="font-display text-sm font-semibold">
              {panel === "members" ? "Members" : panel === "files" ? "Files" : "Pinned"}
            </p>
            <button onClick={() => setPanel("none")} className="btn btn-quiet btn-icon" aria-label="Close panel">
              <IconClose size={15} />
            </button>
          </div>
          <div className="scroll-slim flex-1 overflow-y-auto p-3">
            {panel === "members" ? (
              <ul className="space-y-1">
                {members.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/s/${setId}/people/${m.id}`}
                      className="flex items-center gap-2.5 rounded-[var(--radius-sm)] p-2 transition hover:bg-[var(--color-surface)]"
                    >
                      <Avatar name={m.name} src={m.avatar} size={28} />
                      <span className="truncate text-sm">{m.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : panel === "files" ? (
              files.length ? (
                <ul className="space-y-1.5">
                  {files.map((f) => (
                    <li key={f.id} className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2.5">
                      <p className="truncate text-sm font-medium">{f.file_name}</p>
                      <p className="text-[0.68rem] text-[var(--color-subtle)]">{relativeTime(f.created_at)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 py-6 text-center text-sm text-[var(--color-subtle)]">
                  Files shared in this channel collect here.
                </p>
              )
            ) : pinned.length ? (
              <ul className="space-y-1.5">
                {pinned.map((m) => (
                  <li key={m.id} className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
                    <p className="line-clamp-3 text-sm leading-relaxed">{m.body}</p>
                    <p className="mt-1.5 text-[0.68rem] text-[var(--color-subtle)]">
                      {relativeTime(m.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 py-6 text-center text-sm text-[var(--color-subtle)]">
                Pin the decisions worth keeping and they will show up here.
              </p>
            )}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
