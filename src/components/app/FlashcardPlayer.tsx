'use client';

/**
 * Flashcards — mirrors the app's FlashcardScreen rules:
 * - Deck in subtopic order; "All" or a single subtopic; shuffle mode.
 * - Flip to reveal, then self-grade: "Knew it" / "Review again" — review-again
 *   re-queues the card at the END of the run.
 * - Grades are flushed to the session log ONLY on completion; changing
 *   subtopic, toggling shuffle, or leaving early discards the run silently.
 * - Free-user ad-gate cadence mirrors the app's adGatePoint: deck < 5 →
 *   last card; ≤ 10 → card index 5; else index 10 and every 5 after, plus
 *   the subtopic-change gate. Surface = timed BreakGate (WORKING default);
 *   the cadence itself follows the app.
 * All flashcards are free (locked) — the whole deck arrives as build-time
 * props, so unsigned visitors get everything.
 */
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import Arnie from '@/components/Arnie';
import BreakGate from '@/components/app/BreakGate';
import { Check, ChevronLeft, ChevronRight, RefreshCw, X } from '@/components/Icon';
import { CONFIG, chapterById } from '@/lib/config';
import type { FlashcardGroup } from '@/lib/content';
import { recordFlashcardSession } from '@/lib/progressService';
import { useAuth, useEntitlement } from '@/lib/stores';

