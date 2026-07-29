import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { FlashcardPlayer } from '@/components/FlashcardPlayer';
import { FLASHCARD_GATE_EVERY, FLASHCARD_GATE_MAX } from '@/lib/nudgeGates';
import { flashcardPlayer as playerCopy, nudge } from '@/lib/copy';
import type { CanonicalDeck, DeckCard } from '@/lib/flashcardDeck';

/**
 * FlashcardPlayer (M5 plan D9, step S6) — the review protocol's M5 checklist
 * made concrete at this specific render site:
 *   - nudges fire at 15/30/45 distinct reveals, rotating through the three
 *     copy variants (rotation = gatesShownThisRun), max 3 per run;
 *   - a revisit/re-reveal of an already-revealed card never inflates the
 *     distinct count and never fires a nudge early;
 *   - the nudge never blocks a reveal — the back is readable before any
 *     nudge interstitial appears;
 *   - a paid user never sees a nudge, across a full sweep past 45 reveals;
 *   - the component contains no second gate definition and no gate
 *     arithmetic of its own (source-scan, in the spirit of
 *     test/isPaidDiscipline.test.ts and test/practicePlayer.test.tsx).
 */

function makeDeck(count: number, chapterNumber = 1): CanonicalDeck {
  const cards: DeckCard[] = Array.from({ length: count }, (_, i) => ({
    front: `Front text ${i + 1}`,
    back: `Back text ${i + 1}`,
    subtopic: 'Test Topic',
    cardId: `card-${i + 1}`,
    canonicalIndex: i,
  }));
  return {
    chapterNumber,
    sections: [{ subtopic: 'Test Topic', cards }],
    cards,
    totalCards: count,
  };
}

function variantTitle(i: number): string {
  const variant = nudge.flashcard.variants[i];
  if (!variant) throw new Error(`fixture missing flashcard nudge variant ${i}`);
  return variant.title;
}

/** Reveals the current card's back and grades it "knew it", advancing the
 * deck forward — the only forward-advance path this player exposes. Returns
 * whether a nudge was showing after grading. */
function revealAndAdvance(): boolean {
  fireEvent.click(screen.getByRole('button', { name: playerCopy.reveal }));
  fireEvent.click(screen.getByRole('button', { name: playerCopy.knew }));
  return (
    screen.queryByText(variantTitle(0)) !== null ||
    screen.queryByText(variantTitle(1)) !== null ||
    screen.queryByText(variantTitle(2)) !== null
  );
}

function continueFromNudge(): void {
  fireEvent.click(screen.getByRole('button', { name: nudge.flashcard.continue }));
}

describe('FlashcardPlayer — 15/30/45 distinct-reveal nudges, rotating variants, max 3 (D9)', () => {
  it('fires exactly at the 1st/2nd/3rd threshold, in rotation order, and never a 4th', () => {
    // Sweep PAST the 4th boundary (GATE_EVERY * (GATE_MAX + 1) = 60), not just
    // past the 3rd. If the run stopped at 50 the "never a 4th" claim would be
    // vacuous — the next boundary a broken max-cap could fire at is 60, so the
    // cap is only genuinely pinned by revealing through it. (Orchestrator
    // review, M5 S6: the original `* MAX + 5` bound never reached 60.)
    const total = FLASHCARD_GATE_EVERY * (FLASHCARD_GATE_MAX + 1) + 5;
    const deck = makeDeck(total);
    render(<FlashcardPlayer chapter={1} deck={deck} isPaid={false} />);

    const nudgeFiredAtReveal: number[] = [];
    for (let reveal = 1; reveal <= total; reveal += 1) {
      const sawNudge = revealAndAdvance();
      if (sawNudge) {
        const rotation = nudgeFiredAtReveal.length;
        expect(screen.getByText(variantTitle(rotation))).toBeInTheDocument();
        nudgeFiredAtReveal.push(reveal);
        continueFromNudge();
      }
    }

    expect(nudgeFiredAtReveal).toEqual([
      FLASHCARD_GATE_EVERY,
      FLASHCARD_GATE_EVERY * 2,
      FLASHCARD_GATE_EVERY * 3,
    ]);
  });
});

describe('FlashcardPlayer — revisits never double-count and never fire a nudge early (D9)', () => {
  it('re-revealing an already-revealed card holds the distinct count steady, so the 15th-reveal nudge fires only on a genuinely new card', () => {
    const deck = makeDeck(FLASHCARD_GATE_EVERY);
    render(<FlashcardPlayer chapter={1} deck={deck} isPaid={false} />);

    // Reveal+grade the first (EVERY - 1) cards, landing on the last card.
    for (let i = 0; i < FLASHCARD_GATE_EVERY - 1; i += 1) {
      const sawNudge = revealAndAdvance();
      expect(sawNudge).toBe(false);
    }

    const state = () => screen.getByTestId('flashcard-player-state');
    expect(state()).toHaveAttribute('data-distinct-reveals', String(FLASHCARD_GATE_EVERY - 1));

    // Go back and re-reveal the card just graded (a genuine revisit).
    fireEvent.click(screen.getByRole('button', { name: playerCopy.prev }));
    fireEvent.click(screen.getByRole('button', { name: playerCopy.reveal }));
    expect(state()).toHaveAttribute('data-distinct-reveals', String(FLASHCARD_GATE_EVERY - 1));
    expect(screen.queryByText(variantTitle(0))).toBeNull();

    // Re-grading the revisited card must not fire the nudge early either —
    // the distinct count is unchanged, so the gate must still say no.
    fireEvent.click(screen.getByRole('button', { name: playerCopy.knew }));
    expect(screen.queryByText(variantTitle(0))).toBeNull();
    expect(state()).toHaveAttribute('data-distinct-reveals', String(FLASHCARD_GATE_EVERY - 1));

    // Only now reveal the genuinely new (last, un-revealed) card — this is
    // the true 15th distinct reveal, and only here should the nudge fire.
    fireEvent.click(screen.getByRole('button', { name: playerCopy.reveal }));
    expect(screen.getByText(`Back text ${FLASHCARD_GATE_EVERY}`)).toBeInTheDocument();
    expect(screen.queryByText(variantTitle(0))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: playerCopy.knew }));
    expect(screen.getByText(variantTitle(0))).toBeInTheDocument();
  });
});

