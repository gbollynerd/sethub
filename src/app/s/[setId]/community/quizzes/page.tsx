import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { IconQuiz, IconTrophy } from "@/components/icons";
import { first } from "@/lib/rows";
import { formatDate, relativeTime } from "@/lib/format";

export const metadata = { title: "Quizzes & trivia" };
export const dynamic = "force-dynamic";

export default async function QuizzesPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const [{ data: quizzes }, { data: leaders }] = await Promise.all([
    supabase
      .from("quizzes")
      .select("id, title, description, kind, status, opens_at, closes_at, prize, time_limit_s, pass_mark")
      .eq("set_id", setId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("quiz_attempts")
      .select("id, score, max_score, submitted_at, quizzes!inner ( set_id, title ), set_memberships ( id, profiles ( display_name, avatar_url ) )")
      .eq("quizzes.set_id", setId)
      .not("submitted_at", "is", null)
      .order("score", { ascending: false })
      .limit(10),
  ]);

  const board = (leaders ?? []).map((a) => {
    const sm = first(a.set_memberships) as { id: string; profiles: unknown } | null;
    const p = first(sm?.profiles as { display_name: string | null; avatar_url: string | null }) as
      | { display_name: string | null; avatar_url: string | null }
      | null;
    const quiz = first(a.quizzes) as { title: string } | null;
    return {
      id: a.id as string,
      membershipId: sm?.id ?? "",
      name: p?.display_name ?? "Member",
      avatar: p?.avatar_url ?? null,
      score: Number(a.score),
      max: Number(a.max_score),
      quiz: quiz?.title ?? "",
      at: a.submitted_at as string,
    };
  });

  const live = (quizzes ?? []).filter((q) => q.status === "open");
  const others = (quizzes ?? []).filter((q) => q.status !== "open");

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Quizzes & trivia"
        description="Throwback trivia about your school years — the fastest way to wake a quiet group chat up."
        action={
          can(ws, "quizzes.create") ? (
            <Link href={`/s/${setId}/community/quizzes/new`} className="btn btn-primary btn-sm">
              <IconQuiz size={15} /> Create a quiz
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-7">
          <section>
            <SectionHeader title="Play now" />
            {live.length === 0 ? (
              <EmptyState icon="quiz" title="No live quiz" description="When someone opens a quiz it appears here." />
            ) : (
              <ul className="space-y-3">
                {live.map((q) => (
                  <li key={q.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display text-[1rem] font-semibold">{q.title}</h3>
                        {q.description ? (
                          <p className="mt-1 text-sm text-[var(--color-muted)]">{q.description}</p>
                        ) : null}
                      </div>
                      <Badge tone="positive">Live</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge>{q.kind}</Badge>
                      {q.time_limit_s ? <Badge icon="clock">{Math.round(q.time_limit_s / 60)} min</Badge> : null}
                      {q.prize ? <Badge tone="caution" icon="trophy">{q.prize}</Badge> : null}
                      {q.closes_at ? <Badge>Closes {relativeTime(q.closes_at)}</Badge> : null}
                    </div>
                    <Link href={`/s/${setId}/community/quizzes/${q.id}`} className="btn btn-primary btn-sm mt-4">
                      Start quiz
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {others.length ? (
            <section>
              <SectionHeader title="Scheduled & past" />
              <ul className="space-y-2">
                {others.map((q) => (
                  <li key={q.id} className="card flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[0.95rem] font-semibold">{q.title}</p>
                      <p className="text-xs text-[var(--color-subtle)]">
                        {q.opens_at ? `Opens ${formatDate(q.opens_at)}` : "Not scheduled"}
                      </p>
                    </div>
                    <Badge tone={q.status === "draft" ? "default" : "info"}>{q.status}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <Card>
          <SectionHeader title="Leaderboard" hint="Top scores across every quiz" />
          {board.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-subtle)]">
              Nobody has played yet.
            </p>
          ) : (
            <ol className="space-y-2.5">
              {board.map((b, i) => (
                <li key={b.id} className="flex items-center gap-3">
                  <span
                    className={`tabular grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-[var(--color-gold)] text-[var(--color-ink)]"
                      : i === 1 ? "bg-[var(--color-line-strong)] text-[var(--color-ink)]"
                      : i === 2 ? "bg-[var(--color-caution-soft)] text-[var(--color-caution)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-subtle)]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Avatar name={b.name} src={b.avatar} size={30} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/s/${setId}/people/${b.membershipId}`} className="block truncate text-sm font-semibold hover:underline">
                      {b.name}
                    </Link>
                    <p className="truncate text-xs text-[var(--color-subtle)]">{b.quiz}</p>
                  </div>
                  <span className="tabular shrink-0 text-sm font-bold text-[var(--color-brand-deep)]">
                    {b.score}/{b.max}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-5 flex items-center gap-2 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-subtle)]">
            <IconTrophy size={14} /> Winners are announced in #general.
          </div>
        </Card>
      </div>
    </div>
  );
}
