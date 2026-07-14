export declare function subtopicSlug(subtopic: unknown): string;
export declare function orderSections(rawSections: unknown[], chapterNumber: number): { subtopic: unknown }[];

type DeckCard = { front?: unknown; back?: unknown; subtopic: string; cardId: string; canonicalIndex: number };
type DeckSection = { subtopic: string; cards: DeckCard[] };

export declare function buildCanonicalDeck(
  rawSections: unknown,
  chapterNumber: number,
): { chapterNumber: number; sections: DeckSection[]; cards: DeckCard[]; totalCards: number };