type Card = { front: string; back: string; cardType: string; subtopic: string };
type Grade = { front: string; subtopic: string; knew: boolean };
type PendingAction =
  | { type: 'nav'; index: number }
  | { type: 'subtopic'; sub: string }
  | { type: 'shuffle' };

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function FlashcardPlayer({
  chapter,
  groups,
}: {
  chapter: number;
  groups: FlashcardGroup[];
}) {
  const { user, ready } = useAuth();
  const ent = useEntitlement();
  const settled = ready && (!user || ent.known);
  const isPaid = Boolean(user) && ent.isPaid;

  const allCards = useMemo<Card[]>(
    () => groups.flatMap((g) => g.cards.map((c) => ({ ...c, subtopic: g.subtopic }))),
    [groups],
  );
  const subtopics = useMemo(() => groups.map((g) => g.subtopic), [groups]);

  const [activeSubtopic, setActiveSubtopic] = useState('All');
  const [randomCards, setRandomCards] = useState<Card[] | null>(null);
  const [extraCards, setExtraCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState<{ knew: number; graded: number } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const gradesRef = useRef<Grade[]>([]);
  const shownGatesRef = useRef(new Set<number>());

  const baseCards = randomCards
    ? randomCards
    : activeSubtopic === 'All'
      ? allCards
      : allCards.filter((c) => c.subtopic === activeSubtopic);
  const cards = extraCards.length > 0 ? [...baseCards, ...extraCards] : baseCards;
  const total = cards.length;
  const card = cards[index];

  // App's adGatePoint — free users only, once per position per run.
  function gateAt(newIndex: number, n: number): boolean {
    if (!settled || isPaid) return false;
    if (shownGatesRef.current.has(newIndex)) return false;
    if (n < 5) return n > 1 && newIndex === n - 1;
    if (n <= 10) return newIndex === 5;
    return newIndex === 10 || (newIndex > 10 && (newIndex - 10) % 5 === 0);
  }

  function resetRun() {
    setIndex(0);
    setFlipped(false);
    setExtraCards([]);
    setDone(null);
    gradesRef.current = [];
    shownGatesRef.current = new Set();
  }

  function flushGrades() {
    const grades = gradesRef.current;
    gradesRef.current = [];
    if (grades.length > 0) {
      recordFlashcardSession({ chapterNumber: chapter, grades }).catch(() => {});
    }
  }

  function finish() {
    const grades = gradesRef.current;
    setDone({ knew: grades.filter((g) => g.knew).length, graded: grades.length });
    flushGrades();
  }

  function navigateTo(newIndex: number, forward: boolean, n = total) {
    if (newIndex < 0 || newIndex >= n) return;
    if (forward && gateAt(newIndex, n)) {
      shownGatesRef.current.add(newIndex);
      setPending({ type: 'nav', index: newIndex });
      return;
    }
    setIndex(newIndex);
    setFlipped(false);
  }

  function goNext() {
    if (index === total - 1) {
      if (flipped) finish();
      return;
    }
    navigateTo(index + 1, true);
  }

  function grade(knew: boolean) {
    if (!card) return;
    gradesRef.current.push({ front: card.front, subtopic: card.subtopic, knew });
    setFlipped(false);
    if (!knew) setExtraCards((prev) => [...prev, card]);
    const nextTotal = knew ? total : total + 1;
    if (index + 1 >= nextTotal) {
      finish();
      return;
    }
    navigateTo(index + 1, true, nextTotal);
  }

  function changeSubtopic(sub: string) {
    if (sub === activeSubtopic) return;
    if (!settled || isPaid) {
      setActiveSubtopic(sub);
      setRandomCards(null);
      resetRun();
      return;
    }
    setPending({ type: 'subtopic', sub });
  }

  function toggleShuffle() {
    if (randomCards) {
      setRandomCards(null);
      resetRun();
      return;
    }
    const pool =
      activeSubtopic === 'All' ? allCards : allCards.filter((c) => c.subtopic === activeSubtopic);
    setRandomCards(shuffle(pool));
    resetRun();
  }

  function continuePending() {
    const action = pending;
    setPending(null);
    if (!action) return;
    if (action.type === 'nav') {
      setIndex(action.index);
      setFlipped(false);
    } else if (action.type === 'subtopic') {
      setActiveSubtopic(action.sub);
      setRandomCards(null);
      resetRun();
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || pending) return;
      const key = e.key.toLowerCase();
      if (key === ' ' || key === 'enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (key === 'arrowright') goNext();
      else if (key === 'arrowleft') navigateTo(index - 1, false);
      else if (flipped && (key === '1' || key === 'k')) grade(true);
      else if (flipped && (key === '2' || key === 'r')) grade(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, pending, flipped, index, total]);

  const meta = chapterById(chapter);

  if (total === 0) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <Arnie mood="dozing" size={130} className="mx-auto" />
          <p className="mt-4 text-sm font-bold text-muted">
            No cards here yet. Pick another chapter.
          </p>
          <Link
            href="/app/flashcards"
            className="mt-6 inline-block rounded-full bg-purple px-6 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
          >
            All chapters
          </Link>
        </div>
      </div>
    );
  }

  if (pending) {
    return (
      <BreakGate
        message="Quick pause — the deck continues in a few seconds."
        continueLabel="Back to the cards"
        onContinue={continuePending}
      />
    );
  }

  if (done) {
    return (
      <Completion chapter={chapter} knew={done.knew} graded={done.graded} onAgain={resetRun} />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-muted">
          Flashcards · Chapter {chapter}
          {meta ? `: ${meta.title}` : ''}
        </p>
        <div className="flex items-center gap-2">
          <select
            value={activeSubtopic}
            onChange={(e) => changeSubtopic(e.target.value)}
            aria-label="Subtopic"
            className="max-w-48 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-card"
          >
            <option value="All">All subtopics</option>
            {subtopics.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleShuffle}
            aria-pressed={Boolean(randomCards)}
            title={randomCards ? 'Back to order' : 'Shuffle'}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black shadow-card transition-colors ${
              randomCards ? 'bg-purple text-white' : 'bg-white text-muted hover:text-purple'
            }`}
          >
            <RefreshCw size={13} />
            {randomCards ? 'Shuffled' : 'Shuffle'}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-purple transition-all"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="block w-full rounded-card bg-white p-8 text-left shadow-card transition-transform hover:-translate-y-0.5 sm:p-10"
        aria-label={flipped ? 'Show front' : 'Reveal answer'}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-purple-soft px-3 py-1 text-[11px] font-black uppercase tracking-wider text-purple">
            {card.subtopic}
          </span>
          <span className="text-xs font-bold text-muted">
            {index + 1} / {total}
          </span>
        </div>
        <div className="flex min-h-44 items-center justify-center py-6">
          <p
            className={`text-center text-lg font-bold leading-relaxed ${
              flipped ? 'text-purple' : 'text-ink'
            }`}
          >
            {flipped ? card.back : card.front}
          </p>
        </div>
        <p className="text-center text-xs font-bold text-muted">
          {flipped ? 'Click to see the front again' : 'Click to reveal'}
        </p>
      </button>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigateTo(index - 1, false)}
          disabled={index === 0}
          aria-label="Previous card"
          className="rounded-full bg-white p-2.5 text-muted shadow-card hover:text-purple disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>

        {flipped ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => grade(false)}
              className="flex items-center gap-1.5 rounded-full border-2 border-amber px-5 py-2.5 text-sm font-black text-amber transition-colors hover:bg-amber-soft"
            >
              <X size={15} />
              Review again
            </button>
            <button
              type="button"
              onClick={() => grade(true)}
              className="flex items-center gap-1.5 rounded-full bg-green px-5 py-2.5 text-sm font-black text-white transition-colors hover:opacity-90"
            >
              <Check size={15} />
              Knew it
            </button>
          </div>
        ) : (
          <p className="text-xs font-bold text-muted">
            Space to flip · then grade yourself honestly
          </p>
        )}

        <button
          type="button"
          onClick={goNext}
          disabled={index === total - 1 && !flipped}
          aria-label={index === total - 1 ? 'Finish' : 'Next card'}
          className="rounded-full bg-white p-2.5 text-muted shadow-card hover:text-purple disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <p className="mt-4 hidden text-center text-xs text-muted lg:block">
        Keyboard: Space to flip · 1 knew it · 2 review again · arrows to move
      </p>
    </div>
  );
}

function Completion({
  chapter,
  knew,
  graded,
  onAgain,
}: {
  chapter: number;
  knew: number;
  graded: number;
  onAgain: () => void;
}) {
  const next = chapter < CONFIG.TOTAL_CHAPTERS ? chapter + 1 : null;
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="rounded-card bg-white p-10 shadow-card">
        <Arnie mood="proud" size={140} className="mx-auto" />
        <h2 className="mt-6 text-2xl font-black text-ink">Deck done</h2>
        {graded > 0 && (
          <p className="mt-2 text-sm font-bold text-muted">
            You knew {knew} of {graded} you graded.
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Every card you marked &ldquo;review again&rdquo; came back around —
          that&apos;s the whole trick. Little and often beats heroic cramming.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {next ? (
            <Link
              href={`/app/flashcards/${next}`}
              className="rounded-full bg-purple px-6 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
            >
              Chapter {next} cards
            </Link>
          ) : (
            <Link
              href="/app/mock"
              className="rounded-full bg-purple px-6 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
            >
              Ready for a mock?
            </Link>
          )}
          <button
            type="button"
            onClick={onAgain}
            className="rounded-full border-2 border-purple px-6 py-2.5 text-sm font-black text-purple hover:bg-purple-soft"
          >
            Go again
          </button>
        </div>
      </div>
    </div>
  );
}
