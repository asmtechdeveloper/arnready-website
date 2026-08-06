'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { appShell, chapters as chaptersCopy, mistakes as copy, syllabus } from '@/lib/copy';
import { useAuth } from '@/lib/authStore';
import { isFirebaseConfigured } from '@/lib/firebaseClient';
import {
  getActiveMistakes,
  loadMistakeQuestions,
  type MistakeQuestion,
} from '@/lib/mistakesService';
import { firestoreBackend } from '@/lib/progressBackend';
import { fetchQuestionById } from '@/lib/questionDelivery';
import { Arnie } from '@/components/Arnie';
import { MistakesPlayer } from '@/components/MistakesPlayer';
import { SignInButton } from '@/components/SignInButton';

/**
 * `/app/mistakes` client surface (M6) — the learner's own wrong answers,
 * re-attempted. Two views on one route:
 *
 *   - no (or invalid) `?chapter=` → the chapter PICKER: one seam read of the
 *     active deck, grouped by chapter, rendering ONLY chapters that hold
 *     active mistakes (count + the app's "Fix your mistakes" entry, chapter
 *     titles from `syllabus.chapters` — the ChapterModeLauncher grid idiom).
 *     An all-clear deck is the EARNED empty state: Arnie proud, the app's
 *     empty copy, and a quiet way back — a celebration the learner worked for.
 *   - `?chapter=N` → the deck run: `loadMistakeQuestions` (per-document gets
 *     via the injected `fetchQuestionById` — the rules constraint lives on
 *     that function) mounting `MistakesPlayer`; an empty chapter deck shows
 *     the same earned state with a link back to the picker.
 *
 * ZERO NUDGES AND ZERO ENTITLEMENT, structurally (manual §1: the mistakes
 * deck is a zero-nudge surface): no nudge machinery is imported, no gate is
 * consulted, and this file never names the paid flag or touches the
 * entitlement store — the deck is identical for both tiers, so there is
 * nothing to branch on. Pinned by test/mistakesPlayer.test.tsx's source scan.
 *
 * Failed reads DEGRADE QUIETLY to an empty list — the app's own
 * `getActiveMistakes` catch ("surfaces degrade quietly"), ported in
 * src/lib/mistakesService.ts — so this surface has no error/retry state; the
 * auth/unconfigured/loading chrome mirrors MockSurface exactly.
 */

const wrapper = 'mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop';
const wrapperWide = 'mx-auto max-w-content px-gutter-mobile py-12 sm:px-gutter-desktop';
const card = 'rounded-card bg-white p-8 text-center shadow-card sm:p-11';
const primaryLink =
  'inline-flex min-h-11 items-center rounded-pill bg-purple px-6 text-sm font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark';
const pill =
  'flex min-h-11 min-w-[44px] items-center justify-center rounded-pill border border-line px-4 text-sm font-semibold text-ink hover:border-purple hover:text-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple';

const syllabusChapterCount = syllabus.chapters.length;

/** `?chapter=` must be an integer 1..12 — same rule as `StudySurface`'s
 * module-private parser: anything else falls back to the PICKER, never a
 * guess at chapter 1. */
function parseChapter(raw: string | null): number | null {
  if (raw == null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > syllabusChapterCount) return null;
  return n;
}

/** A settled load, tagged with the chapter it answers — a stale result is
 * never mistaken for the current view (the SettledResult discipline the
 * other surfaces use). */
type Loaded =
  | { kind: 'picker'; chapterKey: null; counts: Map<number, number> }
  | { kind: 'deck'; chapterKey: number; questions: MistakeQuestion[] };

export function MistakesSurface() {
  const searchParams = useSearchParams();
  const chapter = parseChapter(searchParams.get('chapter'));
  const user = useAuth((s) => s.user);

  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (user == null) return;
    let cancelled = false;
    (async (): Promise<Loaded> => {
      // A null backend (Firebase unavailable mid-session) degrades to the
      // empty list, exactly as the app's signed-out/offline read does.
      const backend = firestoreBackend();
      if (chapter === null) {
        const active = backend ? await getActiveMistakes(backend) : [];
        const counts = new Map<number, number>();
        for (const m of active) {
          // Picker navigation is per-chapter; an entry with no chapter (the
          // app tolerates `chapter ?? null`) has no card to live on. The
          // chapter-scoped deck load excludes it identically.
          if (m.chapter == null) continue;
          counts.set(m.chapter, (counts.get(m.chapter) ?? 0) + 1);
        }
        return { kind: 'picker', chapterKey: null, counts };
      }
      const questions = backend
        ? await loadMistakeQuestions(backend, fetchQuestionById, chapter)
        : [];
      return { kind: 'deck', chapterKey: chapter, questions };
    })().then((outcome) => {
      if (!cancelled) setLoaded(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [user, chapter]);

  const current = loaded !== null && loaded.chapterKey === chapter ? loaded : null;

  // ── Auth chrome — the exact states MockSurface/StudySurface already ship ──
  if (!isFirebaseConfigured()) {
    return (
      <div className={wrapper}>
        <div className={card}>
          <h1 className="text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {appShell.unavailable.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">{appShell.unavailable.body}</p>
          <Link href={appShell.unavailable.browse.href} className={`mt-6 ${primaryLink}`}>
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

  if (current === null) {
    return (
      <div className={wrapper}>
        <div className={card} role="status">
          <p className="text-[0.95rem] leading-7 text-muted">{copy.loading}</p>
        </div>
      </div>
    );
  }

  // ── The earned empty state — all clear, or one chapter clear ─────────────
  const allClear = current.kind === 'picker' && current.counts.size === 0;
  const chapterClear = current.kind === 'deck' && current.questions.length === 0;
  if (allClear || chapterClear) {
    const back = allClear ? copy.empty.back : copy.emptyChapter.back;
    return (
      <div className={wrapper}>
        <div className={card}>
          <Arnie mood={copy.empty.mood} size={140} className="mx-auto" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {copy.empty.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">
            {allClear ? copy.empty.body : copy.emptyChapter.body}
          </p>
          <Link href={back.href} className={`mt-6 ${primaryLink}`}>
            {back.label}
          </Link>
        </div>
      </div>
    );
  }

  // ── The deck run ─────────────────────────────────────────────────────────
  if (current.kind === 'deck') {
    return (
      <div data-testid="mistakes-player-slot">
        <MistakesPlayer chapter={current.chapterKey} questions={current.questions} />
      </div>
    );
  }

  // ── The picker — only chapters holding active mistakes ───────────────────
  return (
    <div className={wrapperWide}>
      <div className="mx-auto max-w-reading">
        <div className={card}>
          <h1 className="text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {copy.picker.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">{copy.picker.body}</p>
        </div>
      </div>
      <section className="mt-10" aria-label={copy.picker.gridLabel}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {syllabus.chapters.map((title, i) => {
            const chapterNumber = i + 1;
            const count = current.counts.get(chapterNumber);
            if (!count) return null;
            return (
              <li key={chapterNumber} className="rounded-card bg-white p-4 text-left shadow-card">
                <p className="text-xs font-bold uppercase tracking-wide text-purple">
                  {chaptersCopy.hub.chapterLabel} {chapterNumber}
                </p>
                <p className="mt-1 text-[0.95rem] font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm font-semibold text-muted">{copy.picker.countLabel(count)}</p>
                <div className="mt-3">
                  <Link href={`/app/mistakes?chapter=${chapterNumber}`} className={pill}>
                    {copy.picker.cta}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
