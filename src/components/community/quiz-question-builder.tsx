"use client";

import { useState } from "react";
import { IconClose, IconPlus } from "@/components/icons";

type Answer = { id: number; label: string; is_correct: boolean };
type QuestionKind = "single" | "multiple" | "true_false" | "text";
type Question = { id: number; prompt: string; kind: QuestionKind; points: number; answers: Answer[] };

const KIND_OPTIONS: Array<{ value: QuestionKind; label: string }> = [
  { value: "single", label: "Single choice" },
  { value: "multiple", label: "Multiple choice" },
  { value: "true_false", label: "True / false" },
  { value: "text", label: "Free response" },
];

let uid = 1;
function nextId() {
  return uid++;
}

function blankQuestion(): Question {
  return {
    id: nextId(),
    prompt: "",
    kind: "single",
    points: 1,
    answers: [
      { id: nextId(), label: "", is_correct: true },
      { id: nextId(), label: "", is_correct: false },
    ],
  };
}

/**
 * Create-time dynamic quiz builder. The whole question+answer tree is kept in
 * component state and submitted as a single hidden JSON field — much less
 * error-prone than reconstructing a nested structure from parallel flat
 * `formData.getAll()` arrays.
 */
export function QuizQuestionBuilder() {
  const [questions, setQuestions] = useState<Question[]>([blankQuestion()]);

  const updateQuestion = (id: number, patch: Partial<Question>) =>
    setQuestions((current) => current.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const setKind = (id: number, kind: QuestionKind) =>
    setQuestions((current) =>
      current.map((q) => {
        if (q.id !== id) return q;
        if (kind === "true_false") {
          return {
            ...q,
            kind,
            answers: [
              { id: nextId(), label: "True", is_correct: true },
              { id: nextId(), label: "False", is_correct: false },
            ],
          };
        }
        if (kind === "text") return { ...q, kind, answers: [] };
        return {
          ...q,
          kind,
          answers: q.answers.length ? q.answers : [
            { id: nextId(), label: "", is_correct: true },
            { id: nextId(), label: "", is_correct: false },
          ],
        };
      }),
    );

  const addQuestion = () => setQuestions((current) => [...current, blankQuestion()]);
  const removeQuestion = (id: number) => setQuestions((current) => current.filter((q) => q.id !== id));

  const updateAnswer = (qId: number, aId: number, patch: Partial<Answer>) =>
    setQuestions((current) =>
      current.map((q) =>
        q.id !== qId ? q : { ...q, answers: q.answers.map((a) => (a.id === aId ? { ...a, ...patch } : a)) },
      ),
    );

  const toggleCorrect = (qId: number, aId: number) =>
    setQuestions((current) =>
      current.map((q) => {
        if (q.id !== qId) return q;
        if (q.kind === "single" || q.kind === "true_false") {
          return { ...q, answers: q.answers.map((a) => ({ ...a, is_correct: a.id === aId })) };
        }
        return { ...q, answers: q.answers.map((a) => (a.id === aId ? { ...a, is_correct: !a.is_correct } : a)) };
      }),
    );

  const addAnswer = (qId: number) =>
    setQuestions((current) =>
      current.map((q) =>
        q.id !== qId ? q : { ...q, answers: [...q.answers, { id: nextId(), label: "", is_correct: false }] },
      ),
    );

  const removeAnswer = (qId: number, aId: number) =>
    setQuestions((current) =>
      current.map((q) => (q.id !== qId ? q : { ...q, answers: q.answers.filter((a) => a.id !== aId) })),
    );

  const payload = JSON.stringify(
    questions.map((q) => ({
      prompt: q.prompt,
      kind: q.kind,
      points: q.points,
      answers: q.answers.map((a) => ({ label: a.label, is_correct: a.is_correct })),
    })),
  );

  return (
    <section className="border-t border-[var(--color-line)] pt-6">
      <input type="hidden" name="questions_json" value={payload} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Questions</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Add at least one question before publishing.</p>
        </div>
        <button type="button" onClick={addQuestion} className="btn btn-ghost btn-sm">
          <IconPlus size={15} /> Add question
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {questions.map((q, index) => (
          <div key={q.id} className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">Question {index + 1}</p>
              {questions.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="btn btn-quiet btn-sm text-[var(--color-critical)]"
                  aria-label={`Remove question ${index + 1}`}
                >
                  <IconClose size={14} /> Remove
                </button>
              ) : null}
            </div>

            <div>
              <label className="field-label">Prompt</label>
              <input
                className="field"
                value={q.prompt}
                onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                placeholder="What year did the school open?"
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem]">
              <div>
                <label className="field-label">Answer type</label>
                <select
                  className="field"
                  value={q.kind}
                  onChange={(e) => setKind(q.id, e.target.value as QuestionKind)}
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
                  value={q.points}
                  onChange={(e) => updateQuestion(q.id, { points: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
            </div>

            {q.kind !== "text" ? (
              <div className="mt-3">
                <label className="field-label">Answers <span className="normal-case tracking-normal text-[var(--color-subtle)]">— mark the correct one(s)</span></label>
                <div className="space-y-2">
                  {q.answers.map((a) => (
                    <div key={a.id} className="flex items-center gap-2">
                      <input
                        type={q.kind === "multiple" ? "checkbox" : "radio"}
                        name={`q-${q.id}-correct`}
                        checked={a.is_correct}
                        onChange={() => toggleCorrect(q.id, a.id)}
                        className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                      />
                      <input
                        className="field"
                        value={a.label}
                        disabled={q.kind === "true_false"}
                        onChange={(e) => updateAnswer(q.id, a.id, { label: e.target.value })}
                        placeholder="Answer option"
                      />
                      {q.kind !== "true_false" && q.answers.length > 2 ? (
                        <button
                          type="button"
                          onClick={() => removeAnswer(q.id, a.id)}
                          className="btn btn-quiet btn-icon shrink-0 text-[var(--color-critical)]"
                          aria-label="Remove answer"
                        >
                          <IconClose size={13} />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {q.kind !== "true_false" ? (
                  <button type="button" onClick={() => addAnswer(q.id)} className="btn btn-ghost btn-sm mt-2">
                    <IconPlus size={13} /> Add answer
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs text-[var(--color-subtle)]">
                Free-response questions have no predefined answers — they&apos;re graded manually.
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
