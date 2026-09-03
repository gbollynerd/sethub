import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { IconCheck, IconClock, IconTrophy } from "@/components/icons";
import { formatDate, titleCase } from "@/lib/format";

export const metadata = { title: "Quiz" };
export const dynamic = "force-dynamic";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ setId: string; quizId: string }>;
}) {
  const { setId, quizId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select(
      "id, title, description, kind, status, time_limit_s, question_time_s, attempts_allowed, shuffle, show_answers, pass_mark, prize, opens_at, closes_at",
    )
    .eq("id", quizId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!quiz) notFound();

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, prompt, kind, points, sort_order, quiz_answers ( id, label, is_correct, sort_order )")
    .eq("quiz_id", quizId)
    .order("sort_order");

  const canManage = can(ws, "quizzes.create");

  return (
    <div className="mx-auto max-w-[52rem]">
      <Link href={`/s/${setId}/community/quizzes`} className="btn btn-quiet btn-sm mb-4">← All quizzes</Link>

      <PageHeader
        eyebrow={ws.set.name}
        title={quiz.title}
        description={quiz.description ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={quiz.status === "open" ? "positive" : "default"}>{titleCase(quiz.status)}</Badge>
            {canManage ? (
              <Link href={`/s/${setId}/community/quizzes/${quizId}/edit`} className="btn btn-ghost btn-sm">
                Edit quiz
              </Link>
            ) : null}
          </div>
        }
      />

      <Card>
        <div className="flex flex-wrap gap-1.5">
          <Badge>{titleCase(quiz.kind)}</Badge>
          <Badge>{quiz.attempts_allowed} attempt{quiz.attempts_allowed === 1 ? "" : "s"} allowed</Badge>
          {quiz.time_limit_s ? <Badge icon="clock">{Math.round(quiz.time_limit_s / 60)} min total</Badge> : null}
          {quiz.question_time_s ? <Badge icon="clock">{quiz.question_time_s}s per question</Badge> : null}
          {quiz.pass_mark !== null ? <Badge>Pass mark {quiz.pass_mark}</Badge> : null}
          {quiz.prize ? <Badge tone="caution" icon="trophy">{quiz.prize}</Badge> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
          <span className="flex items-center gap-1.5"><IconClock size={14} /> Opens {quiz.opens_at ? formatDate(quiz.opens_at) : "manually"}</span>
          <span className="flex items-center gap-1.5"><IconClock size={14} /> Closes {quiz.closes_at ? formatDate(quiz.closes_at) : "manually"}</span>
        </div>
      </Card>

      <div className="mt-6">
        <SectionHeader title="Questions" hint={`${questions?.length ?? 0} total`} />
        {!questions || questions.length === 0 ? (
          <EmptyState icon="quiz" title="No questions yet" description="Add questions from the edit page." />
        ) : (
          <ul className="space-y-3">
            {questions.map((q, i) => {
              const answers = ((q.quiz_answers ?? []) as Array<{ id: string; label: string; is_correct: boolean; sort_order: number }>)
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order);
              return (
                <li key={q.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-display text-sm font-semibold">
                      {i + 1}. {q.prompt}
                    </p>
                    <Badge>{q.points} pt{q.points === 1 ? "" : "s"}</Badge>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[var(--color-subtle)]">{titleCase(q.kind)}</p>
                  {answers.length ? (
                    <ul className="mt-3 space-y-1.5">
                      {answers.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-sm">
                          {a.is_correct ? <IconCheck size={14} className="shrink-0 text-[var(--color-positive)]" /> : <span className="inline-block w-[14px]" />}
                          <span className={a.is_correct ? "font-medium" : ""}>{a.label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--color-subtle)]">Free response — graded manually.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-[var(--color-subtle)]">
        <IconTrophy size={15} /> Taking the quiz isn&apos;t available yet — this page shows the quiz definition.
      </p>
    </div>
  );
}
