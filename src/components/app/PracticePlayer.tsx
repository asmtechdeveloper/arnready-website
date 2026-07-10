'use client';

/**
 * Practice mode — mirrors the app's practice flow exactly:
 * instant feedback + explanation per question; LOCKED free gate order
 * Q1–10 → gate → 11–15 → gate → 16–20 → paywall; ad unlocks are
 * session-only (adsWatched resets per run — WORKING parity assumption).
 * Free pool = the build-time free set; paid pool = chapter seeds from
 * Firestore. Completed runs record via the single write site.
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Arnie, { arnieForScore } from '@/components/Arnie';
import BreakGate from '@/components/app/BreakGate';
import Paywall from '@/components/app/Paywall';
import QuestionCard from '@/components/app/QuestionCard';
import SignInButton from '@/components/app/SignInButton';
import { CONFIG } from '@/lib/config';
import { recordPracticeSession } from '@/lib/progressService';
import { loadChapterSeeds } from '@/lib/questionService';
import {
  computePracticePct,
  gateBeforeQuestion,
  orderPracticeSet,
  type Question,
} from '@/lib/quizEngine';
import { useAuth, useEntitlement } from '@/lib/stores';

type Phase = 'question' | 'gate' | 'paywall' | 'results';

export default function PracticePlayer({
  chapter,
  freeQuestions,
}: {
  chapter: number;
  freeQuestions: Question[];
}) {
  const { user, ready } = useAuth();
  const ent = useEntitlement();
  // Unsigned visitors are definitionally free; signed-in users wait for the
  // entitlement read (ad/gate surfaces render nothing until known — locked).
  const entitlementSettled = ready && (!user || ent.known);
  const isPaid = Boolean(user) && ent.isPaid;

  const [pool, setPool] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [phase, setPhase] = useState<Phase>('question');
  const [adsWatched, setAdsWatched] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const recordedRef = useRef(false);

  const startRun = useCallback(
    (questions: Question[], paid: boolean) => {
      const ordered = orderPracticeSet(questions, { isPaid: paid });
      setPool(ordered);
      setAnswers(new Array(ordered.length).fill(null));
      setIndex(0);
      setPhase('question');
      setAdsWatched(0);
      setRevealed(false);
      recordedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!entitlementSettled) return;
    let cancelled = false;
    if (isPaid) {
      loadChapterSeeds(chapter).then((seeds) => {
        if (cancelled) return;
        startRun(seeds.length > 0 ? seeds : freeQuestions, seeds.length > 0);
      });
    } else {
      startRun(freeQuestions, false);
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitlementSettled, isPaid, chapter]);

  const attempted = answers.filter((a) => a != null).length;
  const correct = pool
    ? answers.filter((a, i) => a != null && a === pool[i].correctIndex).length
    : 0;
  const pct = computePracticePct(correct, attempted);

  const finishRun = useCallback(() => {
    setPhase('results');
  }, []);

  // Record once, on results, if signed in (or the moment they sign in there).
  useEffect(() => {
    if (phase !== 'results' || !user || recordedRef.current || !pool) return;
    recordedRef.current = true;
    recordPracticeSession({
      chapterNumber: chapter,
      correct,
      attempted,
      scorePct: pct,
      answers,
      questions: pool,
      source: null,
    }).catch(() => {});
  }, [phase, user, pool, chapter, correct, attempted, pct, answers]);

  function select(optionIndex: number) {
    if (revealed || !pool) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = optionIndex;
      return next;
    });
    setRevealed(true);
  }

  function next() {
    if (!pool) return;
    const nextIndex = index + 1;
    if (nextIndex >= pool.length) {
      if (isPaid) finishRun();
      else setPhase('paywall');
      return;
    }
    const gate = gateBeforeQuestion(nextIndex, {
      isPaid,
      adsWatched,
      gate1: CONFIG.AD_GATE_1,
      gate2: CONFIG.AD_GATE_2,
    });
    if (gate === 'ad') {
      setPhase('gate');
      return;
    }
    setIndex(nextIndex);
    setRevealed(false);
  }

  function continueAfterGate() {
    setAdsWatched((n) => n + 1);
    setIndex((i) => i + 1);
    setRevealed(false);
    setPhase('question');
  }

  // Keyboard: A–D / 1–4 pick; Enter / → advances after feedback.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== 'question' || !pool) return;
      const q = pool[index];
      if (!revealed) {
        const letter = e.key.toLowerCase().charCodeAt(0) - 97;
        const digit = Number(e.key) - 1;
        const pick = letter >= 0 && letter < q.options.length ? letter
          : digit >= 0 && digit < q.options.length ? digit : -1;
        if (pick >= 0) select(pick);
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealed, index, pool, adsWatched, isPaid]);

  const meta = CONFIG.CHAPTERS.find((c) => c.id === chapter);

  if (!entitlementSettled || !pool) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <Arnie mood="reading" size={120} />
        <p className="text-sm font-bold text-muted">Setting up your practice…</p>
      </div>
    );
  }

  if (phase === 'gate') {
    return <BreakGate questionNumber={index + 2} onContinue={continueAfterGate} />;
  }

  if (phase === 'paywall') {
    return (
      <Paywall
        heading={`That's all ${pool.length} free questions for this chapter`}
        sub="You finished the free set — genuinely well done. The rest of the bank is one unlock away."
        secondaryLabel="See my results"
        onSecondary={finishRun}
      />
    );
  }

  if (phase === 'results') {
    const wrong = pool
      .map((q, i) => ({ q, picked: answers[i] }))
      .filter((w) => w.picked != null && w.picked !== w.q.correctIndex);
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-card bg-white p-8 text-center shadow-card">
          <Arnie mood={arnieForScore(pct)} size={140} className="mx-auto" />
          <h1 className="mt-4 text-3xl font-black text-ink">{pct}% accuracy</h1>
          <p className="mt-2 text-sm font-bold text-muted">
            {correct} of {attempted} attempted · Chapter {chapter}
            {meta ? ` — ${meta.title}` : ''}
          </p>
          {!user && (
            <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-3 rounded-xl bg-cream p-4">
              <p className="text-xs font-bold text-muted">
                This run isn&apos;t saved. Sign in (free) to keep your progress
                and mistakes deck — on web and in the app.
              </p>
              <SignInButton label="Sign in to save progress" />
            </div>
          )}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => startRun(pool, isPaid)}
              className="rounded-full bg-purple px-6 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
            >
              Practise again
            </button>
            <Link
              href={`/app/exam/${chapter}`}
              className="rounded-full border-2 border-purple px-6 py-2.5 text-sm font-black text-purple hover:bg-purple-soft"
            >
              Take the chapter exam
            </Link>
            <Link
              href="/app"
              className="rounded-full px-6 py-2.5 text-sm font-black text-muted hover:text-purple"
            >
              Study room
            </Link>
          </div>
        </div>

        {wrong.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-black text-ink">Worth another look ({wrong.length})</h2>
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
            Practice · Chapter {chapter}
          </p>
          <h1 className="text-lg font-black text-ink">{meta?.title}</h1>
        </div>
        <p className="text-sm font-black text-purple">
          {index + 1} / {pool.length}
        </p>
      </div>

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-purple transition-all"
          style={{ width: `${((index + (revealed ? 1 : 0)) / pool.length) * 100}%` }}
        />
      </div>

      <QuestionCard question={q} picked={answers[index]} revealed={revealed} onSelect={select} />

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={finishRun}
          className="text-sm font-bold text-muted hover:text-purple"
        >
          End session
        </button>
        {revealed && (
          <button
            type="button"
            onClick={next}
            className="rounded-full bg-purple px-8 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
          >
            {index + 1 >= pool.length ? 'Finish' : 'Next question'}
          </button>
        )}
      </div>
    </div>
  );
}
