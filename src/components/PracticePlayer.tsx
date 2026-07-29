'use client';

import { useState } from 'react';

import { practiceNudgeBeforeQuestion, practiceWallBeforeQuestion } from '@/lib/nudgeGates';
import { computePracticePct, type Question } from '@/lib/quizEngine';
import { firestoreBackend } from '@/lib/progressBackend';
import { recordPracticeSession } from '@/lib/progressService';
import { useRecordOnce } from '@/lib/useRecordOnce';
import { practicePlayer as copy, results as resultsCopy } from '@/lib/copy';
import { PremiumNudge } from '@/components/PremiumNudge';
import { ResultsCard } from '@/components/ResultsCard';
import { UpgradeWall } from '@/components/UpgradeWall';

/**
 * The practice player mounted into `PracticeSurface`'s slot (M5 plan D7,
 * step S4). Owns the run's local state — the current 0-based index, the
 * current question's pick, the running correct count, and
 * `nudgesShownThisRun` — and nothing else: no Firestore write of any kind
 * (session recording is S7, through the M4 service only).
 *
 * GATE LOGIC IS CONSUMED, NEVER RE-DERIVED. Every render re-checks, in this
 * order, exactly the two pinned functions from `src/lib/nudgeGates.ts`:
 *
 *   1. `practiceWallBeforeQuestion(index, { isPaid })` — 'wall' renders
 *      `<UpgradeWall>` and NOTHING else: no question text reaches the page,
 *      not even off-screen, because the question array is never touched on
 *      this branch.
 *   2. `practiceNudgeBeforeQuestion(index, { isPaid, nudgesShownThisRun })` —
 *      'nudge' renders `<PremiumNudge variant="practice">`; continuing
 *      increments `nudgesShownThisRun`, which is what makes the gate
 *      functions' own one-shot logic resolve to "already shown" on every
 *      later render this run.
 *   3. Otherwise, the question at that index.
 *
 * `index` starts at the caller's requested 0-based position (from the
 * `?q=` deep link, already validated 1-based/defaulted by `PracticeSurface`)
 * BEFORE any clamping to the delivered array's length — the wall must see
 * the true requested position, because a free user's array is already
 * capped to 20 items by `capFreeQuestionSet` upstream (questionDelivery.ts).
 * A deep link past the cap (e.g. `?q=21`) therefore trips the wall on data
 * the player never even has, which is the point: BOTH the data cap and this
 * wall check hold independently (plan D7's "belt and suspenders").
 *
 * No control in this component (the "Next question" action is the only one)
 * ever offers an index at or beyond the delivered array's length — Next is
 * only rendered while a further index exists in `questions`, so a free
 * user's own array (already capped upstream) bounds it structurally without
 * this file repeating the cap as a number.
 */
