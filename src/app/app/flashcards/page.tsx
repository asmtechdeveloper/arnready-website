import type { Metadata } from 'next';
import { Suspense } from 'react';

import { studySurface } from '@/lib/copy';
import { FlashcardsSurface } from '@/components/FlashcardsSurface';
import { StudySurfaceFallback } from '@/components/StudySurfaceFallback';

/**
 * `/app/flashcards?chapter=<1-12>` (M5 plan D1).
 *
 * Not indexable, same as `/app`. Static export renders the Suspense
 * fallback; the client surface resolves params and auth on load. No player
 * yet — see `FlashcardsSurface`'s doc comment.
 */
export const metadata: Metadata = {
  title: studySurface.flashcards.meta.title,
  description: studySurface.flashcards.meta.description,
  robots: { index: false, follow: false },
};

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<StudySurfaceFallback />}>
      <FlashcardsSurface />
    </Suspense>
  );
}
