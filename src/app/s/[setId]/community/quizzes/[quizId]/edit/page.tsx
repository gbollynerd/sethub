import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Card } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { QuizQuestionEditor } from "@/components/community/quiz-question-editor";
import { DeleteQuizButton } from "@/components/community/delete-quiz-button";

export const metadata = { title: "Edit quiz" };
export const dynamic = "force-dynamic";

const KIND_OPTIONS = [
  { value: "quiz", label: "Quiz" },
  { value: "trivia", label: "Trivia" },
  { value: "survey", label: "Survey" },
];

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in the viewer's local time.
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ setId: string; quizId: string }>;
}) {
  const { setId, quizId } = await params;
  const ws = await getWorkspace(setId);
  if (!can(ws, "quizzes.create")) redirect(`/s/${setId}/community/quizzes/${quizId}`);

  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select(
      "id, title, description, kind, time_limit_s, question_time_s, attempts_allowed, shuffle, show_answers, pass_mark, prize, opens_at, closes_at, department_id",
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

  async function updateQuiz(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);
    if (!can(workspace, "quizzes.create")) redirect(`/s/${setId}/community/quizzes/${quizId}`);

    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    const opensAtRaw = String(formData.get("opens_at") ?? "");
    const closesAtRaw = String(formData.get("closes_at") ?? "");

    await supabase
      .from("quizzes")
      .update({
        department_id: String(formData.get("department_id") ?? "") || null,
        title,
        description: String(formData.get("description") ?? "").trim() || null,
        kind: String(formData.get("kind") ?? "quiz"),
        time_limit_s: Number(formData.get("time_limit_s")) || null,
        question_time_s: Number(formData.get("question_time_s")) || null,
        attempts_allowed: Math.max(1, Number(formData.get("attempts_allowed")) || 1),
        shuffle: Boolean(formData.get("shuffle")),
        show_answers: Boolean(formData.get("show_answers")),
        pass_mark: Number(formData.get("pass_mark")) || null,
        prize: String(formData.get("prize") ?? "").trim() || null,
        opens_at: opensAtRaw ? new Date(opensAtRaw).toISOString() : null,
        closes_at: closesAtRaw ? new Date(closesAtRaw).toISOString() : null,
      })
      .eq("id", quizId)
      .eq("set_id", setId);

    redirect(`/s/${setId}/community/quizzes/${quizId}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/s/${setId}/community/quizzes/${quizId}`} className="btn btn-quiet btn-sm mb-4">← Back to quiz</Link>
      <h1 className="t-h1">Edit quiz</h1>
      <p className="t-lead mb-7 mt-2">Changes apply immediately.</p>

      <Card>
        <form action={updateQuiz} className="space-y-6">
          <section className="space-y-4">
            <Field label="Title" name="title" required defaultValue={quiz.title} />
            <TextArea label="Description" name="description" rows={3} defaultValue={quiz.description ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Type" name="kind" options={KIND_OPTIONS} defaultValue={quiz.kind} />
              {ws.departments.length ? (
                <Select
                  label="Scope" name="department_id"
                  options={ws.departments.map((d) => ({ value: d.id, label: d.name }))}
                  defaultValue={quiz.department_id ?? ""}
                  placeholder="Whole set"
                />
              ) : null}
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Time limit (seconds)" name="time_limit_s" type="number" min={0} defaultValue={quiz.time_limit_s ?? undefined} placeholder="No limit" />
              <Field label="Time per question (seconds)" name="question_time_s" type="number" min={0} defaultValue={quiz.question_time_s ?? undefined} placeholder="No limit" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Attempts allowed" name="attempts_allowed" type="number" min={1} defaultValue={quiz.attempts_allowed} />
              <Field label="Pass mark" name="pass_mark" type="number" min={0} defaultValue={quiz.pass_mark ?? undefined} placeholder="None" />
            </div>
            <Field label="Prize" name="prize" defaultValue={quiz.prize ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Opens at" name="opens_at" type="datetime-local" defaultValue={toLocalInput(quiz.opens_at)} />
              <Field label="Closes at" name="closes_at" type="datetime-local" defaultValue={toLocalInput(quiz.closes_at)} />
            </div>
            <Toggle label="Shuffle questions" name="shuffle" defaultChecked={quiz.shuffle} />
            <Toggle label="Show correct answers after submitting" name="show_answers" defaultChecked={quiz.show_answers} />
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
            <DeleteQuizButton setId={setId} quizId={quizId} />
            <SubmitButton className="btn btn-primary" pendingLabel="Saving…">Save changes</SubmitButton>
          </div>
        </form>
      </Card>

      <div className="mt-6">
        <QuizQuestionEditor
          quizId={quizId}
          questions={(questions ?? []).map((q) => ({
            id: q.id as string,
            prompt: q.prompt as string,
            kind: q.kind as string,
            points: q.points as number,
            sortOrder: q.sort_order as number,
            answers: ((q.quiz_answers ?? []) as Array<{ id: string; label: string; is_correct: boolean; sort_order: number }>)
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((a) => ({ id: a.id, label: a.label, is_correct: a.is_correct, sortOrder: a.sort_order })),
          }))}
        />
      </div>
    </div>
  );
}
