import { describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';

/**
 * M1-B10: these tests must run deterministically in the clean §3 gate order
 * (lint → typecheck → test → build), BEFORE `export-content`/`build` ever
 * runs — so they cannot depend on the gitignored, live-Firestore-generated
 * `content/` directory. `@/lib/content` (the only thing sitemap.ts reads
 * from disk, via `publishedChapters`/`publishedSubtopics`) is mocked with a
 * fixed, deterministic fixture instead: 12 chapters, 2 subtopics each. The
 * exact expected route set is asserted (not "contains at least one"), so a
 * missing OR an extra route fails the test either way.
 */
const FIXTURE_SUBTOPICS: Record<number, { subtopicSlug: string; subtopic: string }[]> = {};
for (let ch = 1; ch <= 12; ch += 1) {
  FIXTURE_SUBTOPICS[ch] = [
    { subtopicSlug: `ch${ch}-topic-a`, subtopic: `Chapter ${ch} Topic A` },
    { subtopicSlug: `ch${ch}-topic-b`, subtopic: `Chapter ${ch} Topic B` },
  ];
}
const FIXTURE_CHAPTERS = Array.from({ length: 12 }, (_, i) => i + 1);

vi.mock('@/lib/content', () => ({
  publishedChapters: () => FIXTURE_CHAPTERS,
  publishedSubtopics: (chapter: number) => FIXTURE_SUBTOPICS[chapter] ?? [],
}));

const BASE = 'https://arnready.com';
const EXPECTED_STATIC = [
  `${BASE}`,
  `${BASE}/chapters`,
  `${BASE}/nism-series-v-a`,
  `${BASE}/syllabus`,
  `${BASE}/pricing`,
  `${BASE}/about`,
  `${BASE}/faq`,
  `${BASE}/privacy`,
  `${BASE}/delete-account`,
  `${BASE}/support`,
];
const EXPECTED_CHAPTER_ROUTES = FIXTURE_CHAPTERS.flatMap((ch) => [
  `${BASE}/chapters/${ch}`,
  ...FIXTURE_SUBTOPICS[ch]!.map((s) => `${BASE}/chapters/${ch}/${s.subtopicSlug}`),
]);
const EXPECTED_ROUTES = [...EXPECTED_STATIC, ...EXPECTED_CHAPTER_ROUTES];

describe('sitemap', () => {
  it('produces EXACTLY the expected route set — all 12 chapter hubs, all fixture spokes, and every standard static page, in order', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toEqual(EXPECTED_ROUTES);
  });

  it('has the expected total route count (10 static + 12 hubs + 24 spokes = 46)', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toHaveLength(46);
  });

  it('includes every one of the 12 chapter hub URLs', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    for (const ch of FIXTURE_CHAPTERS) {
      expect(urls.has(`${BASE}/chapters/${ch}`)).toBe(true);
    }
  });

  it('includes every fixture subtopic spoke URL', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    for (const ch of FIXTURE_CHAPTERS) {
      for (const s of FIXTURE_SUBTOPICS[ch]!) {
        expect(urls.has(`${BASE}/chapters/${ch}/${s.subtopicSlug}`)).toBe(true);
      }
    }
  });

  it('never includes the retired /questions route', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.includes('/questions'))).toBe(false);
  });

  it('produces no duplicate URLs', () => {
    const urls = sitemap().map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  // Proves the exact-match assertion actually catches deviation — a route
  // set missing one chapter, or carrying one extra unexpected route, must
  // fail against EXPECTED_ROUTES rather than passing a looser "contains"
  // check.
  it('the exact-match technique fails on a missing route', () => {
    const urls = sitemap().map((e) => e.url);
    const missingOneChapter = urls.filter((u) => u !== `${BASE}/chapters/6`);
    expect(missingOneChapter).not.toEqual(EXPECTED_ROUTES);
  });

  it('the exact-match technique fails on an extra/unexpected route', () => {
    const urls = sitemap().map((e) => e.url);
    const withExtraRoute = [...urls, `${BASE}/chapters/6/an-unexpected-subtopic`];
    expect(withExtraRoute).not.toEqual(EXPECTED_ROUTES);
  });
});
