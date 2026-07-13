import type { DeckCard } from '@/lib/flashcardDeck';

/**
 * Renders the public sampler deck (≤10 cards, manual §0.6 public budget).
 * Each card carries `data-card-id` — scripts/check-paid-leak.mjs greps this
 * attribute across the built static export to enforce the per-chapter cap,
 * so the attribute name/shape here and the gate's regex must stay in sync.
 * A native <details>/<summary> reveal needs no client JS and is keyboard-
 * operable by default (design doc §9 accessibility baseline).
 */
export function FlashcardSampler({ cards }: { cards: DeckCard[] }) {
  if (cards.length === 0) return null;
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <li key={card.cardId} data-card-id={card.cardId}>
          <details className="group rounded-card bg-white p-5 shadow-card [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer list-none text-[0.95rem] font-bold leading-6 text-ink marker:content-none">
              {String(card.front ?? '')}
            </summary>
            <p className="mt-3 border-t border-line pt-3 text-[0.95rem] leading-6 text-muted">
              {String(card.back ?? '')}
            </p>
          </details>
        </li>
      ))}
    </ul>
  );
}
