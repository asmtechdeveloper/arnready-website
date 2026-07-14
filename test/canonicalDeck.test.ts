import { describe, expect, it } from 'vitest';
import * as jsPort from '../scripts/lib/canonicalDeck.mjs';
import * as tsOriginal from '@/lib/flashcardDeck';

/**
 * src/lib/flashcardDeck.ts is now a thin typed re-export of
 * scripts/lib/canonicalDeck.mjs (M1-B5 remediation — ONE deck-building
 * function, not two independently-maintained copies, so a status/
 * entitlement exclusion added at that shared boundary can never be present
 * on one side and missing on the other). This test is a lightweight sanity
 * check on the re-export wiring itself, not a drift guard between separate
 * implementations.
 */
const fixture = [
  { chapter: 1, subtopic: 'Behavioural Biases', cards: [{ front: 'f1', back: 'b1' }] },
  { chapter: 1, subtopic: 'Investors and Financial Goals', cards: [{ front: 'f2', back: 'b2' }, { front: 'f3', back: 'b3' }] },
  { chapter: 1, subtopic: 'Zzz Unknown Topic', cards: [{ front: 'f4', back: 'b4' }] },
  { docType: 'chapterTeaching', chapter: 1, status: 'approved', blocks: [] },
];

describe('canonicalDeck.mjs matches src/lib/flashcardDeck.ts', () => {
  it('subtopicSlug is identical', () => {
    for (const s of ['Savings vs Investments', 'DIY vs Professional Help', 'Weird — Case']) {
      expect(jsPort.subtopicSlug(s)).toBe(tsOriginal.subtopicSlug(s));
    }
  });

  it('buildCanonicalDeck produces identical section order, card ids, and totals', () => {
    const jsDeck = jsPort.buildCanonicalDeck(fixture, 1);
    const tsDeck = tsOriginal.buildCanonicalDeck(fixture, 1);
    expect(jsDeck.totalCards).toBe(tsDeck.totalCards);
    expect(jsDeck.sections.map((s) => s.subtopic)).toEqual(tsDeck.sections.map((s) => s.subtopic));
    expect(jsDeck.cards.map((c) => c.cardId)).toEqual(tsDeck.cards.map((c) => c.cardId));
    expect(jsDeck.cards.map((c) => c.canonicalIndex)).toEqual(tsDeck.cards.map((c) => c.canonicalIndex));
  });

  it('both exclude docType metadata docs identically', () => {
    const jsDeck = jsPort.buildCanonicalDeck(fixture, 1);
    const tsDeck = tsOriginal.buildCanonicalDeck(fixture, 1);
    expect(jsDeck.sections).toHaveLength(3);
    expect(tsDeck.sections).toHaveLength(3);
  });
});
