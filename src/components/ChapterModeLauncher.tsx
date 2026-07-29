import Link from 'next/link';

import { chapters, studyLauncher, syllabus } from '@/lib/copy';

/**
 * The chapter × mode grid (M5 plan D2): 12 chapters, each linking to
 * practice / exam / flashcards with the right `?chapter=` value.
 *
 * Shared by two entry points — the `/app` signed-in launcher
 * (`AppShell.tsx`) and `StudySurface`'s invalid-chapter picker — so there is
 * one grid, never two copies that could drift apart on a chapter number or a
 * route shape (manual §0.10 in spirit: no second definition of the same
 * mapping).
 *
 * Chapter titles come from `syllabus.chapters` (`src/lib/copy.ts`) — the
 * same source the chapter hub pages already use (`chapterTitle()` in
 * `src/app/chapters/[chapter]/page.tsx`) — never a second hardcoded list.
 * No progress/resume/score data: that is M6.
 */
export function ChapterModeLauncher() {
  const pill =
    'flex min-h-11 min-w-[44px] items-center justify-center rounded-pill border border-line px-4 text-sm font-semibold text-ink hover:border-purple hover:text-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple';

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {syllabus.chapters.map((title, i) => {
        const chapter = i + 1;
        return (
          <li key={chapter} className="rounded-card bg-white p-4 text-left shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-purple">
              {chapters.hub.chapterLabel} {chapter}
            </p>
            <p className="mt-1 text-[0.95rem] font-semibold text-ink">{title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/app/practice?chapter=${chapter}`} className={pill}>
                {studyLauncher.modes.practice}
              </Link>
              <Link href={`/app/exam?chapter=${chapter}`} className={pill}>
                {studyLauncher.modes.exam}
              </Link>
              <Link href={`/app/flashcards?chapter=${chapter}`} className={pill}>
                {studyLauncher.modes.flashcards}
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
