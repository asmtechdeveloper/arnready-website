import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildCanonicalDeck } from '@/lib/flashcardDeck';

/**
 * M5-B1 regression — the signed-in runtime flashcard deck must retain every
 * non-metadata section and card, while the public export keeps dropping
 * draft / `isFree:false` content.
 *
 * The bug: `fetchFlashcardDeck` reused the PUBLIC-sampler builder, which
 * excludes `isFree:false` sections/cards (M1-B5). Manual §1 gives any signed-in
 * user (free or paid) ALL cards, and the app's own `buildCanonicalDeck`
 * excludes only `docType` metadata — so a signed-in learner was silently losing
 * paid-only cards. The fix splits the visibility filter from the shared
 * ordering/cardId logic via `{ includeNonPublic }`.
 */

// A chapter's raw docs: one fully-public section, one public section that
// contains an isFree:false card in the middle, one isFree:false section, one
// draft section, and one teaching-metadata doc.
function rawDocs() {
  return [
    {
      subtopic: 'Alpha',
      cards: [
        { front: 'a0', back: 'A0' },
        { front: 'a1-paid', back: 'A1', isFree: false },
        { front: 'a2', back: 'A2' },
      ],
    },
    {
      subtopic: 'Bravo-paid',
      isFree: false,
      cards: [{ front: 'b0', back: 'B0' }],
    },
    {
      subtopic: 'Charlie-draft',
      status: 'draft',
      cards: [{ front: 'c0', back: 'C0' }],
    },
    { docType: 'chapterTeaching', chapter: 1, blocks: [] },
  ];
}

const fronts = (deck: ReturnType<typeof buildCanonicalDeck>) => deck.cards.map((c) => String(c.front));

describe('M5-B1 — public vs signed-in deck boundaries', () => {
  it('PUBLIC (default) excludes the isFree:false card, the paid section, and the draft section', () => {
    const deck = buildCanonicalDeck(rawDocs(), 1);
    expect(fronts(deck)).toEqual(['a0', 'a2']); // a1-paid, b0, c0 all dropped
    // Metadata never becomes a section, in either mode.
    expect(deck.sections.some((s) => s.subtopic === '')).toBe(false);
  });

  it('SIGNED-IN (includeNonPublic) retains every non-metadata section and card', () => {
    const deck = buildCanonicalDeck(rawDocs(), 1, { includeNonPublic: true });
    // Every real card is present; only the docType metadata doc is excluded.
    expect(fronts(deck).sort()).toEqual(['a0', 'a1-paid', 'a2', 'b0', 'c0'].sort());
    expect(deck.sections.map((s) => s.subtopic)).toContain('Bravo-paid');
    expect(deck.sections.map((s) => s.subtopic)).toContain('Charlie-draft');
    // The teaching-metadata doc is still excluded.
    expect(deck.totalCards).toBe(5);
  });

  it('a card present in BOTH modes keeps an identical cardId (rawIndex-based, collision-free)', () => {
    const pub = buildCanonicalDeck(rawDocs(), 1);
    const run = buildCanonicalDeck(rawDocs(), 1, { includeNonPublic: true });
    const pubA2 = pub.cards.find((c) => c.front === 'a2')!;
    const runA2 = run.cards.find((c) => c.front === 'a2')!;
    // Public: a1-paid dropped, but a2 keeps rawIndex 2 → cardId "...:2".
    expect(pubA2.cardId).toBe('1:alpha:2');
    expect(runA2.cardId).toBe(pubA2.cardId);
    // The runtime-only paid card sits at its own rawIndex, no collision.
    expect(run.cards.find((c) => c.front === 'a1-paid')!.cardId).toBe('1:alpha:1');
  });
});

// ── Delivery-level: fetchFlashcardDeck must use the runtime boundary ──────────
let mockDocs: Record<string, unknown>[] = [];
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ __collection: name }),
  where: (field: string, op: string, value: unknown) => ({ __where: { field, op, value } }),
  query: (col: unknown) => ({ __query: col }),
  getDocs: async () => ({ docs: mockDocs.map((data) => ({ data: () => data })) }),
}));
vi.mock('@/lib/firebaseClient', () => ({ getDb: () => ({ __fake: true }) }));

const { fetchFlashcardDeck } = await import('@/lib/questionDelivery');

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  mockDocs = [];
});

describe('M5-B1 — fetchFlashcardDeck delivers the full signed-in deck', () => {
  it('includes an isFree:false card that the public export would drop', async () => {
    mockDocs = [
      { chapter: 1, subtopic: 'Alpha', cards: [{ front: 'free', back: 'F' }, { front: 'paid', back: 'P', isFree: false }] },
    ];
    const result = await fetchFlashcardDeck(1);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.deck.cards.map((c) => String(c.front)).sort()).toEqual(['free', 'paid']);
  });
});
