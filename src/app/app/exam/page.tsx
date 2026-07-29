import type { Metadata } from 'next';
import { Suspense } from 'react';

import { studySurface } from '@/lib/copy';
import { ExamSurface } from '@/components/ExamSurface';
import { StudySurfaceFallback } from '@/components/StudySurfaceFallback';

/**
 * `/app/exam?chapter=<1-12>` (M5 plan D1).
 *
 * Not indexable, same as `/app`. Static export renders the Suspense
 * fallback; the client surface resolves params and auth on load. No player
 * yet — see `ExamSurface`'s doc comment.
 */
export const metadata: Metadata = {
  title: studySurface.exam.meta.title,
  description: studySurface.exam.meta.description,
  robots: { index: false, follow: false },
};

export default function ExamPage() {
  return (
    <Suspense fallback={<StudySurfaceFallback />}>
      <ExamSurface />
    </Suspense>
  );
}
