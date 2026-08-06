/**
 * THE single source of truth for canonical flashcard deck ordering — ported
 * from ../ARNReady-App/services/flashcardDeck.js (manual §0.3 — deck order
 * is content-derived data, ported not re-derived). Only the pure
 * build/order/slug functions are ported; the Firestore fetch/memo layer is
 * app-only and out of scope here.
 *
 * src/lib/flashcardDeck.ts is a thin typed re-export of this module (see
 * that file's doc). Both the website's page renderer AND export-content.mjs
 * / the leak-gate scripts call the SAME function — a status/entitlement
 * exclusion added here (M1-B5) applies identically everywhere a deck is
 * built, rather than requiring two implementations to independently agree.
 *
 * Any raw flashcard doc carrying a `docType` (e.g. `chapterTeaching`) is
 * teaching-layer metadata, never a subtopic — buildCanonicalDeck excludes it.
 *
 * M1-B5: the public flashcard path previously accepted section docs with
 * `status: 'draft'` or `isFree: false`, and individual cards with
 * `isFree: false`, into the canonical deck — meaning a draft or paid-only
 * card could land in the first-10 canonical order and render publicly. Manual
 * §1 locks flashcards as always-free, but a `status`/`isFree` field, when
 * PRESENT, is an explicit content-pipeline signal that must be honoured, not
 * ignored — absence of the field is not itself a rejection (today's real
 * content carries no such fields at all, and must keep working).
 */
import ORDER from '../../src/lib/flashcardOrder.json' with { type: 'json' };

/**
 * Total string coercion (M1-S2): a Firestore-shaped doc can legally carry a
 * conversion-poison field such as `{ toString: null, valueOf: null }`, on
 * which a bare `String(value)`/template coercion throws a TypeError instead
 * of producing a value. This helper never throws — poison objects (and any
 * other un-coercible value) become '' so a single malformed subtopic can
 * never abort the whole static build. Mirrors safeDiagnostic in
 * teachingNormalize.mjs.
 */
function safeString(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return String(value);
  } catch {
    return '';
  }
}

export function subtopicSlug(subtopic) {
  return safeString(subtopic)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function orderSections(rawSections, chapterNumber) {
  const canon = ORDER[chapterNumber] ?? [];
  const known = [];
  const unknown = [];
  for (const section of Array.isArray(rawSections) ? rawSections : []) {
    (canon.includes(safeString(section?.subtopic)) ? known : unknown).push(section);
  }
  known.sort((a, b) => canon.indexOf(safeString(a?.subtopic)) - canon.indexOf(safeString(b?.subtopic)));
  unknown.sort((a, b) => safeString(a?.subtopic).localeCompare(safeString(b?.subtopic)));
  return [...known, ...unknown];
}

// A section doc is public-eligible unless it explicitly says otherwise. Both
// checks are PRESENCE-gated: a missing field is not a rejection (today's
// real content carries neither field), but an explicit non-approved status
// or isFree:false is honoured, never silently ignored.
function isSectionPublic(section) {
  if (section.status != null && section.status !== 'approved') return false;
  if (section.isFree === false) return false;
  return true;
}

function isCardPublic(card) {
  return card == null || typeof card !== 'object' || card.isFree !== false;
}

/**
 * Builds the canonical chapter deck from raw Firestore section docs. Total
 * function: never throws on malformed input, mirroring the app boundary.
 *
 * TWO BOUNDARIES, one ordering (M5-B1). The canonical order + `cardId`
 * assignment is shared and identical everywhere; only the VISIBILITY filter
 * differs by caller:
 *
 *   - PUBLIC export / sampler (default, `includeNonPublic: false`): drops
 *     draft/`isFree:false` sections and `isFree:false` cards, so the static
 *     site and the leak gate only ever see genuinely public content (M1-B5).
 *   - SIGNED-IN runtime (`includeNonPublic: true`): retains every
 *     non-metadata section and card, matching the app's own
 *     `buildCanonicalDeck` (which excludes ONLY `docType` metadata). Manual §1
 *     locks flashcards as ALL cards for any signed-in user — free or paid —
 *     and the flashcards collection is read-allowed to every signed-in user
 *     by the deployed rules, so this deck never reaches `out/` and is not a
 *     leak. Only `src/lib/questionDelivery.ts` passes this flag.
 *
 * `cardId` is `chapter:slug:rawIndex` in BOTH modes, so a card that appears in
 * both has an identical id — the runtime deck simply carries the extra
 * non-public cards the public deck omitted. Only `canonicalIndex` (deck
 * position) differs between modes, which is ordering, not identity.
 */
export function buildCanonicalDeck(rawSections, chapterNumber, options = {}) {
  const includeNonPublic = options?.includeNonPublic === true;
  // Any doc carrying a docType is teaching-layer metadata (Phase B) — it
  // must never become a section or a card, in EITHER mode. Guard against
  // prototype-pollution keys ('constructor', '__proto__', etc.) reaching
  // subtopicSlug/string concatenation by requiring an own, non-null
  // docType-less plain doc.
  const sectionDocs = (Array.isArray(rawSections) ? rawSections : []).filter((doc) => {
    if (doc == null || typeof doc !== 'object' || doc.docType != null) return false;
    if (!includeNonPublic && !isSectionPublic(doc)) {
      console.warn(
        `[canonicalDeck] chapter ${chapterNumber}: excluding subtopic '${safeString(doc.subtopic)}' — not public (status/isFree)`,
      );
      return false;
    }
    return true;
  });
  const ordered = orderSections(sectionDocs, chapterNumber);
  let flatIndex = 0;
  const sections = ordered.map((section) => {
    const subtopic = safeString(section.subtopic);
    const rawCards = Array.isArray(section.cards) ? section.cards : [];
    // cardId MUST use the ORIGINAL raw-array position, not a position
    // recomputed after filtering — otherwise excluding an earlier card
    // renumbers every later card in the section, so a surviving public card
    // silently inherits the cardId a different, excluded card would have
    // had. That collision defeats the sampler manifest's exact-ID check: a
    // forced render of the excluded card's index would look identical to
    // the legitimate public card that used to sit there. canonicalIndex
    // (the flat position across the whole chapter deck) has no such
    // constraint and stays contiguous.
    const cards = rawCards
      .map((card, rawIndex) => ({ card, rawIndex }))
      .filter(({ card, rawIndex }) => {
        if (includeNonPublic || isCardPublic(card)) return true;
        console.warn(`[canonicalDeck] chapter ${chapterNumber} subtopic '${subtopic}': excluding card ${rawIndex} — isFree:false`);
        return false;
      })
      .map(({ card, rawIndex }) => ({
        ...card,
        subtopic,
        cardId: `${chapterNumber}:${subtopicSlug(subtopic)}:${rawIndex}`,
        canonicalIndex: flatIndex++,
      }));
    return { subtopic, cards };
  });
  return {
    chapterNumber,
    sections,
    cards: sections.flatMap((s) => s.cards),
    totalCards: flatIndex,
  };
}
