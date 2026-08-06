import type { Metadata } from 'next';
import { Suspense } from 'react';

import { mistakes } from '@/lib/copy';
import { MistakesSurface } from '@/components/MistakesSurface';
import { StudySurfaceFallback } from '@/components/StudySurfaceFallback';

/**
 * `/app/mistakes?chapter=<1-12, optional>` — the mistakes deck (M6): chapter
 * picker without the param, the re-attempt run with it. A ZERO-NUDGE surface
 * (manual §1).
 *
 * Not indexable, same as `/app` (manual §1 lists only public pages). Static
 * export renders the Suspense fallback; the client surface resolves params
 * and auth on load.
 */
export const metadata: Metadata = {
  title: mistakes.meta.title,
  description: mistakes.meta.description,
  robots: { index: false, follow: false },
};

export default function MistakesPage() {
  return (
    <Suspense fallback={<StudySurfaceFallback />}>
      <MistakesSurface />
    </Suspense>
  );
}
