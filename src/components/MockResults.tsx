'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { mockResults as copy, syllabus } from '@/lib/copy';
import { MOCK_CHAPTER_WEIGHTS, MOCK_PASS_MARK, MOCK_PASS_MARGIN } from '@/lib/mockConfig';
import { getMockHistory, type MockHistoryEntry } from '@/lib/mockService';
import { firestoreBackend } from '@/lib/progressBackend';
import { Arnie } from '@/components/Arnie';
import { Icon, type IconName } from '@/components/Icon';

/**
 * The mock RESULTS block (M6) — rendered by `MockPlayer` after submit, ported
 * from the app's ResultsScreen mock branch
 * (../ARNReady-App/screens/ResultsScreen.js:371-523).
 *
 * READ-ONLY by design: the attempt was recorded by the player on submit
 * (app parity — "Results only reads the persisted history for stats"), so
 * this block holds no write path at all. History is read on mount with the
 * app's exact fallbacks: an empty history (or a null backend) falls back to
 * the current attempt's score for every stat.
 *
 * THE PREMIUM PITCH (the milestone's inherited M2-B1 obligation) renders for
 * free users ONLY, after the run — never during it. Nudge law: it pitches
 * what premium ADDS (unlimited mocks, a fresh weighted paper, the full
 * bank), never relief from the one-free-mock limit. `isPaid` is read here
 * for exactly that visibility choice — never derived, never sourced from
 * Firestore or the store (test/isPaidDiscipline.test.ts pins this).
 *
 * DECLARED NARROWINGS from the app screen (packet §deviations): the
 * Prepometer zone label + animated gauge are not ported (Prepometer is app
 * machinery the web has not built), and the score-banded Arnie ladder stays
 * an M7 polish decision, exactly as the M5 packet records for exam results —
 * one calm Arnie, no unearned celebration.
 */

