/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Ported verbatim from ../ARNReady-App/services/flashcardOrder.js (canonical
 * workbook-order subtopic list per chapter). Manual §0.3: engine/content
 * ordering data is ported, never re-derived. Regenerate by re-copying that
 * file if the app repo's order changes.
 *
 * The table itself lives in `flashcardOrder.json` — a single source of truth
 * shared with `scripts/lib/canonicalDeck.mjs` (plain Node, used by
 * export-content.mjs's leak-gate exclusion logic, which cannot resolve a
 * `.ts` module without a build step). Keeping the DATA in JSON means there
 * is exactly one copy of this table to keep in sync with the app repo, not
 * two.
 */
import data from './flashcardOrder.json';

export const FLASHCARD_SUBTOPIC_ORDER = data as Record<number, string[]>;

export default FLASHCARD_SUBTOPIC_ORDER;
