'use client';

import { useState } from 'react';

import { countDistinctReveals, flashcardNudgeAfterReveal } from '@/lib/nudgeGates';
import type { CanonicalDeck } from '@/lib/flashcardDeck';
import { firestoreBackend } from '@/lib/progressBackend';
import { recordFlashcardSession } from '@/lib/progressService';
import { useRecordOnce } from '@/lib/useRecordOnce';
import { flashcardPlayer as copy, results as resultsCopy } from '@/lib/copy';
import { PremiumNudge } from '@/components/PremiumNudge';
import { ResultsCard } from '@/components/ResultsCard';

/**
 * The flashcard player mounted into `FlashcardsSurface`'s slot (M5 plan D9,
 * step S6). Owns the run's local state — the current 0-based index, whether
 * the current card's back is revealed, the SET of distinct card ids revealed
 * this run, `gatesShownThisRun`, per-card self-grades, and whether the deck
 * is finished — and nothing else: no Firestore write of any kind (session
 * recording is S7, through the M4 service only).
 *
 * CANONICAL ORDER ONLY (D9): cards render in `deck.cards` order, exactly as
 * `buildCanonicalDeck` produced it. There is no shuffle-from-landing and no
 * mid-run reorder — that machinery (the app's `flashcardRun.js`) is
 * deliberately not ported (plan D9, unrequested scope).
 *
 * DISTINCT-REVEAL TRACKING IS THE HEART OF THIS COMPONENT. `revealedIds` is a
 * `Set` of stable `cardId`s; `handleReveal` adds to it, and `Set.add` is
 * idempotent, so revisiting an already-revealed card and re-revealing it
 * never grows the set and never inflates the count. `countDistinctReveals`
 * (the pinned reducer from `nudgeGates.ts`) is the ONLY thing that turns that
 * set into the number the gate takes — this file does no counting of its own.
 *
 * GATE LOGIC IS CONSUMED, NEVER RE-DERIVED. The only gate call in this file
 * is `flashcardNudgeAfterReveal(distinctReveals, { isPaid, gatesShownThisRun })`,
 * and it is checked once per forward-advance attempt (`handleGrade`, below) —
 * never inside `handleReveal`. That ordering is what guarantees "the gate
 * never interrupts a reveal or a grade" (plan D9): revealing a card and
 * self-grading it always completes immediately; only the TRANSITION to the
 * next card is deferred behind the nudge when the gate says so. Continuing
 * from the nudge (`handleNudgeContinue`) increments `gatesShownThisRun` —
 * which is what makes the gate's own one-shot-per-threshold logic resolve to
 * "already shown" for that threshold on every later check — and then
 * performs the deferred advance. `rotation={gatesShownThisRun}` is passed
 * straight into `<PremiumNudge>` so the 15/30/45 reveals show the three
 * distinct copy variants in order, never repeating one in the same run.
 *
 * SELF-GRADES (for S7): forward-advancing off a revealed card records
 * knew:true by default ("I knew it"); "Didn’t know it" is the explicit
 * knew:false override. Both are forward-advance actions and both go through
 * the same gate check. Grades are kept in local state only, keyed by
 * `cardId`, for S7's `recordFlashcardSession` to consume later — this
 * component writes nothing to Firestore (D14).
 *
 * PAID USERS see zero nudges ever — this falls out of
 * `flashcardNudgeAfterReveal` returning `null` whenever `isPaid` is true;
 * there is no local `if (isPaid)` branch anywhere in this file.
 */
