'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import { studySurface as copy } from '@/lib/copy';
import { useEntitlement } from '@/lib/entitlementStore';
import { fetchFlashcardDeck } from '@/lib/questionDelivery';
import type { CanonicalDeck } from '@/lib/flashcardDeck';
import { FlashcardPlayer } from '@/components/FlashcardPlayer';
import { StudySurface, type DeliveryResult } from '@/components/StudySurface';

/**
 * `/app/flashcards` client surface (M5 S3, player mounted in S6). Wires
 * params → auth → entitlement → `questionDelivery`, then mounts
 * `<FlashcardPlayer>` in the slot it resolves to — no gate/nudge decision or
 * card rendering happens in this file itself; that is `FlashcardPlayer`'s
 * scope (D9). Both tiers get the same canonical deck (D9) — `isPaid` is read
 * here only to hand to the player's distinct-reveal nudge gate, not to
 * change which cards are delivered.
 */
export function FlashcardsSurface() {
  const searchParams = useSearchParams();
  const chapterParam = searchParams.get('chapter');
  const isPaid = useEntitlement((s) => s.isPaid);

  const load = useCallback(async (chapter: number): Promise<DeliveryResult<CanonicalDeck>> => {
    const result = await fetchFlashcardDeck(chapter);
    return result.status === 'ok' ? { status: 'ok', data: result.deck } : result;
  }, []);

  return (
    <StudySurface chapterParam={chapterParam} loadingLabel={copy.loading.flashcards} load={load}>
      {({ chapter, data }) => (
        <div data-testid="flashcards-player-slot">
          <FlashcardPlayer chapter={chapter} deck={data} isPaid={isPaid} />
          <span
            hidden
            data-testid="flashcards-delivery-state"
            data-chapter={chapter}
            data-card-count={data.totalCards}
          />
        </div>
      )}
    </StudySurface>
  );
}
