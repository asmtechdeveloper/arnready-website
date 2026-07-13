/**
 * Ported from ../ARNReady-App/services/flashcardDeck.js (manual §0.3 — deck
 * order is content-derived data, ported not re-derived). Only the pure
 * build/order/slug functions are ported; the Firestore fetch/memo layer is
 * app-only and out of scope here (M1 is public/static, no client Firestore
 * reads).
 *
 * Any raw flashcard doc carrying a `docType` (e.g. `chapterTeaching`) is
 * teaching-layer metadata, never a subtopic — buildCanonicalDeck excludes it,
 * exactly as the app does.
 */
import { FLASHCARD_SUBTOPIC_ORDER } from './flashcardOrder';

export type RawCard = {
  front?: unknown;
  back?: unknown;
  cardType?: unknown;
  [key: string]: unknown;
};

export type RawSectionDoc = {
  docType?: string | null;
  chapter?: unknown;
  subtopic?: unknown;
  cards?: RawCard[];
  [key: string]: unknown;
};

export type DeckCard = RawCard & {
  subtopic: string;
  cardId: string;
  canonicalIndex: number;
};

export type DeckSection = {
  subtopic: string;
  cards: DeckCard[];
};

export type CanonicalDeck = {
  chapterNumber: number;
  sections: DeckSection[];
  cards: DeckCard[];
  totalCards: number;
};

/** Must stay in lockstep with buildFlashcardDocs() in the app repo's upload script. */
export function subtopicSlug(subtopic: unknown): string {
  return String(subtopic)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Sorts raw Firestore sections into canonical workbook order. Unknown
 * subtopics append after known ones, alphabetically (deterministic
 * fallback) — content drift never drops a subtopic.
 */
export function orderSections(rawSections: RawSectionDoc[], chapterNumber: number): RawSectionDoc[] {
  const canon = FLASHCARD_SUBTOPIC_ORDER[chapterNumber] ?? [];
  const known: RawSectionDoc[] = [];
  const unknown: RawSectionDoc[] = [];
  for (const section of rawSections) {
    (canon.includes(String(section.subtopic)) ? known : unknown).push(section);
  }
  known.sort((a, b) => canon.indexOf(String(a.subtopic)) - canon.indexOf(String(b.subtopic)));
  unknown.sort((a, b) => String(a.subtopic).localeCompare(String(b.subtopic)));
  return [...known, ...unknown];
}

/**
 * Builds the canonical chapter deck from raw Firestore section docs. Total
 * function: never throws on malformed input, mirroring the app boundary.
 */
export function buildCanonicalDeck(rawSections: RawSectionDoc[], chapterNumber: number): CanonicalDeck {
  // Any doc carrying a docType is teaching-layer metadata (Phase B) — it
  // must never become a section or a card. Guard against prototype-pollution
  // keys ('constructor', '__proto__', etc.) reaching subtopicSlug/string
  // concatenation by requiring an own, non-null docType-less plain doc.
  const sectionDocs = (rawSections ?? []).filter(
    (doc) => doc != null && typeof doc === 'object' && doc.docType == null,
  );
  const ordered = orderSections(sectionDocs, chapterNumber);
  let flatIndex = 0;
  const sections: DeckSection[] = ordered.map((section) => {
    const subtopic = String(section.subtopic ?? '');
    const cards: DeckCard[] = (Array.isArray(section.cards) ? section.cards : []).map((card, cardIndex) => ({
      ...card,
      subtopic,
      cardId: `${chapterNumber}:${subtopicSlug(subtopic)}:${cardIndex}`,
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