export function FlashcardPlayer({
  chapter,
  deck,
  isPaid,
}: {
  chapter: number;
  deck: CanonicalDeck;
  isPaid: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
  const [gatesShownThisRun, setGatesShownThisRun] = useState(0);
  const [grades, setGrades] = useState<Record<string, boolean>>({});
  const [nudgeDue, setNudgeDue] = useState(false);
  const [finished, setFinished] = useState(false);

  const gradedCards = deck.cards.filter((c) => c.cardId in grades);
  const knewCount = gradedCards.filter((c) => grades[c.cardId]).length;

  // Record ONCE, through the M4 service only, when the deck is finished
  // (D10/D14). Flashcard grades are self-reported STUDY data, not scoring —
  // recordFlashcardSession never touches chapterProgress or the Prepometer. A
  // null backend (signed out / Firebase unavailable) shows results but writes
  // nothing.
  useRecordOnce(finished, () => {
    const backend = firestoreBackend();
    if (!backend) return;
    void recordFlashcardSession(backend, {
      chapterNumber: chapter,
      grades: gradedCards.map((c) => ({
        front: String(c.front ?? ''),
        subtopic: c.subtopic,
        knew: grades[c.cardId] === true,
      })),
    });
  });

  if (finished) {
    return (
      <ResultsCard
        mood={resultsCopy.flashcards.mood}
        title={resultsCopy.flashcards.title}
        headline={resultsCopy.flashcards.headline(knewCount, gradedCards.length)}
        detail={copy.deckComplete}
        action={resultsCopy.flashcards.action}
      />
    );
  }

  const card = deck.cards[index];
  if (!card) return null;
  // Captured as a plain string so the handlers below (nested function
  // declarations) don't need to re-narrow `card` themselves — TS narrowing
  // of a possibly-undefined array element doesn't carry into a closure
  // (mirrors PracticePlayer's own `question &&` re-checks in its handlers).
  const cardId = card.cardId;

  const distinctReveals = countDistinctReveals(revealedIds);

  if (nudgeDue) {
    return (
      <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
        <PremiumNudge
          variant="flashcard"
          rotation={gatesShownThisRun}
          onContinue={() => {
            setGatesShownThisRun((g) => g + 1);
            setNudgeDue(false);
            advance();
          }}
        />
      </div>
    );
  }

  function advance() {
    if (index + 1 < deck.cards.length) {
      setIndex((i) => i + 1);
      setRevealed(false);
    } else {
      setFinished(true);
    }
  }

  function handleReveal() {
    setRevealed(true);
    setRevealedIds((prev) => {
      if (prev.has(cardId)) return prev;
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
  }

  function handleGrade(knew: boolean) {
    setGrades((prev) => ({ ...prev, [cardId]: knew }));
    const decision = flashcardNudgeAfterReveal(distinctReveals, { isPaid, gatesShownThisRun });
    if (decision === 'nudge') {
      setNudgeDue(true);
      return;
    }
    advance();
  }

  function handlePrev() {
    if (index === 0) return;
    setIndex((i) => i - 1);
    setRevealed(false);
  }

  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      <p className="text-xs font-bold uppercase tracking-wide text-purple">
        {copy.counter(index + 1, deck.cards.length)}
      </p>

      <div className="mt-4 rounded-card bg-white p-6 shadow-card sm:p-8">
        <p className="text-lg font-bold text-ink">{String(card.front ?? '')}</p>

        {revealed && (
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-[0.95rem] leading-6 text-muted">{String(card.back ?? '')}</p>
          </div>
        )}

        {!revealed && (
          <button
            type="button"
            onClick={handleReveal}
            className="mt-6 flex min-h-11 w-full items-center justify-center rounded-pill bg-purple px-6 text-base font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark sm:w-auto"
          >
            {copy.reveal}
          </button>
        )}

        {revealed && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleGrade(true)}
              className="flex min-h-11 flex-1 items-center justify-center rounded-pill bg-purple px-6 text-base font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark sm:flex-none"
            >
              {copy.knew}
            </button>
            <button
              type="button"
              onClick={() => handleGrade(false)}
              className="flex min-h-11 flex-1 items-center justify-center rounded-pill border border-line bg-white px-6 text-base font-bold text-ink hover:border-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple sm:flex-none"
            >
              {copy.didntKnow}
            </button>
          </div>
        )}
      </div>

      {!finished && index > 0 && (
        <button
          type="button"
          onClick={handlePrev}
          className="mt-4 flex min-h-11 items-center text-sm font-semibold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
        >
          {copy.prev}
        </button>
      )}

      {/* Run state, exposed for S7's later results wiring and for tests —
          never written to Firestore from here (D14: recording is S7's job,
          through the M4 service only). */}
      <span
        hidden
        data-testid="flashcard-player-state"
        data-index={index}
        data-distinct-reveals={distinctReveals}
        data-gates-shown={gatesShownThisRun}
        data-finished={finished ? 'true' : 'false'}
        data-grades={JSON.stringify(grades)}
      />
    </div>
  );
}
