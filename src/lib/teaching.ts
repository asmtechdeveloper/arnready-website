/**
 * Thin typed re-export of scripts/lib/teachingNormalize.mjs — THE single
 * source of truth for teaching normalization (Blocker 3, M1-r remediation):
 * export-content.mjs's free-question-manifest exclusion must derive
 * "genuinely public" text from the EXACT SAME validation this website
 * renderer uses (duplicate-teaching-doc rejection, malformed-block
 * rejection, duplicate/drifting/orphan subtopic-slug rejection), not a
 * lighter hand-rolled approximation that can diverge and silently exclude
 * a free question's fingerprint for text the website would never actually
 * render. Plain Node (export-content.mjs) cannot resolve this file's path
 * aliases without a build step, so the implementation lives in a plain
 * `.mjs` module both sides import (typed here via teachingNormalize.d.mts).
 */
export {
  normalizeChapterTeaching,
  normalizeSubtopicTeaching,
  type Emphasis,
  type Segment,
  type ParagraphBlock,
  type HeadingBlock,
  type BulletsBlock,
  type TeachingBlock,
  type ChapterTeaching,
  type SubtopicTeaching,
} from '../../scripts/lib/teachingNormalize.mjs';
