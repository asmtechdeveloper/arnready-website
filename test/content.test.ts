import { describe, expect, it } from 'vitest';
import { buildChapterContent, orderPublishedSubtopics } from '@/lib/content';
import { subtopicSlug } from '@/lib/flashcardDeck';

/**
 * M1-S3: pin the EXACT app-produced sampler ids/fronts through the loader's
 * real composition (buildChapterContent — canonical order + SAMPLER_SIZE
 * slice), and M1-S1: prove teaching joins to the canonical deck by SLUG
 * identity — a teaching label whose capitalization differs from the
 * flashcard section still resolves to the deck section, in canonical order,
 * with the deck title as its display text.
 *
 * These exercise the same functions loadChapterContent/publishedSubtopics
 * call (loadChapterContent just supplies the raw array from the build-time
 * export); the raw array is injected here so the assertion is content-
 * independent, the same discipline as the deterministic sitemap fixture.
 */
const IFG = 'Investors and Financial Goals';
const SVI = 'Savings vs Investments';

const para = (text: string) => ({ type: 'paragraph', text });
const cards = (label: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ front: `${label} ${i}`, back: 'b' }));

// App-shaped chapter-1 raw docs. Sections are fed in SCRAMBLED input order
// (SvI before IFG) to prove canonical reordering, and the teaching doc's
// subtopic labels are UPPERCASE — a different capitalization than the
// flashcard sections — but slugify to the same slug.
const CH1_RAW = [
  { chapter: 1, subtopic: SVI, cards: cards(SVI, 6) },
  { chapter: 1, subtopic: IFG, cards: cards(IFG, 6) },
  {
    docType: 'chapterTeaching',
    chapter: 1,
    status: 'approved',
    blocks: [para('Chapter one overview.')],
    subtopics: [
      { subtopicSlug: 'investors-and-financial-goals', subtopic: IFG.toUpperCase(), status: 'approved', blocks: [para('IFG teaching.')] },
      { subtopicSlug: 'savings-vs-investments', subtopic: SVI.toUpperCase(), status: 'approved', blocks: [para('SvI teaching.')] },
    ],
  },
];

describe('buildChapterContent sampler (M1-S3)', () => {
  it('produces the exact canonical first-ten card ids', () => {
    const sampler = buildChapterContent(CH1_RAW, 1).sampler;
    expect(sampler).toHaveLength(10);
    expect(sampler.map((c) => c.cardId)).toEqual([
      '1:investors-and-financial-goals:0',
      '1:investors-and-financial-goals:1',
      '1:investors-and-financial-goals:2',
      '1:investors-and-financial-goals:3',
      '1:investors-and-financial-goals:4',
      '1:investors-and-financial-goals:5',
      '1:savings-vs-investments:0',
      '1:savings-vs-investments:1',
      '1:savings-vs-investments:2',
      '1:savings-vs-investments:3',
    ]);
  });

  it('produces the exact canonical first-ten card fronts', () => {
    const sampler = buildChapterContent(CH1_RAW, 1).sampler;
    expect(sampler.map((c) => c.front)).toEqual([
      `${IFG} 0`, `${IFG} 1`, `${IFG} 2`, `${IFG} 3`, `${IFG} 4`, `${IFG} 5`,
      `${SVI} 0`, `${SVI} 1`, `${SVI} 2`, `${SVI} 3`,
    ]);
  });
});

describe('orderPublishedSubtopics slug join (M1-S1)', () => {
  it('joins case-mismatched teaching to the deck by slug, in canonical order, using the deck title', () => {
    const content = buildChapterContent(CH1_RAW, 1);
    const subtopics = orderPublishedSubtopics(content);
    // Both approved teaching entries resolve despite the uppercase labels,
    // ordered by canonical deck order (IFG before SvI) — not sorted to -1.
    expect(subtopics.map((s) => s.subtopicSlug)).toEqual([
      'investors-and-financial-goals',
      'savings-vs-investments',
    ]);
    // The DISPLAY title is the deck section's title, not the uppercase label.
    expect(subtopics.map((s) => s.subtopic)).toEqual([IFG, SVI]);
  });

  it('gives every joined subtopic a non-empty sampler share by slug identity', () => {
    const content = buildChapterContent(CH1_RAW, 1);
    const subtopics = orderPublishedSubtopics(content);
    expect(subtopics.length).toBeGreaterThan(0);
    for (const s of subtopics) {
      const share = content.sampler.filter((c) => subtopicSlug(c.subtopic) === s.subtopicSlug);
      expect(share.length, `${s.subtopicSlug} share`).toBeGreaterThan(0);
    }
  });
});
