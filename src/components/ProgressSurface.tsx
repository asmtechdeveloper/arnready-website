'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { appShell, mockSurface, progress as copy, syllabus } from '@/lib/copy';
import { useAuth } from '@/lib/authStore';
import { isFirebaseConfigured } from '@/lib/firebaseClient';
import { MOCK_CHAPTER_WEIGHTS, MOCK_QUESTIONS } from '@/lib/mockConfig';
import { getMockHistory, type MockHistoryEntry } from '@/lib/mockService';
import { firestoreBackend } from '@/lib/progressBackend';
import { getChapterProgress, type ProgressBlob } from '@/lib/progressService';
import { Arnie } from '@/components/Arnie';
import { Icon } from '@/components/Icon';
import { SignInButton } from '@/components/SignInButton';

/**
 * `/app/progress` client surface (M6) — the read-only progress view, ported
 * from ../ARNReady-App/screens/ChapterListScreen.js (the chapter rows) plus
 * the mock-history block of the app's PreMock screen.
 *
 * THE DISPLAY LAW (app ChapterRow + manual §1 "Never compare the two on one
 * surface"): per chapter, readiness is the FULL-exam lastPercentage ONLY — a
 * presence check (`fullPct != null`), so a 0% full exam COUNTS as readiness.
 * A chapter without a full exam shows a NEUTRAL activity line instead:
 * sample ('Free sample: {score}/{total}' — the blob's LOCKED lastScore/
 * lastTotal denominator pair, never the served count), else practised, else
 * not started. Full readiness and sample accuracy never share a row, and the
 * progress bar fills only when full readiness exists.
 *
 * DECLARED NARROWING: the app colours full-exam readiness with the
 * Prepometer 7-zone colour scale; the web has no Prepometer port (the same
 * narrowing the M6 mock results block records). The readiness pct and bar
 * render in the purple token, neutral statusText in ink/muted — no zone
 * colours, no zone labels, no readiness claims beyond the honest pct.
 *
 * DATA: 12 parallel `getChapterProgress(backend, n)` calls issued HERE — the
 * app's `getAllChapterProgress` is exactly that loop, and doing it in the
 * surface keeps the parity-pinned M4 service untouched. A null backend (or
 * any failed read inside the service) yields null blobs, so every chapter
 * renders as never-started: a failed read reads as "no progress yet" — the
 * M4 declared deviation (progressService.ts header), never stale data.
 *
 * The mock-history rows DUPLICATE MockSurface's few presentation lines
 * (formatDate + the <ol> rows) rather than extracting a shared component —
 * MockSurface is an earlier M6 step this step must not rework; the strings
 * themselves stay shared through `mockSurface` copy, so wording cannot
 * drift. Stored history is oldest-first; rendered newest-first, exactly as
 * MockSurface reverses it.
 *
 * READ-ONLY: no recording, no writes, no entitlement — this file never
 * names the paid flag or touches the entitlement store (pinned by
 * test/progressSurface.test.tsx's source scan); the auth/unconfigured/
 * loading chrome mirrors MistakesSurface exactly.
 */

const wrapper = 'mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop';
const card = 'rounded-card bg-white p-8 text-center shadow-card sm:p-11';
const primaryLink =
  'inline-flex min-h-11 items-center rounded-pill bg-purple px-6 text-sm font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark';

/** en-IN short date — duplicated from MockSurface.tsx (see header). */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Loaded {
  /** Index 0 → chapter 1. Null blob = no progress (or no backend). */
  blobs: (ProgressBlob | null)[];
  /** Newest first (stored order reversed, the MockSurface idiom). */
  history: MockHistoryEntry[];
}

