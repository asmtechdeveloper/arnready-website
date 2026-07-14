/**
 * Build-time-only content loader (manual §0.5: Firestore is the single
 * content source; public pages are SSG'd FROM the build-time export written
 * by scripts/export-content.mjs — never hand-edited or re-fetched at
 * request time). Reads the per-chapter raw doc array and runs it through
 * the ported, unit-tested normalization/ordering functions.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { normalizeChapterTeaching, normalizeSubtopicTeaching, type ChapterTeaching, type SubtopicTeaching } from './teaching';
import { buildCanonicalDeck, subtopicSlug, type CanonicalDeck, type DeckCard, type RawSectionDoc } from './flashcardDeck';

const CONTENT_DIR = path.resolve(process.cwd(), 'content');

export const TOTAL_CHAPTERS = 12;
export const SAMPLER_SIZE = 10;

function loadRawChapterDocs(chapter: number): RawSectionDoc[] {
  const file = path.join(CONTENT_DIR, 'flashcards', `ch${String(chapter).padStart(2, '0')}.raw.json`);
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

export type ChapterContent = {
  chapter: number;
  chapterTeaching: ChapterTeaching | null;
  subtopicTeachingBySlug: Record<string, SubtopicTeaching>;
  deck: CanonicalDeck;
  sampler: DeckCard[];
};

/**
 * Pure composition of a chapter's public content from its raw Firestore doc
 * array — the fs-free core of loadChapterContent, so the exact sampler
 * (canonical order + SAMPLER_SIZE slice) and the subtopic join can be pinned
 * in tests against an app-shaped fixture without a build-time export on disk
 * (M1-S3). Never throws (all callees are total).
 */
export function buildChapterContent(raw: RawSectionDoc[], chapter: number): ChapterContent {
  const deck = buildCanonicalDeck(raw, chapter);
  return {
    chapter,
    chapterTeaching: normalizeChapterTeaching(raw, chapter),
    subtopicTeachingBySlug: normalizeSubtopicTeaching(raw, chapter),
    deck,
    sampler: deck.cards.slice(0, SAMPLER_SIZE),
  };
}

export function loadChapterContent(chapter: number): ChapterContent {
  return buildChapterContent(loadRawChapterDocs(chapter), chapter);
}

/** Chapters eligible for a public hub page: approved chapter teaching exists. */
export function publishedChapters(): number[] {
  const chapters: number[] = [];
  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    if (normalizeChapterTeaching(loadRawChapterDocs(ch), ch)) chapters.push(ch);
  }
  return chapters;
}

/**
 * Ordered list of a chapter's spoke-eligible subtopics (approved subtopic
 * teaching only — manual step 3), in canonical deck order, for the hub's
 * subtopic index and for prev/next navigation on spoke pages.
 *
 * M1-S1: teaching is joined to the canonical deck by SLUG identity, not by
 * display text. A valid teaching label whose capitalization differs from the
 * flashcard section's label slugifies to the same slug — joining on the raw
 * display string sorted it to `-1` and gave it zero sampler cards. We walk
 * the deck sections (already in canonical order) and attach each section's
 * approved teaching by slug, and expose the DECK section's title as the
 * display `subtopic`, matching the app contract.
 */
export function orderPublishedSubtopics(content: ChapterContent): SubtopicTeaching[] {
  const ordered: SubtopicTeaching[] = [];
  for (const section of content.deck.sections) {
    const teaching = content.subtopicTeachingBySlug[subtopicSlug(section.subtopic)];
    if (teaching) ordered.push({ ...teaching, subtopic: section.subtopic });
  }
  return ordered;
}

export function publishedSubtopics(chapter: number): SubtopicTeaching[] {
  return orderPublishedSubtopics(loadChapterContent(chapter));
}
