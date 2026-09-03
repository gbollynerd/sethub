import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { QuizQuestionBuilder } from "@/components/community/quiz-question-builder";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";

export const metadata = { title: "Create a quiz" };
export const dynamic = "force-dynamic";

const KIND_OPTIONS = [
  { value: "quiz", label: "Quiz" },
  { value: "trivia", label: "Trivia" },
  { value: "survey", label: "Survey" },
];

interface RawQuestion {
  prompt?: string;
  kind?: string;
  points?: number;
  answers?: Array<{ label?: string; is_correct?: boolean }>;
}

export default async function NewQuizPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  if (!can(ws, "quizzes.create")) redirect(`/s/${setId}/community/quizzes`);

  async function createQuiz(formData: FormData) {
    "use server";
    const workspace = await getWorkspace(setId);
    if (!can(workspace, "quizzes.create")) redirect(`/s/${setId}/community/quizzes`);

    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    const opensAtRaw = String(formData.get("opens_at") ?? "");
    const closesAtRaw = String(formData.get("closes_at") ?? "");

    const supabase = await createClient();
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .insert({
        set_id: setId,
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
        status: "draft",
        opens_at: opensAtRaw ? new Date(opensAtRaw).toISOString() : null,
        closes_at: closesAtRaw ? new Date(closesAtRaw).toISOString() : null,
        created_by: workspace.userId,
      })
      .select("id")
      .single();

    if (error || !quiz) redirect(`/s/${setId}/community/quizzes/new`);

    let parsed: RawQuestion[] = [];
    try {
      parsed = JSON.parse(String(formData.get("questions_json") ?? "[]"));
    } catch {
      parsed = [];
    }

    for (const [index, q] of parsed.entries()) {
      const prompt = String(q.prompt ?? "").trim();
      if (!prompt) continue;
      const kind = ["single", "multiple", "true_false", "text"].includes(String(q.kind))
        ? String(q.kind)
        : "single";

      const { data: question, error: qErr } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: quiz.id,
          prompt,
          kind,
          points: Math.max(1, Number(q.points) || 1),
          sort_order: index,
        })
        .select("id")
        .single();

      if (qErr || !question) continue;

      if (kind !== "text" && Array.isArray(q.answers)) {
        const answers = q.answers
          .map((a, aIndex) => ({
            question_id: question.id,
            label: String(a.label ?? "").trim(),
            is_correct: Boolean(a.is_correct),
            sort_order: aIndex,
          }))
          .filter((a) => a.label);
        if (answers.length) await supabase.from("quiz_answers").insert(answers);
      }
    }

    redirect(`/s/${setId}/community/quizzes/${quiz.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/s/${setId}/community/quizzes`} className="btn btn-quiet btn-sm mb-4">← Back to quizzes</Link>
      <h1 className="t-h1">Create a quiz</h1>
      <p className="t-lead mb-7 mt-2">Starts as a draft — open it when you&apos;re ready for members to play.</p>

      <Card>
        <form action={createQuiz} className="space-y-6">
          <section className="space-y-4">
            <Field label="Title" name="title" required placeholder="How well do you know your class?" />
            <TextArea label="Description" name="description" rows={3} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Type" name="kind" options={KIND_OPTIONS} defaultValue="quiz" />
              {ws.departments.length ? (
                <Select
                  label="Scope" name="department_id"
                  options={ws.departments.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Whole set"
                />
              ) : null}
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Time limit (seconds)" name="time_limit_s" type="number" min={0} placeholder="No limit" />
              <Field label="Time per question (seconds)" name="question_time_s" type="number" min={0} placeholder="No limit" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Attempts allowed" name="attempts_allowed" type="number" min={1} defaultValue={1} />
              <Field label="Pass mark" name="pass_mark" type="number" min={0} placeholder="None" />
            </div>
            <Field label="Prize" name="prize" placeholder="Bragging rights, gift card, etc." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Opens at" name="opens_at" type="datetime-local" />
              <Field label="Closes at" name="closes_at" type="datetime-local" />
            </div>
            <Toggle label="Shuffle questions" name="shuffle" defaultChecked hint="Each player gets a different order." />
            <Toggle label="Show correct answers after submitting" name="show_answers" defaultChecked />
          </section>

          <QuizQuestionBuilder />

          <SubmitButton pendingLabel="Creating…">Create quiz</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
