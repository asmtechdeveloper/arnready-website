import type { Metadata } from 'next';
import { Suspense } from 'react';

import { mockSurface } from '@/lib/copy';
import { MockSurface } from '@/components/MockSurface';
import { StudySurfaceFallback } from '@/components/StudySurfaceFallback';

/**
 * `/app/mock` — the full mock test (M6): pre-start eligibility surface
 * (PreMock parity), then the timed 100-question run (`MockPlayer`).
 *
 * Not indexable, same as `/app` (manual §1 lists only public pages). Static
 * export renders the Suspense fallback; the client surface resolves auth and
 * eligibility on load.
 */
export const metadata: Metadata = {
  title: mockSurface.meta.title,
  description: mockSurface.meta.description,
  robots: { index: false, follow: false },
};

export default function MockPage() {
  return (
    <Suspense fallback={<StudySurfaceFallback />}>
      <MockSurface />
    </Suspense>
  );
}
