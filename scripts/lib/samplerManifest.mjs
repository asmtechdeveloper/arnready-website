/**
 * Computes the CANONICAL public flashcard sampler — the exact first
 * SAMPLER_SIZE card ids (canonical workbook order) each chapter's hub page
 * is allowed to render — so check-paid-leak.mjs can assert exact identity,
 * not just a count. A count-only budget (≤10 distinct ids) proves nothing
 * about WHICH 10 cards render: a regression from `.slice(0, 10)` to
 * `.slice(10, 20)` still passes ≤10 distinct ids, silently shipping
 * non-sampler cards.
 *
 * Only chapters that actually get a published hub are included — mirroring
 * src/lib/content.ts's publishedChapters() gate (approved chapter teaching)
 * exactly, via the same single-source normalizeChapterTeaching used there
 * (scripts/lib/teachingNormalize.mjs). A chapter with no hub has no
 * sampler to expect.
 */
import { buildCanonicalDeck } from './canonicalDeck.mjs';
import { normalizeChapterTeaching } from './teachingNormalize.mjs';

export const SAMPLER_SIZE = 10;

/** chapter (number) → array of the first SAMPLER_SIZE canonical-order card ids, in order. */
export function computeSamplerManifest(rawByChapter) {
  const manifest = {};
  for (const [chapter, rawDocs] of rawByChapter) {
    if (!normalizeChapterTeaching(rawDocs, chapter)) continue;
    const ids = buildCanonicalDeck(rawDocs, chapter)
      .cards.slice(0, SAMPLER_SIZE)
      .map((c) => c.cardId);
    if (new Set(ids).size !== ids.length) {
      // Defensive: buildCanonicalDeck's cardId already encodes
      // {chapter}:{subtopicSlug}:{cardIndex}, so a duplicate here would mean
      // a deck-construction bug, not malformed content — fail loudly rather
      // than silently write a manifest that can't be satisfied exactly.
      throw new Error(`[samplerManifest] chapter ${chapter}: buildCanonicalDeck produced duplicate card ids in the sampler slice`);
    }
    manifest[chapter] = ids;
  }
  return manifest;
}
