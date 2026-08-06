import type { Metadata } from 'next';
import { Suspense } from 'react';

import { progress } from '@/lib/copy';
import { ProgressSurface } from '@/components/ProgressSurface';
import { StudySurfaceFallback } from '@/components/StudySurfaceFallback';

/**
 * `/app/progress` — the read-only progress surface (M6): chapter readiness
 * (full-exam only), neutral activity lines, and mock-test history. Records
 * nothing; a ZERO-NUDGE surface (manual §1: progress is nudge-free).
 *
 * Not indexable, same as `/app` (manual §1 lists only public pages). Static
 * export renders the Suspense fallback; the client surface resolves auth and
 * progress on load.
 */
export const metadata: Metadata = {
  title: progress.meta.title,
  description: progress.meta.description,
  robots: { index: false, follow: false },
};

export default function ProgressPage() {
  return (
    <Suspense fallback={<StudySurfaceFallback />}>
      <ProgressSurface />
    </Suspense>
  );
}
