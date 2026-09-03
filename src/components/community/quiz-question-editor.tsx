"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/forms";
import { IconClose, IconPlus } from "@/components/icons";

export interface EditableAnswer {
  id: string;
  label: string;
  is_correct: boolean;
  sortOrder: number;
}

export interface EditableQuestion {
  id: string;
  prompt: string;
  kind: string;
  points: number;
  sortOrder: number;
  answers: EditableAnswer[];
}

const KIND_OPTIONS = [
  { value: "single", label: "Single choice" },
  { value: "multiple", label: "Multiple choice" },
  { value: "true_false", label: "True / false" },
  { value: "text", label: "Free response" },
];

/** Per-row live editor for a quiz's questions and their nested answers. */
export function QuizQuestionEditor({
  quizId,
  questions,
}: {
  quizId: string;
  questions: EditableQuestion[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => PromiseLike<{ error: { message: string } | null }>) =>
    start(async () => {
      setError(null);
      const { error: err } = await fn();
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    });

  const saveQuestion = (id: string, patch: Record<string, unknown>) =>
    run(() => supabase.from("quiz_questions").update(patch).eq("id", id));

  const removeQuestion = (id: string) => {
    if (!window.confirm("Remove this question and its answers?")) return;
    run(() => supabase.from("quiz_questions").delete().eq("id", id));
  };

  const addQuestion = () =>
    run(() =>
      supabase.from("quiz_questions").insert({
        quiz_id: quizId,
        prompt: "New question",
        kind: "single",
        points: 1,
        sort_order: questions.length,
      }),
    );

  const saveAnswer = (id: string, patch: Record<string, unknown>) =>
    run(() => supabase.from("quiz_answers").update(patch).eq("id", id));

  const removeAnswer = (id: string) => run(() => supabase.from("quiz_answers").delete().eq("id", id));

  const addAnswer = (questionId: string, sortOrder: number) =>
    run(() => supabase.from("quiz_answers").insert({ question_id: questionId, label: "", is_correct: false, sort_order: sortOrder }));

  return (
    <section className="border-t border-[var(--color-line)] pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Questions</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Changes save automatically as you leave a field.</p>
        </div>
        <button type="button" onClick={addQuestion} disabled={pending} className="btn btn-ghost btn-sm">
          <IconPlus size={15} /> Add question
        </button>
      </div>

      {error ? <div className="mt-3"><Alert tone="error">{error}</Alert></div> : null}

      <div className="mt-4 space-y-4">
        {questions.map((q, index) => (
          <QuestionRow
            key={q.id}
            question={q}
            index={index}
            pending={pending}
            onSaveQuestion={saveQuestion}
            onRemoveQuestion={removeQuestion}
            onSaveAnswer={saveAnswer}
            onRemoveAnswer={removeAnswer}
            onAddAnswer={addAnswer}
          />
        ))}
        {questions.length === 0 ? (
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-3.5 text-sm text-[var(--color-subtle)]">
            No questions yet. Add one above.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function QuestionRow({
  question,
  index,
  pending,
  onSaveQuestion,
  onRemoveQuestion,
  onSaveAnswer,
  onRemoveAnswer,
  onAddAnswer,
}: {
  question: EditableQuestion;
  index: number;
  pending: boolean;
  onSaveQuestion: (id: string, patch: Record<string, unknown>) => void;
  onRemoveQuestion: (id: string) => void;
  onSaveAnswer: (id: string, patch: Record<string, unknown>) => void;
  onRemoveAnswer: (id: string) => void;
  onAddAnswer: (questionId: string, sortOrder: number) => void;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [points, setPoints] = useState(String(question.points));

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">Question {index + 1}</p>
        <button
          type="button"
          onClick={() => onRemoveQuestion(question.id)}
          disabled={pending}
          className="btn btn-quiet btn-sm text-[var(--color-critical)]"
        >
          <IconClose size={14} /> Remove
        </button>
      </div>

      <div>
        <label className="field-label">Prompt</label>
        <input
          className="field"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={() => prompt.trim() && prompt !== question.prompt && onSaveQuestion(question.id, { prompt: prompt.trim() })}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem]">
        <div>
          <label className="field-label">Answer type</label>
          <select
            className="field"
            value={question.kind}
            onChange={(e) => onSaveQuestion(question.id, { kind: e.target.value })}
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Points</label>
          <input
            className="field"
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            onBlur={() => {
              const n = Math.max(1, Number(points) || 1);
              if (n !== question.points) onSaveQuestion(question.id, { points: n });
            }}
          />
        </div>
      </div>

      {question.kind !== "text" ? (
        <div className="mt-3">
          <label className="field-label">Answers</label>
          <div className="space-y-2">
            {question.answers.map((a) => (
              <AnswerRow key={a.id} answer={a} pending={pending} onSave={onSaveAnswer} onRemove={onRemoveAnswer} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => onAddAnswer(question.id, question.answers.length)}
            disabled={pending}
            className="btn btn-ghost btn-sm mt-2"
          >
            <IconPlus size={13} /> Add answer
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--color-subtle)]">Free-response — graded manually.</p>
      )}
    </div>
  );
}

function AnswerRow({
  answer,
  pending,
  onSave,
  onRemove,
}: {
  answer: EditableAnswer;
  pending: boolean;
  onSave: (id: string, patch: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
}) {
  const [label, setLabel] = useState(answer.label);

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={answer.is_correct}
        onChange={(e) => onSave(answer.id, { is_correct: e.target.checked })}
        className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
        aria-label="Correct answer"
      />
      <input
        className="field"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => label !== answer.label && onSave(answer.id, { label })}
      />
      <button
        type="button"
        onClick={() => onRemove(answer.id)}
        disabled={pending}
        className="btn btn-quiet btn-icon shrink-0 text-[var(--color-critical)]"
        aria-label="Remove answer"
      >
        <IconClose size={13} />
      </button>
    </div>
  );
}