export function PracticePlayer({
  chapter,
  questions,
  startAt,
  isPaid,
}: {
  chapter: number;
  questions: Question[];
  /** 1-based, already validated (`PracticeSurface`'s `parseStartAt`). */
  startAt: number;
  isPaid: boolean;
}) {
  const [index, setIndex] = useState(() => startAt - 1);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [nudgesShownThisRun, setNudgesShownThisRun] = useState(0);
  // The full parallel answers array (null = not answered), retained across the
  // run so the completed session feeds the app's mistakes deck exactly as the
  // app does — recordPracticeSession → updateMistakesFromRun(questions, answers)
  // (S7 / D10). The single `picked` above still drives the CURRENT question's
  // UI; this is its run-long record.
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);

  const attempted = answers.filter((a) => a !== null).length;
  const scorePct = computePracticePct(correct, attempted);

  // Record ONCE, through the M4 service only, when the run finishes (D10/D14).
  // A null backend (signed out / Firebase unavailable) shows results but writes
  // nothing — never throws, never retries into a write.
  useRecordOnce(finished, () => {
    const backend = firestoreBackend();
    if (!backend) return;
    void recordPracticeSession(backend, {
      chapterNumber: chapter,
      correct,
      attempted,
      scorePct,
      answers,
      questions,
    });
  });

  if (finished) {
    return (
      <ResultsCard
        mood={resultsCopy.practice.mood}
        title={resultsCopy.practice.title}
        headline={resultsCopy.practice.headline(correct, attempted, scorePct)}
        detail={copy.setComplete}
        action={resultsCopy.practice.action}
      />
    );
  }

  const wallDecision = practiceWallBeforeQuestion(index, { isPaid });
  if (wallDecision === 'wall') {
    return <UpgradeWall returnTo={{ chapter }} />;
  }

  const nudgeDecision = practiceNudgeBeforeQuestion(index, { isPaid, nudgesShownThisRun });
  if (nudgeDecision === 'nudge') {
    return (
      <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
        <PremiumNudge variant="practice" onContinue={() => setNudgesShownThisRun((n) => n + 1)} />
      </div>
    );
  }

  // Defensive clamp for rendering only — the gate checks above always use
  // the raw `index`. This guards a chapter whose delivered set is shorter
  // than the wall's cap (e.g. only 15 free questions uploaded so far):
  // still not a wall (index < 20), but out of bounds for a 15-item array.
  const safeIndex = Math.min(index, Math.max(questions.length - 1, 0));
  const question = questions[safeIndex];
  if (!question) return null;

  const answered = picked !== null;
  const hasNext = safeIndex + 1 < questions.length;

  function handlePick(optionIndex: number) {
    if (answered) return;
    setPicked(optionIndex);
    setAnswers((prev) => {
      const next = [...prev];
      next[safeIndex] = optionIndex;
      return next;
    });
    if (question && optionIndex === question.correctIndex) setCorrect((c) => c + 1);
  }

  function handleNext() {
    setIndex(safeIndex + 1);
    setPicked(null);
  }

  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      <p className="text-xs font-bold uppercase tracking-wide text-purple">
        {copy.counter(safeIndex + 1, questions.length)}
      </p>

      <div className="mt-4 rounded-card bg-white p-6 shadow-card sm:p-8">
        <p className="text-lg font-bold text-ink">{question.question}</p>

        <div role="radiogroup" aria-label={copy.optionsLabel} className="mt-6 flex flex-col gap-3">
          {question.options.map((option, i) => {
            const isSelected = picked === i;
            const isCorrectOption = i === question.correctIndex;
            const showGreen = answered && isCorrectOption;
            const showRed = answered && isSelected && !isCorrectOption;
            const showDim = answered && !isSelected && !isCorrectOption;

            const tone = showGreen
              ? 'border-green bg-green-soft text-ink'
              : showRed
                ? 'border-red bg-white text-ink'
                : showDim
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

        {answered && (
          <div className="mt-6 border-t border-line pt-4">
            <p className={`text-sm font-bold ${picked === question.correctIndex ? 'text-green' : 'text-red'}`}>
              {picked === question.correctIndex ? copy.correct : copy.incorrect}
            </p>
            {question.explanation && (
              <p className="mt-2 text-[0.95rem] leading-6 text-muted">{question.explanation}</p>
            )}
          </div>
        )}

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
          <div className="mt-6 flex flex-col items-start gap-4">
            <p className="text-[0.95rem] leading-6 text-muted" role="status">
              {copy.setComplete}
            </p>
            <button
              type="button"
              onClick={() => setFinished(true)}
              className="flex min-h-11 w-full items-center justify-center rounded-pill bg-purple px-6 text-base font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark sm:w-auto"
            >
              {copy.seeResults}
            </button>
          </div>
        )}
      </div>

      {/* Run state, exposed for S7's later results wiring and for tests —
          never written to Firestore from here (D14: recording is S7's job,
          through the M4 service only). */}
      <span
        hidden
        data-testid="practice-player-state"
        data-index={safeIndex}
        data-correct={correct}
        data-nudges-shown={nudgesShownThisRun}
      />
    </div>
  );
}
