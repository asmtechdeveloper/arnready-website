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
import { buildCanonicalDeck, type CanonicalDeck, type DeckCard, type RawSectionDoc } from './flashcardDeck';

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

export function loadChapterContent(chapter: number): ChapterContent {
  const raw = loadRawChapterDocs(chapter);
  return {
    chapter,
    chapterTeaching: normalizeChapterTeaching(raw, chapter),
    subtopicTeachingBySlug: normalizeSubtopicTeaching(raw, chapter),
    deck: buildCanonicalDeck(raw, chapter),
    sampler: buildCanonicalDeck(raw, chapter).cards.slice(0, SAMPLER_SIZE),
  };
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
 */
export function publishedSubtopics(chapter: number): SubtopicTeaching[] {
  const content = loadChapterContent(chapter);
  const order = content.deck.sections.map((s) => s.subtopic);
  return Object.values(content.subtopicTeachingBySlug).sort(
    (a, b) => order.indexOf(a.subtopic) - order.indexOf(b.subtopic),
  );
}
