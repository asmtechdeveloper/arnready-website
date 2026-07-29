'use client';

import { useState } from 'react';

import { examNudgeBeforeStart } from '@/lib/nudgeGates';
import { computeExamScorePct, type Question } from '@/lib/quizEngine';
import { firestoreBackend } from '@/lib/progressBackend';
import { recordExamSession } from '@/lib/progressService';
import { useRecordOnce } from '@/lib/useRecordOnce';
import { examPlayer as copy, results as resultsCopy } from '@/lib/copy';
import { PremiumNudge } from '@/components/PremiumNudge';
import { ResultsCard } from '@/components/ResultsCard';

type ExamScope = 'sample' | 'full';

/**
 * The exam player mounted into `ExamSurface`'s slot (M5 plan D8, step S5).
 * Owns the run's local state — the current 0-based index, the per-question
 * answers array, the running correct count, and whether the run has
 * started — and nothing else: no Firestore write of any kind (session
 * recording is S7, through the M4 service only).
 *
 * THE EXAM IS NEVER INTERRUPTED AFTER IT STARTS. There is exactly ONE call
 * to a gate function in this entire file, and it lives in the `started`
 * lazy initializer below — a `useState` initializer runs exactly once, at
 * mount, and never again on any later render no matter how many times
 * `isPaid` changes on the parent. Everything from the `if (!started)` guard
 * down to the end of the component is the running exam's per-question
 * render path, and it calls no gate/nudge function of any kind — there is
 * deliberately no exam per-question gate exported by `nudgeGates.ts` (its
 * absence IS the guarantee; M2 D3, ../ARNReady-App/documents/adgate-logic.md:
 * "Exam mode never consults gateBeforeQuestion").
 *
 * `examScope` is captured the same way, in its own lazy initializer, at the
 * same mount: `'full'` for a paid run, `'sample'` for a free one. Captured
 * once, read everywhere else, never recomputed — an entitlement flip
 * mid-run must not reclassify the attempt (M5 plan D8).
 *
 * NO WALL: the free exam set is already drawn from the capped 20 by
 * `drawExamSet` upstream (`questionDelivery.ts`), so there is nothing here
 * for a wall to guard. `<UpgradeWall>` is never imported.
 *
 * Interaction shape (ported from ../ARNReady-App/screens/QuizScreen.js, its
 * doc comment: "Exam mode: purple selection only... no explanations, Submit
 * on last question"): unlike `PracticePlayer`, an answer is never revealed
 * as right or wrong and carries no explanation — "no peeking" until the run
 * ends. The app auto-advances 300ms after a pick; this port instead uses an
 * explicit "Next question" / "Submit exam" control once an answer is picked,
 * mirroring `PracticePlayer`'s own manual-advance convention for
 * testability and keyboard operability — a deliberate, unpinned deviation
 * from the app's timer, not a locked rule. The app is UNTIMED at the
 * exam-as-a-whole level (no countdown), and this port stays that way too.
 */
export function ExamPlayer({
  chapter,
  questions,
  isPaid,
}: {
  chapter: number;
  questions: Question[];
  isPaid: boolean;
}) {
  // ─── THE ONLY GATE CALL IN THIS FILE ──────────────────────────────────────
  // `nudgeShown` is hardcoded `false` here because a freshly mounted run has,
  // by definition, not shown its one pre-start nudge yet.
  const [started, setStarted] = useState(
    () => examNudgeBeforeStart({ isPaid, nudgeShown: false }) === null,
  );

  // Captured once, at the same mount, and never recomputed (M5 plan D8).
  const [examScope] = useState<ExamScope>(() => (isPaid ? 'full' : 'sample'));

  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  const served = questions.length;
  const attempted = answers.filter((a) => a !== null).length;
  // Scored through the LOCKED formula, driven by the IMMUTABLE captured scope
  // (not the live `isPaid` prop): a mid-run entitlement flip must not change
  // the denominator — free = ÷max(10, attempted), full = ÷served. This is the
  // same denominator recordExamSession stores, so display and record agree.
  const scorePct = computeExamScorePct({
    isPaid: examScope === 'full',
    correct,
    attempted,
    served,
  });

  // Record ONCE, through the M4 service only, when the exam is submitted
  // (D10/D14). A null backend (signed out / Firebase unavailable) shows results
  // but writes nothing — never throws, never retries into a write.
  useRecordOnce(submitted, () => {
    const backend = firestoreBackend();
    if (!backend) return;
    void recordExamSession(backend, {
      chapterNumber: chapter,
      correct,
      attempted,
      served,
      scorePct,
      examScope,
      answers,
      questions,
    });
  });

  if (!started) {
    return (
      <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
        <PremiumNudge variant="exam" onContinue={() => setStarted(true)} />
      </div>
    );
  }

  if (submitted) {
    return (
      <ResultsCard
        mood={resultsCopy.exam.mood}
        title={resultsCopy.exam.title}
        headline={resultsCopy.exam.headline(scorePct)}
        detail={copy.complete}
        action={resultsCopy.exam.action}
      />
    );
  }

  // ─── Running exam — NO gate/nudge function is ever called below this line. ───
  const safeIndex = Math.min(index, Math.max(questions.length - 1, 0));
  const question = questions[safeIndex];
  if (!question) return null;

  const picked = answers[safeIndex] ?? null;
  const answered = picked !== null;
  const hasNext = safeIndex + 1 < questions.length;

  function handlePick(optionIndex: number) {
    if (answered) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[safeIndex] = optionIndex;
      return next;
    });
    if (question && optionIndex === question.correctIndex) setCorrect((c) => c + 1);
  }

  function handleNext() {
    setIndex(safeIndex + 1);
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      <p className="text-xs font-bold uppercase tracking-wide text-purple">{copy.badge}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">
        {copy.counter(safeIndex + 1, questions.length)}
      </p>

      <div className="mt-4 rounded-card bg-white p-6 shadow-card sm:p-8">
        <p className="text-lg font-bold text-ink">{question.question}</p>

        <div role="radiogroup" aria-label={copy.optionsLabel} className="mt-6 flex flex-col gap-3">
          {question.options.map((option, i) => {
            const isSelected = picked === i;
            const tone = isSelected
              ? 'border-purple bg-purple-soft text-ink'
              : answered
                ? 'border-line bg-white text-muted'
                : 'border-line bg-white text-ink hover:border-purple';

            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={answered}
                onClick={() => handlePick(i)}
                className={`flex min-h-11 min-w-[44px] items-center rounded-control border px-4 py-3 text-left text-[0.95rem] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:cursor-default ${tone}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {answered && hasNext && (
          <button
            type="button"
            onClick={handleNext}
            className="mt-6 flex min-h-11 w-full items-center justify-center rounded-pill bg-purple px-6 text-base font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark sm:w-auto"
          >
            {copy.next}
          </button>
        )}

        {answered && !hasNext && (
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-6 flex min-h-11 w-full items-center justify-center rounded-pill bg-purple px-6 text-base font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark sm:w-auto"
          >
            {copy.submit}
          </button>
        )}
      </div>

      {/* Run state, exposed for S7's later results wiring and for tests —
          never written to Firestore from here (D14: recording is S7's job,
          through the M4 service only). `examScope` is captured once at mount
          (above) and read here verbatim — never recomputed. */}
      <span
        hidden
        data-testid="exam-player-state"
        data-index={safeIndex}
        data-correct={correct}
        data-scope={examScope}
        data-answers={JSON.stringify(answers)}
        data-submitted={submitted ? 'true' : 'false'}
      />
    </div>
  );
}
