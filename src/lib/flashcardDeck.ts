/**
 * Thin typed re-export of scripts/lib/canonicalDeck.mjs — THE single source
 * of truth for canonical flashcard deck ordering (M1-B5, M1-r remediation):
 * both the website's page renderer and export-content.mjs/the leak-gate
 * scripts must build the deck the exact same way, so a status/entitlement
 * exclusion (draft sections, isFree:false sections or cards) added there
 * applies everywhere a deck is built, not just wherever someone remembered
 * to duplicate it. Plain Node (export-content.mjs) cannot resolve this
 * file's path aliases without a build step, so the implementation lives in
 * a plain `.mjs` module both sides import (typed here via
 * canonicalDeck.d.mts).
 */
import { buildCanonicalDeck as buildCanonicalDeckImpl, orderSections as orderSectionsImpl } from '../../scripts/lib/canonicalDeck.mjs';

export { subtopicSlug } from '../../scripts/lib/canonicalDeck.mjs';

export type RawCard = {
  front?: unknown;
  back?: unknown;
  cardType?: unknown;
  isFree?: unknown;
  [key: string]: unknown;
};

export type RawSectionDoc = {
  docType?: string | null;
  chapter?: unknown;
  subtopic?: unknown;
  status?: unknown;
  isFree?: unknown;
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

export const orderSections: (rawSections: RawSectionDoc[], chapterNumber: number) => RawSectionDoc[] = orderSectionsImpl;

/**
 * `includeNonPublic: true` retains every non-metadata section/card for the
 * SIGNED-IN runtime deck (manual §1: all cards); the default (public) mode
 * keeps the M1-B5 draft/`isFree:false` exclusion for the static export. Only
 * `questionDelivery.fetchFlashcardDeck` passes the flag — see canonicalDeck.mjs.
 */
export type BuildDeckOptions = { includeNonPublic?: boolean };
export const buildCanonicalDeck: (
  rawSections: unknown,
  chapterNumber: number,
  options?: BuildDeckOptions,
) => CanonicalDeck = buildCanonicalDeckImpl;
