/**
 * Free-question-manifest exclusion logic (Blocker 3), extracted from
 * export-content.mjs so it is directly unit-testable without a live
 * Firestore credential.
 *
 * A free question's field fingerprint may LEGITIMATELY collide with content
 * that is ALREADY public — e.g. its option wording happens to match a
 * phrase in a chapter's approved teaching prose, one of the first
 * SAMPLER_SIZE canonical-order cards a hub/spoke page renders, or a
 * published subtopic's NAME (rendered in the hub's subtopic index,
 * breadcrumbs, spoke titles/H1, and prev/next nav — real, if short, public
 * text in its own right). That is not a leak, so it is excluded from the
 * scan. The exclusion blob is deliberately narrow:
 *   - approved teaching text ONLY (chapter-level + approved subtopics) —
 *     never content/questions (that IS the free-question export itself, so
 *     comparing against it would exclude every free fingerprint),
 *   - the first SAMPLER_SIZE canonical-order cards per chapter ONLY — never
 *     the full raw flashcard deck (cards beyond the sampler are never
 *     public; they exist only for the future signed-in client), and
 *   - published subtopic NAMES (the same set src/lib/content.ts's
 *     publishedSubtopics() renders links/titles for — i.e. every entry
 *     normalizeSubtopicTeaching returns).
 */
import { canon, fieldFingerprints } from './canon.mjs';
import { buildCanonicalDeck } from './canonicalDeck.mjs';
import { extractApprovedTeachingText } from './publicTeachingText.mjs';
import { normalizeSubtopicTeaching } from './teachingNormalize.mjs';

// Must match src/lib/content.ts's SAMPLER_SIZE — the public hub/spoke pages
// only ever render the first this-many canonical-order cards per chapter.
export const SAMPLER_SIZE = 10;

/**
 * Builds the canonicalised "genuinely public" text blobs for a
 * chapter → rawDocs map (as read from content/flashcards/chNN.raw.json).
 */
export function computePublicBlobs(rawByChapter) {
  const blobs = [];
  for (const [chapter, rawDocs] of rawByChapter) {
    const teachingText = extractApprovedTeachingText(rawDocs, chapter);
    if (teachingText.trim()) blobs.push(canon(teachingText));

    const sampler = buildCanonicalDeck(rawDocs, chapter).cards.slice(0, SAMPLER_SIZE);
    const samplerText = sampler.map((c) => `${c.front ?? ''} ${c.back ?? ''}`).join(' ');
    if (samplerText.trim()) blobs.push(canon(samplerText));

    const subtopicNames = Object.values(normalizeSubtopicTeaching(rawDocs, chapter))
      .map((entry) => entry.subtopic)
      .join(' ');
    if (subtopicNames.trim()) blobs.push(canon(subtopicNames));
  }
  return blobs;
}

/**
 * Splits every free question's field fingerprints into scannable (kept in
 * the manifest) vs excluded (textually indistinguishable from `publicBlobs`
 * — still covered by the ID check).
 */
export function partitionFreeFieldFps(freeQuestionsByChapter, publicBlobs) {
  const all = [];
  for (const list of freeQuestionsByChapter.values()) {
    for (const q of list) all.push(...fieldFingerprints(q));
  }
  const scannable = all.filter((fp) => !publicBlobs.some((b) => b.includes(fp)));
  return { all, scannable, excludedCount: all.length - scannable.length };
}
