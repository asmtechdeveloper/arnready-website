import { describe, expect, it } from 'vitest';
import { buildCanonicalDeck, orderSections, subtopicSlug } from '@/lib/flashcardDeck';

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
    cards: Array.from({ length: n }, (_, i) => ({ front: `${subtopic} ${i}`, back: 'b' })),
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
    // @ts-expect-error deliberately malformed fixture
    expect(() => buildCanonicalDeck([null, 'garbage', 42], 1)).not.toThrow();
    expect(buildCanonicalDeck([], 1).totalCards).toBe(0);
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