describe('FlashcardPlayer — the nudge never blocks a reveal or a grade (D9 point 4)', () => {
  it('the back is readable, and the grade is recorded, before any nudge interstitial appears', () => {
    const deck = makeDeck(FLASHCARD_GATE_EVERY);
    render(<FlashcardPlayer chapter={1} deck={deck} isPaid={false} />);

    for (let i = 0; i < FLASHCARD_GATE_EVERY - 1; i += 1) revealAndAdvance();

    // The 15th card: revealing it must show its back immediately, with no
    // nudge yet — the nudge is checked at the forward-advance (grade), not
    // at reveal.
    fireEvent.click(screen.getByRole('button', { name: playerCopy.reveal }));
    expect(screen.getByText(`Back text ${FLASHCARD_GATE_EVERY}`)).toBeInTheDocument();
    expect(screen.queryByText(variantTitle(0))).toBeNull();

    // Grading completes (the grade itself is never blocked) and only THEN
    // does the nudge appear, as the deferred forward transition.
    fireEvent.click(screen.getByRole('button', { name: playerCopy.knew }));
    expect(screen.getByText(variantTitle(0))).toBeInTheDocument();
  });
});

describe('FlashcardPlayer — paid users: zero nudges, ever (D9 point 6 / manual §1)', () => {
  it('no nudge appears across a full sweep past the 3rd threshold', () => {
    const total = FLASHCARD_GATE_EVERY * (FLASHCARD_GATE_MAX + 1) + 10;
    const deck = makeDeck(total);
    render(<FlashcardPlayer chapter={1} deck={deck} isPaid={true} />);

    for (let reveal = 1; reveal <= total; reveal += 1) {
      const sawNudge = revealAndAdvance();
      expect(sawNudge).toBe(false);
    }
    expect(screen.getByText(playerCopy.deckComplete)).toBeInTheDocument();
  });
});

describe('FlashcardPlayer — structural guard: no gate arithmetic in this component', () => {
  const SOURCE = readFileSync(
    path.resolve(import.meta.dirname, '..', 'src', 'components', 'FlashcardPlayer.tsx'),
    'utf8',
  );
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('never re-derives the 15/30/45 thresholds as a literal modulo or comparison', () => {
    expect(CODE).not.toMatch(/%\s*15\b/);
    expect(CODE).not.toMatch(/===\s*15\b|15\s*===/);
    expect(CODE).not.toMatch(/===\s*30\b|30\s*===/);
    expect(CODE).not.toMatch(/===\s*45\b|45\s*===/);
    expect(CODE).not.toMatch(/>=\s*45\b|45\s*<=/);
  });

  it('never re-derives the max-3-per-run cap as a literal comparison', () => {
    expect(CODE).not.toMatch(/<\s*3\b/);
    expect(CODE).not.toMatch(/>=\s*3\b/);
  });

  it('imports the gate decision and the distinct-reveal reducer from src/lib/nudgeGates.ts rather than reimplementing them', () => {
    expect(CODE).toMatch(/from ['"]@\/lib\/nudgeGates['"]/);
    expect(CODE).toMatch(/flashcardNudgeAfterReveal/);
    expect(CODE).toMatch(/countDistinctReveals/);
  });

  it('declares no gate-like function of its own (*NudgeBefore*, *GateBefore*, *WallBefore*, *NudgeAfterReveal*)', () => {
    const declRe = /\b(?:function|const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[=(]/g;
    const gateNameRe = /(Nudge|Gate|Wall)Before|NudgeAfterReveal/;
    const offenders: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = declRe.exec(CODE)) !== null) {
      const name = match[1];
      if (name !== undefined && gateNameRe.test(name)) offenders.push(name);
    }
    expect(offenders).toEqual([]);
  });

  it('renders <PremiumNudge variant="flashcard"> verbatim, with rotation wired to gatesShownThisRun', () => {
    expect(CODE).toMatch(/<PremiumNudge\s+variant="flashcard"/);
    expect(CODE).toMatch(/rotation=\{gatesShownThisRun\}/);
  });

  it('never imports Firestore or the entitlement store — isPaid is a pure forwarded prop', () => {
    expect(CODE).not.toMatch(/from\s*['"]firebase/);
    expect(CODE).not.toMatch(/entitlementStore/);
    expect(CODE).not.toMatch(/useEntitlement/);
  });
});
