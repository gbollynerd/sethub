import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Badge, PageHeader } from "@/components/ui";
import { IconArrow, IconCommunity, IconMegaphone, IconPoll, IconQuiz } from "@/components/icons";

export const metadata = { title: "Community" };
export const dynamic = "force-dynamic";

export default async function CommunityPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const [ann, groups, polls, quizzes] = await Promise.all([
    supabase.from("announcements").select("id", { count: "exact", head: true }).eq("set_id", setId),
    supabase.from("groups").select("id", { count: "exact", head: true }).eq("set_id", setId).is("archived_at", null),
    supabase.from("polls").select("id", { count: "exact", head: true }).eq("set_id", setId).eq("status", "open"),
    supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("set_id", setId),
  ]);

  const tiles = [
    {
      href: `/s/${setId}/community/announcements`, icon: IconMegaphone, title: "Announcements",
      body: "Official notices from the executives, pinned where nobody can miss them.",
      count: ann.count ?? 0, unit: "posted", tone: "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]",
    },
    {
      href: `/s/${setId}/community/groups`, icon: IconCommunity, title: "Groups & committees",
      body: "Electoral, welfare, project and reunion committees — each with its own private channel.",
      count: groups.count ?? 0, unit: "active", tone: "bg-[var(--color-plum-soft)] text-[var(--color-plum)]",
    },
    {
      href: `/s/${setId}/community/polls`, icon: IconPoll, title: "Polls",
      body: "Quick decisions without a full election. Anonymous or open, single or multiple choice.",
      count: polls.count ?? 0, unit: "open now", tone: "bg-[var(--color-caution-soft)] text-[var(--color-caution)]",
    },
    {
      href: `/s/${setId}/community/quizzes`, icon: IconQuiz, title: "Quizzes & trivia",
      body: "Throwback trivia with a leaderboard — the easiest way to wake a quiet set up.",
      count: quizzes.count ?? 0, unit: "created", tone: "bg-[var(--color-positive-soft)] text-[var(--color-positive)]",
    },
  ];

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Community"
        description="Everything that keeps the set talking, deciding and having a bit of fun."
      />

      <div className="stagger grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card card-hover group flex flex-col p-6">
            <span className={`grid h-12 w-12 place-items-center rounded-[var(--radius-md)] ${t.tone}`}>
              <t.icon size={22} />
            </span>
            <div className="mt-4 flex items-center gap-3">
              <h2 className="t-h3">{t.title}</h2>
              <Badge>{t.count} {t.unit}</Badge>
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">{t.body}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-dark)]">
              Open <IconArrow size={15} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
