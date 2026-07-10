'use client';

/**
 * The full mock — the web's flagship surface, built for a laptop:
 * persistent question palette, 120-minute countdown with quiet warnings,
 * flag-for-review, keyboard shortcuts (A–D/1–4 answer, arrows move, F flag).
 * LOCKED: 100 questions in official chapter weightage; attempts are recorded
 * on SUBMIT only — abandoning or refreshing discards the attempt and does
 * NOT consume the free mock. Auto-submits at 0:00.
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Arnie from '@/components/Arnie';
import QuestionCard from '@/components/app/QuestionCard';
import { Clock, Flag } from '@/components/Icon';
import { CONFIG, chapterById } from '@/lib/config';
import { recordMockAttempt } from '@/lib/mockService';
import { tallyWeakChapters, type Question } from '@/lib/quizEngine';

type Phase = 'question' | 'confirm' | 'results';

const TOTAL_SECONDS = CONFIG.MOCK_DURATION_MIN * 60;

function fmt(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export default function MockPlayer({
  questions,
  onExit,
}: {
  questions: Question[];
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => new Array(questions.length).fill(null),
  );
  const [flags, setFlags] = useState<boolean[]>(
    () => new Array(questions.length).fill(false),
  );
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [phase, setPhase] = useState<Phase>('question');
  const recordedRef = useRef(false);
  const phaseRef = useRef<Phase>('question');
  phaseRef.current = phase;

  const total = questions.length;
  const attempted = answers.filter((a) => a != null).length;
  const correct = answers.filter((a, i) => a != null && a === questions[i].correctIndex).length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  const submit = useCallback(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    setPhase('results');
    const corr = answers.filter((a, i) => a != null && a === questions[i].correctIndex).length;
    recordMockAttempt({
      score: corr,
      total,
      percentage: total > 0 ? Math.round((corr / total) * 100) : 0,
      timeTaken: TOTAL_SECONDS - remaining,
      weakChapters: tallyWeakChapters(questions, answers),
      answers,
      questions,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, questions, total, remaining]);

  // Countdown — auto-submit at zero.
  useEffect(() => {
    if (phase === 'results') return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          if (phaseRef.current !== 'results') submit();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'results', submit]);

  function select(optionIndex: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = next[index] === optionIndex ? null : optionIndex;
      return next;
    });
  }

  function toggleFlag() {
    setFlags((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== 'question') return;
      const q = questions[index];
      const key = e.key.toLowerCase();
      if (key === 'f') return toggleFlag();
      if (key === 'arrowright') return setIndex((i) => Math.min(i + 1, total - 1));
      if (key === 'arrowleft') return setIndex((i) => Math.max(i - 1, 0));
      const letter = key.charCodeAt(0) - 97;
      const digit = Number(e.key) - 1;
      if (key.length === 1 && letter >= 0 && letter < q.options.length) select(letter);
      else if (digit >= 0 && digit < q.options.length) select(digit);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, total]);

  if (phase === 'results') {
    const passed = percentage >= CONFIG.MOCK_PASS_MARK;
    const weak = tallyWeakChapters(questions, answers);
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-card bg-white p-8 text-center shadow-card">
          <Arnie mood={passed ? 'celebrating' : 'working'} size={150} className="mx-auto" />
          <h1 className="mt-4 text-4xl font-black text-ink">{percentage}%</h1>
          <p className="mt-2 text-sm font-bold text-muted">
            {correct} of {total} correct · {attempted} attempted ·{' '}
            {fmt(TOTAL_SECONDS - remaining)} taken
          </p>
          <p
            className={`mt-4 text-base font-black ${passed ? 'text-green' : 'text-amber'}`}
          >
            {passed
              ? `That clears the ${CONFIG.MOCK_PASS_MARK}% pass mark. Genuinely well done.`
              : `The pass mark is ${CONFIG.MOCK_PASS_MARK}%. Not there yet — but now you know exactly where to work.`}
          </p>

          {weak.length > 0 && (
            <div className="mx-auto mt-6 max-w-sm rounded-xl bg-cream p-4 text-left">
              <p className="text-xs font-black uppercase tracking-widest text-muted">
                Chapters to revisit first
              </p>
              <ul className="mt-2 space-y-1.5">
                {weak.map((ch) => (
                  <li key={ch}>
                    <Link
                      href={`/app/practice/${ch}`}
                      className="text-sm font-bold text-purple hover:underline"
                    >
                      Chapter {ch}: {chapterById(ch)?.title ?? ''}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/app"
              className="rounded-full bg-purple px-6 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
            >
              Back to the study room
            </Link>
            <button
              type="button"
              onClick={onExit}
              className="rounded-full border-2 border-purple px-6 py-2.5 text-sm font-black text-purple hover:bg-purple-soft"
            >
              Mock overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'confirm') {
    const unanswered = total - attempted;
    const flagged = flags.filter(Boolean).length;
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <h2 className="text-2xl font-black text-ink">Submit your mock?</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {unanswered > 0 &&
              `${unanswered} unanswered — no negative marking, so blanks are free zeros. `}
            {flagged > 0 && `${flagged} still flagged for review. `}
            {unanswered === 0 && flagged === 0 && 'Everything answered, nothing flagged. '}
            {fmt(remaining)} remains on the clock.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={submit}
              className="rounded-full bg-purple px-8 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
            >
              Submit mock
            </button>
            <button
              type="button"
              onClick={() => setPhase('question')}
              className="rounded-full border-2 border-purple px-8 py-2.5 text-sm font-black text-purple hover:bg-purple-soft"
            >
              Keep going
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const low = remaining <= 600;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
      {/* Main column */}
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-muted">
            Mock test · Question {index + 1} of {total}
          </p>
          <p
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black ${
              low ? 'bg-red-soft text-red' : 'bg-white text-ink shadow-card'
            }`}
            aria-live={low ? 'polite' : 'off'}
          >
            <Clock size={15} />
            {fmt(remaining)}
          </p>
        </div>

        <QuestionCard question={q} picked={answers[index]} onSelect={select} />

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
            className="rounded-full px-5 py-2.5 text-sm font-black text-muted hover:text-purple disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={toggleFlag}
            aria-pressed={flags[index]}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-black transition-colors ${
              flags[index] ? 'bg-amber-soft text-amber' : 'text-muted hover:text-amber'
            }`}
          >
            <Flag size={15} />
            {flags[index] ? 'Flagged' : 'Flag'}
          </button>
          <button
            type="button"
            onClick={() =>
              index + 1 >= total ? setPhase('confirm') : setIndex((i) => i + 1)
            }
            className="rounded-full bg-purple px-6 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
          >
            {index + 1 >= total ? 'Review & submit' : 'Next'}
          </button>
        </div>

        <p className="mt-4 hidden text-xs text-muted lg:block">
          Keyboard: A–D or 1–4 to answer · arrow keys to move · F to flag
        </p>
      </div>

      {/* Palette */}
      <aside className="w-full shrink-0 lg:w-72">
        <div className="rounded-card bg-white p-5 shadow-card lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-ink">Questions</h2>
            <button
              type="button"
              onClick={() => setPhase('confirm')}
              className="text-xs font-black text-purple hover:underline"
            >
              Submit
            </button>
          </div>
          <div className="mt-3 grid grid-cols-10 gap-1 lg:grid-cols-8 lg:gap-1.5">
            {questions.map((_, i) => {
              const answered = answers[i] != null;
              const flagged = flags[i];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Question ${i + 1}${answered ? ', answered' : ''}${flagged ? ', flagged' : ''}`}
                  className={`relative h-7 rounded-md text-[11px] font-black transition-colors ${
                    i === index
                      ? 'bg-purple text-white'
                      : answered
                        ? 'bg-purple-soft text-purple'
                        : 'bg-cream text-muted'
                  }`}
                >
                  {i + 1}
                  {flagged && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-xs font-bold text-muted">
            <p>{attempted} answered</p>
            <p>{flags.filter(Boolean).length} flagged</p>
            <p>{total - attempted} remaining</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
