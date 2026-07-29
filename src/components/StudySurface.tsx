'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';

import { appShell, studyLauncher, studySurface, syllabus } from '@/lib/copy';
import { useAuth } from '@/lib/authStore';
import { isFirebaseConfigured } from '@/lib/firebaseClient';
import { Arnie } from '@/components/Arnie';
import { ChapterModeLauncher } from '@/components/ChapterModeLauncher';
import { SignInButton } from '@/components/SignInButton';

/**
 * The result shape every `load` function passed to `StudySurface` returns —
 * a normalized view over `questionDelivery.ts`'s `QuestionsResult` /
 * `DeckResult` (M5 plan D3): `status:'ok'` carries the caller's own payload
 * type, `status:'error'` carries the same `reason` questionDelivery already
 * produces. A failed read is an ERROR, never an empty surface (D3) — this
 * type makes "the read failed" and "this chapter genuinely has nothing"
 * impossible to confuse, exactly as questionDelivery's own union does.
 */
export type DeliveryResult<T> = { status: 'ok'; data: T } | { status: 'error'; reason: string };

/** A settled `load` result, tagged with the request it answers — so a
 * result belonging to a stale chapter/retry attempt is never mistaken for
 * the current one (see `StudySurface`'s `isCurrent` check). */
type SettledResult<T> = { chapter: number; attempt: number } & DeliveryResult<T>;

const wrapper = 'mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop';
const wrapperWide = 'mx-auto max-w-content px-gutter-mobile py-12 sm:px-gutter-desktop';
const card = 'rounded-card bg-white p-8 text-center shadow-card sm:p-11';

// `syllabus.chapters.length` (12) — the same chapter-count source the
// launcher grid uses (`ChapterModeLauncher`), never a second hardcoded 12.
const syllabusChapterCount = syllabus.chapters.length;

/** `?chapter=` must be an integer 1..12 — never a guess, never a default. */
function parseChapter(raw: string | null): number | null {
  if (raw == null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > syllabusChapterCount) return null;
  return n;
}

/**
 * Shared auth/param/loading/error chrome for `/app/practice`, `/app/exam`,
 * and `/app/flashcards` (M5 plan D1–D3, S3). Every one of the three routes
 * renders through this component, in this order, before any study content:
 *
 *   1. Firebase unconfigured / auth loading / signed out — reusing the
 *      exact same states `AppShell.tsx` already ships (M3), never a second
 *      visual language for them.
 *   2. Invalid or missing `?chapter=` — the same chapter × mode picker the
 *      `/app` launcher uses (`ChapterModeLauncher`), never a throw, a guess,
 *      or a silent fall-back to chapter 1.
 *   3. Loading the chapter's content, and an ERROR state (with retry) when
 *      `load` resolves `{status:'error'}` — a failed read is an error,
 *      never an empty surface.
 *
 * Only once all of the above are clear does `children` — the slot S4–S6
 * mount the real players into — render at all. No gate/nudge wiring and no
 * question rendering happen here; that is S4–S6's scope.
 */
export function StudySurface<T>({
  chapterParam,
  loadingLabel,
  load,
  children,
}: {
  /** Raw `?chapter=` value from `useSearchParams().get('chapter')`. */
  chapterParam: string | null;
  /** Shown while `load` is in flight (per-mode copy: D3). */
  loadingLabel: string;
  /** Fetches this chapter's content. Re-invoked by the retry affordance. */
  load: (chapter: number) => Promise<DeliveryResult<T>>;
  /** The S4–S6 player slot — rendered only once auth, chapter, and content
   * have all resolved cleanly. */
  children: (ctx: { chapter: number; data: T; reload: () => void }) => ReactNode;
}) {
  const user = useAuth((s) => s.user);
  const chapter = parseChapter(chapterParam);

  // `attempt` is bumped only by the retry affordance, below — an event
  // handler, not an effect, so incrementing it there is an ordinary state
  // update, not a synchronous setState-in-effect.
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<SettledResult<T> | null>(null);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  // The effect only SUBSCRIBES to the outcome of `load` and applies it when
  // it resolves — the async continuation, not the effect body itself, is
  // where `setResult` runs. "Loading" is never set directly here; it is
  // DERIVED below from whether `result` still answers the current request.
  useEffect(() => {
    if (chapter === null || user == null) return;
    let cancelled = false;
    load(chapter).then((outcome) => {
      if (!cancelled) setResult({ chapter, attempt, ...outcome });
    });
    return () => {
      cancelled = true;
    };
  }, [chapter, user, load, attempt]);

  const isCurrent = result !== null && result.chapter === chapter && result.attempt === attempt;
  const current = isCurrent ? result : null;

  if (!isFirebaseConfigured()) {
    return (
      <div className={wrapper}>
        <div className={card}>
          <h1 className="text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {appShell.unavailable.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">{appShell.unavailable.body}</p>
          <Link
            href={appShell.unavailable.browse.href}
            className="mt-6 inline-flex min-h-11 items-center rounded-pill bg-purple px-6 text-sm font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark"
          >
            {appShell.unavailable.browse.label}
          </Link>
        </div>
      </div>
    );
  }

  if (user === undefined) {
    return (
      <div className={wrapper}>
        <div className={card} role="status">
          <p className="text-[0.95rem] leading-7 text-muted">{appShell.loading}</p>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className={wrapper}>
        <div className={card}>
          <Arnie mood={appShell.signedOut.mood} size={140} className="mx-auto" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {appShell.signedOut.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">{appShell.signedOut.body}</p>
          <div className="mt-6 flex flex-col items-center gap-4">
            <SignInButton />
            <Link
              href={appShell.signedOut.browseInstead.href}
              className="flex min-h-11 items-center text-sm font-semibold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
            >
              {appShell.signedOut.browseInstead.label}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (chapter === null) {
    return (
      <div className={wrapperWide}>
        <div className="mx-auto max-w-reading">
          <div className={card}>
            <h1 className="text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
              {studySurface.pickChapter.title}
            </h1>
            <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">{studySurface.pickChapter.body}</p>
          </div>
        </div>
        <section className="mt-10" aria-label={studyLauncher.heading}>
          <ChapterModeLauncher />
        </section>
      </div>
    );
  }

  if (current?.status === 'error') {
    return (
      <div className={wrapper}>
        <div className={card} role="alert">
          <h1 className="text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {studySurface.error.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">{studySurface.error.body}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-6 inline-flex min-h-11 items-center rounded-pill bg-purple px-6 text-sm font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark"
          >
            {studySurface.error.retry}
          </button>
        </div>
      </div>
    );
  }

  if (current?.status !== 'ok') {
    return (
      <div className={wrapper}>
        <div className={card} role="status">
          <p className="text-[0.95rem] leading-7 text-muted">{loadingLabel}</p>
        </div>
      </div>
    );
  }

  return <>{children({ chapter, data: current.data, reload: retry })}</>;
}
