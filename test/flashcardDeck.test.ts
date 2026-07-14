import { describe, expect, it } from 'vitest';
import { buildCanonicalDeck, orderSections, subtopicSlug } from '@/lib/flashcardDeck';
import ORDER from '@/lib/flashcardOrder.json';

describe('subtopicSlug', () => {
  it('matches the app repo slug algorithm', () => {
    expect(subtopicSlug('Savings vs Investments')).toBe('savings-vs-investments');
    expect(subtopicSlug('Investors and Financial Goals')).toBe('investors-and-financial-goals');
  });
});

describe('buildCanonicalDeck', () => {
  const teachingDoc = { docType: 'chapterTeaching', chapter: 1, status: 'approved', blocks: [] };
  const section = (subtopic: string, n: number) => ({
    chapter: 1,
    subtopic,
    cards: Array.from({ length: n }, (_, i) => ({ front: `${subtopic} ${i}`, back: 'b', isFree: undefined as boolean | undefined })),
  });

  it('excludes docType metadata docs from the deck', () => {
    const raw = [teachingDoc, section('Investors and Financial Goals', 2)];
    const deck = buildCanonicalDeck(raw, 1);
    expect(deck.totalCards).toBe(2);
    expect(deck.sections).toHaveLength(1);
  });

  it('orders sections by canonical workbook order, not input order', () => {
    const raw = [section('Behavioural Biases', 1), section('Investors and Financial Goals', 1), section('Savings vs Investments', 1)];
    const deck = buildCanonicalDeck(raw, 1);
    expect(deck.sections.map((s) => s.subtopic)).toEqual([
      'Investors and Financial Goals',
      'Savings vs Investments',
      'Behavioural Biases',
    ]);
  });

  it('appends unknown subtopics alphabetically after known ones', () => {
    const raw = [section('Zzz Unknown Topic', 1), section('Investors and Financial Goals', 1)];
    const deck = buildCanonicalDeck(raw, 1);
    expect(deck.sections.map((s) => s.subtopic)).toEqual(['Investors and Financial Goals', 'Zzz Unknown Topic']);
  });

  it('assigns a flat canonicalIndex across the whole chapter deck', () => {
    const raw = [section('Investors and Financial Goals', 2), section('Savings vs Investments', 3)];
    const deck = buildCanonicalDeck(raw, 1);
    expect(deck.cards.map((c) => c.canonicalIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(deck.totalCards).toBe(5);
  });

  it('first 10 canonical-order cards form the public sampler deck', () => {
    const raw = [
      section('Investors and Financial Goals', 6),
      section('Savings vs Investments', 6),
      section('Different Asset Classes', 4),
    ];
    const deck = buildCanonicalDeck(raw, 1);
    const sampler = deck.cards.slice(0, 10);
    expect(sampler).toHaveLength(10);
    expect(sampler.every((c) => c.subtopic !== 'Different Asset Classes')).toBe(true);
  });

  it('never throws for malformed/empty input', () => {
    expect(() => buildCanonicalDeck([], 1)).not.toThrow();
    expect(() => buildCanonicalDeck([null, 'garbage', 42], 1)).not.toThrow();
    expect(buildCanonicalDeck([], 1).totalCards).toBe(0);
  });

  // M1-S2: the deck helper's stated totality must hold for a non-array root
  // and for conversion-poison subtopic fields — a single malformed Firestore
  // doc must normalize away, never abort the whole static build.
  describe('is total for non-array roots and conversion-poison fields (M1-S2)', () => {
    it('never throws on a non-array root (object, string, number, null, undefined)', () => {
      for (const root of [undefined, null, 'garbage', 42, { subtopic: 'x' }] as unknown[]) {
        expect(() => buildCanonicalDeck(root, 1)).not.toThrow();
        expect(buildCanonicalDeck(root, 1).totalCards).toBe(0);
      }
    });

    it('never throws on a conversion-poison subtopic and drops that section', () => {
      const poison = { toString: null, valueOf: null };
      const raw = [
        { chapter: 1, subtopic: poison, cards: [{ front: 'p', back: 'b' }] },
        section('Investors and Financial Goals', 2),
      ];
      let deck!: ReturnType<typeof buildCanonicalDeck>;
      expect(() => (deck = buildCanonicalDeck(raw as never, 1))).not.toThrow();
      // The poison section slugifies to '' (unknown), sorts after the known
      // section, and its cards still count; nothing throws.
      expect(deck.sections.map((s) => s.subtopic)).toEqual(['Investors and Financial Goals', '']);
      expect(deck.totalCards).toBe(3);
    });

    it('never throws when subtopicSlug is given a conversion-poison value', () => {
      expect(() => subtopicSlug({ toString: null, valueOf: null } as never)).not.toThrow();
      expect(subtopicSlug({ toString: null, valueOf: null } as never)).toBe('');
    });
  });

  // M1-B5: the public flashcard path must reject prohibited status/
  // entitlement fields at this shared deck boundary — not just the sampler
  // slice — since anything accepted here can land in the first-10 canonical
  // order and render publicly (hub/spoke pages, sitemap, sampler manifest).
  describe('rejects prohibited status/entitlement fields (M1-B5)', () => {
    it('excludes an entire section whose status is not "approved"', () => {
      const raw = [{ ...section('Investors and Financial Goals', 3), status: 'draft' }];
      const deck = buildCanonicalDeck(raw, 1);
      expect(deck.totalCards).toBe(0);
      expect(deck.sections).toHaveLength(0);
    });

    it('excludes an entire section whose isFree is explicitly false', () => {
      const raw = [{ ...section('Investors and Financial Goals', 3), isFree: false }];
      const deck = buildCanonicalDeck(raw, 1);
      expect(deck.totalCards).toBe(0);
    });

    it('includes a section with no status/isFree field at all (today\'s real content)', () => {
      const raw = [section('Investors and Financial Goals', 3)];
      const deck = buildCanonicalDeck(raw, 1);
      expect(deck.totalCards).toBe(3);
    });

    it('includes a section explicitly marked status:"approved" or isFree:true', () => {
      const raw = [
        { ...section('Investors and Financial Goals', 2), status: 'approved' },
        { ...section('Savings vs Investments', 2), isFree: true },
      ];
      const deck = buildCanonicalDeck(raw, 1);
      expect(deck.totalCards).toBe(4);
    });

    it('excludes an individual card whose isFree is explicitly false, keeping the rest of its section public', () => {
      const goodSection = section('Investors and Financial Goals', 3);
      goodSection.cards[1] = { ...goodSection.cards[1]!, isFree: false };
      const deck = buildCanonicalDeck([goodSection], 1);
      expect(deck.totalCards).toBe(2);
      expect(deck.cards.every((c) => c.front !== 'Investors and Financial Goals 1')).toBe(true);
    });

    it('a draft/paid section or card never enters the public first-10 sampler even when other sections push totals past 10', () => {
      const raw = [
        { ...section('Different Asset Classes', 5), status: 'draft' },
        section('Investors and Financial Goals', 9),
        section('Savings vs Investments', 5),
      ];
      const deck = buildCanonicalDeck(raw, 1);
      const sampler = deck.cards.slice(0, 10);
      expect(sampler.every((c) => c.subtopic !== 'Different Asset Classes')).toBe(true);
    });

    // Regression: cardId must use the ORIGINAL raw-array position, not a
    // position recomputed after filtering out excluded cards — otherwise
    // excluding raw card 0 makes the surviving raw card 1 inherit cardId
    // "...:0", the id a forced render of the excluded card would also use.
    // That collision would let a forced-rendered paid card 0 look, by ID
    // alone, identical to the legitimate public card that used to be at
    // position 1, defeating the sampler manifest's exact-ID check.
    it('preserves each surviving card\'s ORIGINAL raw-array index in its cardId when an earlier card is excluded', () => {
      const goodSection = section('Investors and Financial Goals', 3);
      goodSection.cards[0] = { ...goodSection.cards[0]!, isFree: false }; // raw index 0: paid, excluded
      // raw index 1 and 2 remain public.
      const deck = buildCanonicalDeck([goodSection], 1);
      expect(deck.cards.map((c) => c.cardId)).toEqual([
        '1:investors-and-financial-goals:1',
        '1:investors-and-financial-goals:2',
      ]);
      // canonicalIndex (the flat chapter-wide position) is unaffected —
      // it stays contiguous regardless of the raw-index gap.
      expect(deck.cards.map((c) => c.canonicalIndex)).toEqual([0, 1]);
    });
  });
});

// M1-S3: an all-chapter order-parity assertion — a card/section reversal in
// any of the 12 chapters must be caught, not just chapter 1. Feeding each
// chapter's canonical subtopics in REVERSED input order and requiring the
// deck to restore the app's flashcardOrder.json order detects order drift
// anywhere in the ported ORDER table.
describe('canonical section order parity across all 12 chapters (M1-S3)', () => {
  it('restores the app canonical order from scrambled input for every chapter', () => {
    const order = ORDER as Record<string, string[]>;
    for (let ch = 1; ch <= 12; ch++) {
      const canonical = order[String(ch)] ?? [];
      expect(canonical.length).toBeGreaterThan(0);
      const raw = [...canonical].reverse().map((subtopic) => ({
        chapter: ch,
        subtopic,
        cards: [{ front: `${subtopic} 0`, back: 'b' }],
      }));
      const deck = buildCanonicalDeck(raw, ch);
      expect(deck.sections.map((s) => s.subtopic)).toEqual(canonical);
    }
  });
});

describe('orderSections', () => {
  it('is a pure function that does not mutate input', () => {
    const raw = [{ chapter: 1, subtopic: 'Behavioural Biases', cards: [] }];
    const copy = JSON.parse(JSON.stringify(raw));
    orderSections(raw, 1);
    expect(raw).toEqual(copy);
  });
});
