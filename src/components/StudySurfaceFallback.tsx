import { appShell } from '@/lib/copy';

/**
 * Suspense fallback for the three study-surface routes. Under
 * `output: 'export'`, `useSearchParams` requires a `<Suspense>` boundary;
 * this is what renders for the brief moment before the client surface
 * (`PracticeSurface` / `ExamSurface` / `FlashcardsSurface`) takes over —
 * effectively instantaneous, but never a blank page.
 */
export function StudySurfaceFallback() {
  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      <div className="rounded-card bg-white p-8 text-center shadow-card sm:p-11" role="status">
        <p className="text-[0.95rem] leading-7 text-muted">{appShell.loading}</p>
      </div>
    </div>
  );
}
