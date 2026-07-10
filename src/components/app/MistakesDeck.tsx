'use client';

/**
 * The mistakes deck — same documents and rules as the app:
 * users/{uid}/mistakes, retire at correctStreak 2 (LOCKED). Requires
 * sign-in (the deck is per-account by definition). A run updates streaks
 * via updateMistakesFromRun — the SAME single write path the players use.
 * Free users' mistakes only reference questions they were served, so the
 * question reads stay inside the deployed rules.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Arnie from '@/components/Arnie';
import QuestionCard from '@/components/app/QuestionCard';
import SignInButton from '@/components/app/SignInButton';
import { CONFIG, chapterById } from '@/lib/config';
import {
  getActiveMistakes,
  loadMistakeQuestions,
  updateMistakesFromRun,
} from '@/lib/mistakesService';
import type { Question } from '@/lib/quizEngine';
import { useAuth } from '@/lib/stores';

type DeckQuestion = Question & { _streak: number };

export default function MistakesDeck() {
  const { user, ready } = useAuth();

  const [byChapter, setByChapter] = useState<Map<number, number> | null>(null);
  const [run, setRun] = useState<{
    chapter: number;
    questions: DeckQuestion[];
  } | null>(null);
  const [loadingChapter, setLoadingChapter] = useState<number | null>(null);

  const refresh = useCallback(() => {
    setByChapter(null);
    getActiveMistakes().then((mistakes) => {
      const counts = new Map<number, number>();
      for (const m of mistakes) {
        if (m.chapter == null) continue;
        counts.set(m.chapter, (counts.get(m.chapter) ?? 0) + 1);
      }
      setByChapter(counts);
    });
  }, []);

  useEffect(() => {
    if (ready && user) refresh();
  }, [ready, user, refresh]);

  async function startChapter(chapter: number) {
    setLoadingChapter(chapter);
    const questions = await loadMistakeQuestions(chapter);
    setLoadingChapter(null);
    if (questions.length > 0) setRun({ chapter, questions });
  }

  if (!ready) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <Arnie mood="thinking" size={140} className="mx-auto" />
          <h1 className="mt-6 text-2xl font-black text-ink">
            Your mistakes deck lives on your account
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Every question you get wrong — here or in the app — lands in one
            deck. Answer it right twice and it retires. Sign in and it&apos;s
            all waiting for you.
          </p>
          <div className="mt-6 flex justify-center">
            <SignInButton label="Sign in with Google" />
          </div>
        </div>
      </div>
    );
  }

  if (run) {
    return (
      <MistakesRun
        chapter={run.chapter}
        questions={run.questions}
        onDone={() => {
          setRun(null);
          refresh();
        }}
      />
    );
  }

  if (byChapter === null) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <Arnie mood="working" size={120} className="mx-auto" />
          <p className="mt-4 text-sm font-bold text-muted">Fetching your deck…</p>
        </div>
      </div>
    );
  }

  const chapters = [...byChapter.entries()].sort((a, b) => a[0] - b[0]);
  const totalCards = chapters.reduce((sum, [, n]) => sum + n, 0);

  if (totalCards === 0) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <Arnie mood="meditating" size={140} className="mx-auto" />
          <h1 className="mt-6 text-2xl font-black text-ink">Deck&apos;s empty</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Nothing to fix right now — either you&apos;re new here or
            you&apos;ve retired everything. Both are respectable. Go get some
            questions wrong and I&apos;ll collect them for you.
          </p>
          <Link
            href="/app/practice"
            className="mt-6 inline-block rounded-full bg-purple px-6 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
          >
            Go practise
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-black text-ink">Your mistakes deck</h1>
      <p className="mt-2 text-sm text-muted">
        {totalCards} question{totalCards === 1 ? '' : 's'} waiting. Answer one
        correctly {CONFIG.MISTAKE_RETIRE_STREAK} times in a row and it retires
        for good.
      </p>
      <div className="mt-6 space-y-2.5">
        {chapters.map(([ch, count]) => (
          <button
            key={ch}
            type="button"
            onClick={() => startChapter(ch)}
            disabled={loadingChapter !== null}
            className="flex w-full items-center justify-between rounded-card bg-white p-5 text-left shadow-card transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <span className="font-black text-ink">
              {ch}. {chapterById(ch)?.title ?? `Chapter ${ch}`}
            </span>
            <span className="text-sm font-black text-purple">
              {loadingChapter === ch ? 'Loading…' : `${count} to fix`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MistakesRun({
  chapter,
  questions,
  onDone,
}: {
  chapter: number;
  questions: DeckQuestion[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => new Array(questions.length).fill(null),
  );
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);

  const total = questions.length;
  const q = questions[index];

  function select(optionIndex: number) {
    if (revealed) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = optionIndex;
      return next;
    });
    setRevealed(true);
  }

  function next() {
    if (index + 1 >= total) {
      setFinished(true);
      updateMistakesFromRun({ questions, answers }).catch(() => {});
      return;
    }
    setIndex((i) => i + 1);
    setRevealed(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (finished) return;
      const key = e.key.toLowerCase();
      if (revealed && (key === 'enter' || key === 'arrowright')) return next();
      if (revealed) return;
      const letter = key.charCodeAt(0) - 97;
      const digit = Number(e.key) - 1;
      if (key.length === 1 && letter >= 0 && letter < q.options.length) select(letter);
      else if (digit >= 0 && digit < q.options.length) select(digit);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, revealed, index]);

  if (finished) {
    const correct = answers.filter((a, i) => a === questions[i].correctIndex).length;
    const retired = questions.filter(
      (question, i) =>
        answers[i] === question.correctIndex &&
        question._streak + 1 >= CONFIG.MISTAKE_RETIRE_STREAK,
    ).length;
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <Arnie mood={retired > 0 ? 'celebrating' : 'proud'} size={140} className="mx-auto" />
          <h2 className="mt-6 text-2xl font-black text-ink">
            {correct} of {total} right
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {retired > 0
              ? `${retired} question${retired === 1 ? '' : 's'} retired for good — properly earned. `
              : ''}
            The rest stay in the deck until you beat them twice running.
          </p>
          <button
            type="button"
            onClick={onDone}
            className="mt-8 rounded-full bg-purple px-8 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
          >
            Back to the deck
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-muted">
          Mistakes · Chapter {chapter} · {index + 1} of {total}
        </p>
        {q._streak > 0 && !revealed && (
          <p className="rounded-full bg-green-soft px-3 py-1 text-xs font-black text-green">
            One more correct answer retires this
          </p>
        )}
      </div>

      <QuestionCard question={q} picked={answers[index]} revealed={revealed} onSelect={select} />

      {revealed && (
        <div className="mt-5 text-right">
          <button
            type="button"
            onClick={next}
            className="rounded-full bg-purple px-6 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
          >
            {index + 1 >= total ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
