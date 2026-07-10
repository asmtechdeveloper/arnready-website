'use client';

/**
 * One question, four options. Two display modes:
 *  - feedback (practice): after picking, the correct option goes green, a
 *    wrong pick goes red, and the explanation shows.
 *  - neutral (exam/mock): picks highlight purple, nothing is revealed.
 * Keyboard: A–D / 1–4 select (wired by the parent via onSelect).
 */
import type { Question } from '@/lib/quizEngine';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuestionCard({
  question,
  picked,
  revealed = false,
  onSelect,
}: {
  question: Question;
  picked: number | null;
  /** true in practice after an answer is picked — shows right/wrong + explanation. */
  revealed?: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="rounded-card bg-white p-6 shadow-card sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-muted">
        {question.subtopic ?? 'General'}
      </p>
      <h2 className="mt-2 text-base font-bold leading-relaxed text-ink sm:text-lg">
        {question.question}
      </h2>

      {/* Plain toggle buttons, not role="radio": we don't implement the
          radiogroup roving-tabindex/arrow-key contract, so claiming radio
          semantics would mislead screen readers. */}
      <div className="mt-6 space-y-2.5" role="group" aria-label="Answer options">
        {question.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === question.correctIndex;

          let cls = 'border-line bg-white hover:border-purple hover:bg-purple-soft';
          if (revealed) {
            if (isCorrect) cls = 'border-green bg-green-soft';
            else if (isPicked) cls = 'border-red bg-red-soft';
            else cls = 'border-line bg-white opacity-60';
          } else if (isPicked) {
            cls = 'border-purple bg-purple-soft';
          }

          return (
            <button
              key={i}
              type="button"
              aria-pressed={isPicked}
              disabled={revealed}
              onClick={() => onSelect(i)}
              className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left text-sm leading-relaxed transition-colors ${cls}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  revealed && isCorrect
                    ? 'bg-green text-white'
                    : revealed && isPicked
                      ? 'bg-red text-white'
                      : isPicked
                        ? 'bg-purple text-white'
                        : 'bg-cream text-muted'
                }`}
              >
                {LETTERS[i]}
              </span>
              <span className="font-bold text-ink">{opt}</span>
            </button>
          );
        })}
      </div>

      {revealed && question.explanation && (
        <div className="mt-5 rounded-xl bg-cream p-4">
          <p className="text-xs font-black uppercase tracking-widest text-purple">Why</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