/** h:mm:ss, ported from ResultsScreen.js `formatDuration` (null → em dash). */
function formatDuration(secs: number | null | undefined): string {
  if (secs == null) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const quietLink =
  'flex min-h-11 items-center justify-center text-sm font-semibold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple';
const primaryAction =
  'flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-purple px-6 text-base font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark';

export function MockResults({
  score,
  total,
  percentage,
  timeTaken,
  weakChapters,
  isPaid,
  onRetake,
}: {
  score: number;
  total: number;
  percentage: number;
  timeTaken: number;
  weakChapters: number[];
  isPaid: boolean;
  /** Paid "Take Another Mock" — returns to the pre-start surface (which
   * re-runs the eligibility check, the app's focus-refresh equivalent). */
  onRetake: () => void;
}) {
  const [history, setHistory] = useState<MockHistoryEntry[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // App parity (ResultsScreen.js:203-206): read the persisted history for
  // stats; a failure degrades quietly to the current-score fallbacks below.
  useEffect(() => {
    const backend = firestoreBackend();
    if (!backend) return;
    let alive = true;
    getMockHistory(backend)
      .then((h) => {
        if (alive) setHistory(h);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Stats semantics ported exactly (ResultsScreen.js:134-140): every stat
  // falls back to the current attempt when history is empty.
  const percentages = history.map((h) => h.percentage);
  const bestScore = percentages.length > 0 ? Math.max(...percentages) : percentage;
  const lowestScore = percentages.length > 0 ? Math.min(...percentages) : percentage;
  const averageScore =
    percentages.length > 0
      ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
      : percentage;
  const totalAttempts = history.length > 0 ? history.length : 1;

  // Verdict band (ResultsScreen.js:378-384): calibration, not judgement.
  const verdict =
    percentage >= MOCK_PASS_MARK + MOCK_PASS_MARGIN
      ? { text: copy.verdict.passMargin(MOCK_PASS_MARK), tone: 'text-green' }
      : percentage >= MOCK_PASS_MARK
        ? { text: copy.verdict.passJust(MOCK_PASS_MARK), tone: 'text-amber' }
        : { text: copy.verdict.fail(MOCK_PASS_MARK), tone: 'text-red' };

  // Weightage-aware ordering (ResultsScreen.js:473-474): fixing Ch 9 is worth
  // more marks than fixing Ch 3.
  const weakByWeight = [...weakChapters].sort(
    (a, b) => (MOCK_CHAPTER_WEIGHTS[b] ?? 0) - (MOCK_CHAPTER_WEIGHTS[a] ?? 0),
  );

  const stats: { icon: IconName; label: string; value: string }[] = [
    { icon: 'target', label: copy.stats.attempt, value: copy.stats.outOf(score, total) },
    { icon: 'clock', label: copy.stats.time, value: formatDuration(timeTaken) },
    { icon: 'trending-up', label: copy.stats.best, value: copy.stats.outOf(bestScore, total) },
    { icon: 'trending-down', label: copy.stats.lowest, value: copy.stats.outOf(lowestScore, total) },
    { icon: 'bar-chart-2', label: copy.stats.average, value: copy.stats.outOf(averageScore, total) },
    { icon: 'repeat', label: copy.stats.attempts, value: String(totalAttempts) },
  ];

  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      {/* ── Score hero — one calm Arnie (see the header narrowings) ── */}
      <div className="rounded-card bg-white p-8 text-center shadow-card sm:p-11">
        <Arnie mood={copy.mood} size={120} className="mx-auto" />
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">
          {copy.scoredLabel}
        </p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-purple">
          {copy.scoreLine(score, total)}
        </p>
        <p className={`mx-auto mt-3 max-w-md text-[0.95rem] font-semibold leading-6 ${verdict.tone}`}>
          {verdict.text}
        </p>

        {/* One PRIMARY action per tier: free = the pitch CTA (below); paid =
            retake. Everything else is a quiet link. */}
        {isPaid ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <button type="button" onClick={onRetake} className={primaryAction}>
              <Icon name="target" size={18} />
              <span>{copy.takeAnother}</span>
            </button>
            <Link href={copy.backToStudy.href} className={quietLink}>
              {copy.backToStudy.label}
            </Link>
          </div>
        ) : (
          <div className="mt-8 rounded-card border-l-4 border-purple bg-purple-soft p-5 text-left">
            <p className="text-base font-extrabold text-ink">{copy.pitch.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{copy.pitch.body}</p>
            <div className="mt-4 flex flex-col items-start gap-2.5">
              <Link href={copy.pitch.cta.href} className={`${primaryAction} !w-auto px-8`}>
                {copy.pitch.cta.label}
              </Link>
              <p className="text-xs text-muted">{copy.pitch.webSoon}</p>
              <Link href={copy.pitch.later.href} className={quietLink}>
                {copy.pitch.later.label}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Performance details — collapsed by default (app parity) ── */}
      <button
        type="button"
        onClick={() => setDetailsOpen((open) => !open)}
        aria-expanded={detailsOpen}
        aria-controls="mock-details"
        className="mx-auto mt-6 flex min-h-11 items-center gap-1.5 text-sm font-bold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
      >
        <span>{detailsOpen ? copy.detailsHide : copy.detailsShow}</span>
        <Icon name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={16} />
      </button>

      {detailsOpen && (
        <div id="mock-details" className="mt-4 flex flex-col gap-6">
          <dl className="rounded-card border-l-4 border-purple bg-white p-5 shadow-card">
            {stats.map(({ icon, label, value }, i) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-3 ${i > 0 ? 'mt-3 border-t border-line pt-3' : ''}`}
              >
                <dt className="flex items-center gap-2 text-sm text-muted">
                  <Icon name={icon} size={14} />
                  <span>{label}</span>
                </dt>
                <dd className="text-sm font-extrabold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Weak areas (ResultsScreen.js:466-520): chips at >= 70%, the
              needs-practice card below 70%. Chips go to the chapter's
              flashcards — the web's FlashcardLanding equivalent. */}
          {percentage >= 70 && weakByWeight.length > 0 ? (
            <section aria-label={copy.weak.heading}>
              <div className="flex items-center gap-2">
                <Icon name="alert-triangle" size={14} className="text-purple" />
                <h2 className="text-base font-extrabold text-ink">{copy.weak.heading}</h2>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2.5">
                {weakByWeight.map((ch) => (
                  <li key={ch}>
                    <Link
                      href={`/app/flashcards?chapter=${ch}`}
                      className="flex min-h-11 items-center gap-1.5 rounded-pill bg-purple px-4 text-sm font-semibold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark"
                    >
                      <span>
                        {copy.weak.chip(ch, syllabus.chapters[ch - 1] ?? '', MOCK_CHAPTER_WEIGHTS[ch] ?? 0)}
                      </span>
                      <Icon name="chevron-right" size={14} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : percentage < 70 ? (
            <section className="rounded-card bg-purple-soft p-5">
              <h2 className="text-sm font-extrabold text-ink">{copy.weak.needsPractice}</h2>
              <p className="mt-1.5 text-sm leading-6 text-muted">{copy.weak.needsPracticeBody}</p>
              <Link
                href={copy.weak.needsPracticeLink.href}
                className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
              >
                <span>{copy.weak.needsPracticeLink.label}</span>
                <Icon name="chevron-right" size={14} />
              </Link>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
