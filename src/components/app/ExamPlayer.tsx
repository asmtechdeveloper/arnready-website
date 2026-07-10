'use client';

/**
 * Chapter exam mode — mirrors the app: no per-question feedback, navigate
 * freely, submit at the end. LOCKED scoring via computeExamScorePct
 * (free = correct ÷ max(10, attempted); paid = correct ÷ served).
 * Free draws = the whole free set shuffled, with the LOCKED Q11/Q16 gates
 * on first forward crossing; paid draws = one-per-seedId, 30 questions.
 * No timer on chapter exams (WORKING parity assumption — the app's chapter
 * exam is untimed; only the mock is timed).
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Arnie, { arnieForScore } from '@/components/Arnie';
import BreakGate from '@/components/app/BreakGate';
import QuestionCard from '@/components/app/QuestionCard';
import SignInButton from '@/components/app/SignInButton';
import { CONFIG } from '@/lib/config';
import { recordExamSession } from '@/lib/progressService';
import { loadChapterPool } from '@/lib/questionService';
import type { ProgressBlob } from '@/lib/progressShapes';
import {
  computeExamScorePct,
  drawExamSet,
  gateBeforeQuestion,
  tallyWeakSubtopics,
  type Question,
} from '@/lib/quizEngine';
import { useAuth, useEntitlement } from '@/lib/stores';

type Phase = 'question' | 'gate' | 'confirm' | 'results';

export default function ExamPlayer({
  chapter,
  freeQuestions,
}: {
  chapter: number;
  freeQuestions: Question[];
}) {
  const { user, ready } = useAuth();
  const ent = useEntitlement();
  const entitlementSettled = ready && (!user || ent.known);
  const isPaid = Boolean(user) && ent.isPaid;

  const [pool, setPool] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [phase, setPhase] = useState<Phase>('question');
  const [adsWatched, setAdsWatched] = useState(0);
  const [endedEarly, setEndedEarly] = useState(false);
  const [pendingIndex, setPendingIndex] = useState(0);
  const [progress, setProgress] = useState<{ prev: ProgressBlob | null } | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    if (!entitlementSettled) return;
    let cancelled = false;
    async function draw() {
      let served: Question[];
      if (isPaid) {
        const full = await loadChapterPool(chapter);
        served = drawExamSet(full.length > 0 ? full : freeQuestions, {
          isPaid: full.length > 0,
          examSize: CONFIG.EXAM_QUESTIONS,
        });
      } else {
        served = drawExamSet(freeQuestions, { isPaid: false });
      }
      if (cancelled) return;
      setPool(served);
      setAnswers(new Array(served.length).fill(null));
    }
    draw();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitlementSettled, isPaid, chapter]);

  const attempted = answers.filter((a) => a != null).length;
  const correct = pool
    ? answers.filter((a, i) => a != null && a === pool[i].correctIndex).length
    : 0;
  const served = pool?.length ?? 0;
  const pct = computeExamScorePct({ isPaid, correct, attempted, served });

  const submit = useCallback(
    (early: boolean) => {
      setEndedEarly(early);
      setPhase('results');
    },
    [],
  );

  useEffect(() => {
    if (phase !== 'results' || recordedRef.current || !pool) return;
    recordedRef.current = true;
    if (!user) return;
    recordExamSession({
      chapterNumber: chapter,
      correct,
      attempted,
      served,
      scorePct: pct,
      endedEarly,
      answers,
      questions: pool,
    })
      .then((res) => setProgress({ prev: res.prev }))
      .catch(() => {});
  }, [phase, user, pool, chapter, correct, attempted, served, pct, endedEarly, answers]);

  function goTo(nextIndex: number) {
    if (!pool || nextIndex < 0 || nextIndex >= pool.length) return;
    if (nextIndex > index) {
      // LOCKED gate order applies on first forward crossing only.
      for (let i = index + 1; i <= nextIndex; i++) {
        const gate = gateBeforeQuestion(i, {
          isPaid,
          adsWatched,
          gate1: CONFIG.AD_GATE_1,
          gate2: CONFIG.AD_GATE_2,
        });
        if (gate === 'ad') {
          setPendingIndex(i);
          setPhase('gate');
          return;
        }
      }
    }
    setIndex(nextIndex);
  }

  function continueAfterGate() {
    setAdsWatched((n) => n + 1);
    setIndex(pendingIndex);
    setPhase('question');
  }

  function select(optionIndex: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = next[index] === optionIndex ? null : optionIndex;
      return next;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== 'question' || !pool) return;
      const q = pool[index];
      const letter = e.key.toLowerCase().charCodeAt(0) - 97;
      const digit = Number(e.key) - 1;
      if (letter >= 0 && letter < q.options.length) select(letter);
      else if (digit >= 0 && digit < q.options.length) select(digit);
      else if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, pool, adsWatched, isPaid]);

  const meta = CONFIG.CHAPTERS.find((c) => c.id === chapter);

  if (!entitlementSettled || !pool) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <Arnie mood="thinking" size={120} />
        <p className="text-sm font-bold text-muted">Drawing your exam…</p>
      </div>
    );
  }

  if (phase === 'gate') {
    return <BreakGate questionNumber={pendingIndex + 1} onContinue={continueAfterGate} />;
  }

  if (phase === 'confirm') {
    const unanswered = served - attempted;
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <h2 className="text-2xl font-black text-ink">Submit exam?</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {unanswered > 0
              ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. In the real exam there is no negative marking — blanks are the only guaranteed zeros.`
              : 'All questions answered. Ready when you are.'}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => submit(false)}
              className="rounded-full bg-purple px-8 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
            >
              Submit
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

  if (phase === 'results') {
    const weak = tallyWeakSubtopics(pool, answers);
    const wrong = pool
      .map((q, i) => ({ q, picked: answers[i] }))
      .filter((w) => w.picked != null && w.picked !== w.q.correctIndex);
    const best = progress?.prev
      ? Math.round(
          (progress.prev.bestScore / Math.max(progress.prev.bestTotal || 1, 1)) * 100,
        )
      : null;

    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-card bg-white p-8 text-center shadow-card">
          <Arnie mood={arnieForScore(pct)} size={140} className="mx-auto" />
          <h1 className="mt-4 text-3xl font-black text-ink">{pct}%</h1>
          <p className="mt-2 text-sm font-bold text-muted">
            {correct} correct · {attempted} attempted · {served} served
            {endedEarly ? ' · ended early' : ''}
          </p>
          {!isPaid && attempted < 10 && (
            <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-muted">
              Honest-scoring note: with fewer than 10 attempted, your score is
              measured against 10 — a tiny sample shouldn&apos;t flatter you.
            </p>
          )}
          {best != null && best > 0 && (
            <p className="mt-3 text-xs font-bold text-muted">
              Previous best: {best}%{pct > best ? ' — beaten. Quietly excellent.' : ''}
            </p>
          )}
          {!user && (
            <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-3 rounded-xl bg-cream p-4">
              <p className="text-xs font-bold text-muted">
                This result isn&apos;t saved. Sign in (free) to track progress
                and build your mistakes deck.
              </p>
              <SignInButton label="Sign in to save progress" />
            </div>
          )}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/app/practice/${chapter}`}
              className="rounded-full bg-purple px-6 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
            >
              Practise this chapter
            </Link>
            <Link
              href="/app"
              className="rounded-full border-2 border-purple px-6 py-2.5 text-sm font-black text-purple hover:bg-purple-soft"
            >
              Study room
            </Link>
          </div>
        </div>

        {weak.length > 0 && (
          <div className="mt-8 rounded-card bg-white p-6 shadow-card">
            <h2 className="text-lg font-black text-ink">Weakest subtopics this run</h2>
            <ul className="mt-3 space-y-1.5">
              {weak.map((w) => (
                <li key={w} className="text-sm font-bold text-muted">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {wrong.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-black text-ink">Review your mistakes ({wrong.length})</h2>
            <div className="mt-4 space-y-4">
              {wrong.map(({ q, picked }) => (
                <div key={q.id} className="rounded-card bg-white p-6 shadow-card">
                  <p className="text-sm font-bold leading-relaxed text-ink">{q.question}</p>
                  <p className="mt-3 text-sm text-red">
                    Your answer: {q.options[picked as number]}
                  </p>
                  <p className="mt-1 text-sm font-bold text-green">
                    Correct: {q.options[q.correctIndex]}
                  </p>
                  {q.explanation && (
                    <p className="mt-2 text-sm leading-relaxed text-muted">{q.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const q = pool[index];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted">
            Chapter exam · Chapter {chapter}
          </p>
          <h1 className="text-lg font-black text-ink">{meta?.title}</h1>
        </div>
        <p className="text-sm font-black text-purple">
          {index + 1} / {served}
        </p>
      </div>

      {/* Mini palette — answered = purple, current = ring */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {pool.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Question ${i + 1}${answers[i] != null ? ', answered' : ''}`}
            className={`h-7 w-7 rounded-md text-xs font-black transition-colors ${
              i === index
                ? 'bg-purple text-white ring-2 ring-purple ring-offset-2 ring-offset-cream'
                : answers[i] != null
                  ? 'bg-purple-soft text-purple'
                  : 'bg-white text-muted shadow-card'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <QuestionCard question={q} picked={answers[index]} onSelect={select} />

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="rounded-full px-5 py-2.5 text-sm font-black text-muted hover:text-purple disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setPhase('confirm')}
          className="text-sm font-bold text-muted hover:text-purple"
        >
          Submit exam
        </button>
        <button
          type="button"
          onClick={() => (index + 1 >= served ? setPhase('confirm') : goTo(index + 1))}
          className="rounded-full bg-purple px-6 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
        >
          {index + 1 >= served ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
