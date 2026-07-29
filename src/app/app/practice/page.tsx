import type { Metadata } from 'next';
import { Suspense } from 'react';

import { studySurface } from '@/lib/copy';
import { PracticeSurface } from '@/components/PracticeSurface';
import { StudySurfaceFallback } from '@/components/StudySurfaceFallback';

/**
 * `/app/practice?chapter=<1-12>&q=<1-based, default 1>` (M5 plan D1).
 *
 * Not indexable, same as `/app` (manual §1 lists only public pages). Static
 * export renders the Suspense fallback; the client surface resolves params
 * and auth on load. No player yet — see `PracticeSurface`'s doc comment.
 */
export const metadata: Metadata = {
  title: studySurface.practice.meta.title,
  description: studySurface.practice.meta.description,
  robots: { index: false, follow: false },
};

export default function PracticePage() {
  return (
    <Suspense fallback={<StudySurfaceFallback />}>
      <PracticeSurface />
    </Suspense>
  );
}
