/**
 * Extracts plain text from a chapter's APPROVED teaching — used by
 * export-content.mjs to compute what teaching prose is genuinely public,
 * for the free-question-manifest exclusion (Blocker 3). This now derives
 * text from `normalizeChapterTeaching`/`normalizeSubtopicTeaching`
 * (scripts/lib/teachingNormalize.mjs — the SAME functions src/lib/
 * teaching.ts re-exports for the website renderer), so "is this text
 * public" can never diverge from what the website actually shows: a
 * duplicate teaching doc, a malformed block, or a duplicate/drifting/orphan
 * subtopic slug is rejected identically on both sides, because it's
 * literally the same rejection.
 */
import { normalizeChapterTeaching, normalizeSubtopicTeaching } from './teachingNormalize.mjs';

function segmentsText(segments) {
  return segments.map((s) => s.text).join(' ');
}

function blockText(block) {
  if (block.type === 'bullets') {
    return block.items.map((item) => segmentsText(item.segments)).join(' ');
  }
  return segmentsText(block.segments);
}

export function extractApprovedTeachingText(rawDocs, chapter) {
  const texts = [];

  const chapterTeaching = normalizeChapterTeaching(rawDocs, chapter);
  if (chapterTeaching) {
    texts.push(chapterTeaching.blocks.map(blockText).join(' '));
  }

  const subtopicTeaching = normalizeSubtopicTeaching(rawDocs, chapter);
  for (const entry of Object.values(subtopicTeaching)) {
    texts.push(entry.blocks.map(blockText).join(' '));
  }

  return texts.join(' ');
}
