'use client';

import { useState } from 'react';

import { mistakes as copy, practicePlayer as playerCopy } from '@/lib/copy';
import { MISTAKE_RETIRE_STREAK, type MistakeQuestion } from '@/lib/mistakesService';
import { firestoreBackend, MISTAKES_RUN_SOURCE } from '@/lib/progressBackend';
import { recordPracticeSession } from '@/lib/progressService';
import { computePracticePct } from '@/lib/quizEngine';
import { useRecordOnce } from '@/lib/useRecordOnce';
import { Icon } from '@/components/Icon';
import { ResultsCard } from '@/components/ResultsCard';

/**
 * The mistakes-deck re-attempt player (M6) — the web port of QuizScreen's
 * `source === 'mistakes'` behaviours ONLY: a practice-style run (answer
 * feedback + explanation) over the learner's own active mistakes, wearing the
 * deck badge, with the retire-streak line after a correct answer.
 *
 * ZERO NUDGES, ZERO GATES, ZERO ENTITLEMENT — structurally, not by luck
 * (manual §1; app QuizScreen: "the mistakes deck carries zero ads/gates"):
 * this file imports no nudge machinery (PremiumNudge / UpgradeWall /
 * nudgeGates) and consults no gate function anywhere; and it takes no paid
 * flag at all, because the deck is IDENTICAL for both tiers — the app's
 * mistakes mode never branches on entitlement (load path, badge, feedback and
 * retire line are all tier-blind; the tier arbitration happened per-document
 * at read time). Both properties are pinned by test/mistakesPlayer.test.tsx's
 * source scans.
 *
 * The retire line mirrors the app's exact computation (QuizScreen.js:653-660):
 * after a CORRECT answer, `(q._streak ?? 0) + 1 >= MISTAKE_RETIRE_STREAK`
 * shows retireDone (this answer completes retirement — the recorded run's
 * streak advance is what retires it server-side), otherwise retireProgress.
 * The app's Feather icons are check-circle / rotate-ccw; the web icon set
 * carries no rotate-ccw, so the in-progress state uses `repeat`, the nearest
 * Feather glyph already shipped (adding paths is an icon-pin change this step
 * does not make).
 *
 * On completion the run records ONCE through the M4 service —
 * `recordPracticeSession(..., source: MISTAKES_RUN_SOURCE)`, exactly the
 * app's ResultsScreen call for a mistakes run. That single write is what
 * re-feeds the deck: `updateMistakesFromRun` inside the service advances the
 * streaks (and retires) server-side. Same `useRecordOnce` latch and
 * null-backend skip as the other players.
 */
export function MistakesPlayer({
  chapter,
  questions,
}: {
  chapter: number;
  questions: MistakeQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  // The full parallel answers array (null = not answered), retained across
  // the run so the recorded session feeds the mistakes hook exactly as the
  // app does — recordPracticeSession → updateMistakesFromRun(questions,
  // answers). Same discipline as PracticePlayer.
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);

  const attempted = answers.filter((a) => a !== null).length;
  const scorePct = computePracticePct(correct, attempted);

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
      source: MISTAKES_RUN_SOURCE,
    });
  });

  if (finished) {
    return (
      <ResultsCard
        mood={copy.completion.mood}
        title={copy.completion.title}
        headline={copy.completion.headline(correct, attempted, scorePct)}
        detail={copy.setComplete}
        action={copy.completion.action}
      />
    );
  }

  const question = questions[index];
  if (!question) return null;

  const answered = picked !== null;
  const answeredCorrectly = answered && picked === question.correctIndex;
  const hasNext = index + 1 < questions.length;
  // The app's exact retire computation: the streak THIS correct answer
  // completes, against the locked retire threshold.
  const retires = (question._streak ?? 0) + 1 >= MISTAKE_RETIRE_STREAK;

  function handlePick(optionIndex: number) {
    if (answered) return;
    setPicked(optionIndex);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = optionIndex;
      return next;
    });
    if (question && optionIndex === question.correctIndex) setCorrect((c) => c + 1);
  }

  function handleNext() {
    setIndex(index + 1);
    setPicked(null);
  }

  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      <p className="text-xs font-bold uppercase tracking-wide text-purple">{copy.badge}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">
        {playerCopy.counter(index + 1, questions.length)}
      </p>

      <div className="mt-4 rounded-card bg-white p-6 shadow-card sm:p-8">
        <p className="text-lg font-bold text-ink">{question.question}</p>

        <div role="radiogroup" aria-label={playerCopy.optionsLabel} className="mt-6 flex flex-col gap-3">
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
            <p className={`text-sm font-bold ${answeredCorrectly ? 'text-green' : 'text-red'}`}>
              {answeredCorrectly ? playerCopy.correct : playerCopy.incorrect}
            </p>
            {question.explanation && (
              <p className="mt-2 text-[0.95rem] leading-6 text-muted">{question.explanation}</p>
            )}
            {/* Retire feedback — correct answers only (QuizScreen retire row). */}
            {answeredCorrectly && (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-green">
                <Icon name={retires ? 'check-circle' : 'repeat'} size={14} className="shrink-0" />
                <span>{retires ? copy.retireDone : copy.retireProgress}</span>
              </p>
            )}
          </div>
        )}

        {answered && hasNext && (
          <button
            type="button"
            onClick={handleNext}
            className="mt-6 flex min-h-11 w-full items-center justify-center rounded-pill bg-purple px-6 text-base font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark sm:w-auto"
          >
            {playerCopy.next}
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
              {playerCopy.seeResults}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