export function ProgressSurface() {
  const user = useAuth((s) => s.user);

  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (user == null) return;
    let cancelled = false;
    (async (): Promise<Loaded> => {
      const backend = firestoreBackend();
      // Firebase unavailable mid-session: every chapter reads as "no
      // progress yet" (the service's own null answer — M4 declared
      // deviation) and the mock section shows its quiet empty line.
      if (!backend) return { blobs: syllabus.chapters.map(() => null), history: [] };
      const [blobs, history] = await Promise.all([
        Promise.all(syllabus.chapters.map((_, i) => getChapterProgress(backend, i + 1))),
        getMockHistory(backend),
      ]);
      return { blobs, history: [...history].reverse() };
    })().then((outcome) => {
      if (!cancelled) setLoaded(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ── Auth chrome — the exact states MistakesSurface already ships ─────────
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

  if (loaded === null) {
    return (
      <div className={wrapper}>
        <div className={card} role="status">
          <p className="text-[0.95rem] leading-7 text-muted">{copy.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{copy.title}</h1>
        <p className="mt-3 text-[0.95rem] leading-7 text-muted">{copy.intro}</p>
      </header>

      {/* ── Chapter rows — the app's scannable ChapterRow, ported ─────────── */}
      <section aria-label={copy.listLabel} className="mt-8">
        <ol className="flex flex-col gap-3">
          {syllabus.chapters.map((title, i) => {
            const chapterNumber = i + 1;
            const weight = MOCK_CHAPTER_WEIGHTS[chapterNumber] ?? 0;
            const blob = loaded.blobs[i];
            // Presence check — a 0% full exam counts as readiness (app
            // ChapterRow: `progress?.fullPct != null`).
            const fullPct =
              typeof blob?.full?.lastPercentage === 'number' ? blob.full.lastPercentage : null;
            const hasFull = fullPct != null;
            const statusText = hasFull
              ? copy.readiness(fullPct)
              : blob?.sample != null
                ? copy.sampleActivity(blob.sample.lastScore, blob.sample.lastTotal)
                : (blob?.practiced ?? 0) > 0
                  ? copy.practiceActivity(blob?.practiced ?? 0)
                  : copy.notStarted;
            return (
              <li key={chapterNumber}>
                <Link
                  href={`/app/practice?chapter=${chapterNumber}`}
                  aria-label={copy.rowA11y(chapterNumber, title, weight, statusText)}
                  className="flex items-center gap-3.5 rounded-card bg-white p-4 shadow-card hover:outline hover:outline-1 hover:outline-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-purple-soft text-sm font-extrabold text-purple">
                    {String(chapterNumber).padStart(2, '0')}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.95rem] font-semibold text-ink">{title}</span>
                      <span className="rounded-pill bg-purple-soft px-2 py-0.5 text-xs font-bold text-purple">
                        {copy.weightChip(weight)}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        data-testid={`progress-bar-${chapterNumber}`}
                        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-line"
                      >
                        {/* The bar fills ONLY on full-exam readiness — never
                            on sample or practice activity. Purple token, not
                            a zone colour (declared narrowing, header). */}
                        {hasFull && (
                          <span
                            data-testid={`progress-bar-fill-${chapterNumber}`}
                            className="block h-full rounded-pill bg-purple"
                            style={{ width: `${Math.min(fullPct, 100)}%` }}
                          />
                        )}
                      </span>
                      <span
                        className={
                          hasFull ? 'text-sm font-extrabold text-purple' : 'text-sm text-muted'
                        }
                      >
                        {statusText}
                      </span>
                    </span>
                  </span>
                  <Icon name="chevron-right" size={20} className="shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Mock history — MockSurface's row presentation, duplicated ─────── */}
      <section aria-label={copy.mockHistory.heading} className="mt-10">
        <h2 className="text-base font-extrabold text-ink">{copy.mockHistory.heading}</h2>
        {loaded.history.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-muted">
            {copy.mockHistory.empty.text}{' '}
            <Link
              href={copy.mockHistory.empty.link.href}
              className="font-semibold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
            >
              {copy.mockHistory.empty.link.label}
            </Link>
          </p>
        ) : (
          <ol className="mt-3 rounded-card bg-white p-5 shadow-card">
            {loaded.history.map((h, i) => (
              <li
                key={`${h.date}-${i}`}
                className={`flex items-center gap-3.5 ${i > 0 ? 'mt-2.5 border-t border-line pt-2.5' : ''}`}
              >
                <span className="min-w-16 text-base font-extrabold text-purple">
                  {h.score} / {h.total ?? MOCK_QUESTIONS}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs font-semibold text-muted">{formatDate(h.date)}</span>
                  <span className="text-xs leading-4 text-muted">
                    {Array.isArray(h.weakChapters) && h.weakChapters.length > 0
                      ? mockSurface.historyWeak(h.weakChapters.map((ch) => `Ch ${ch}`).join(', '))
                      : mockSurface.historyNoWeak}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
