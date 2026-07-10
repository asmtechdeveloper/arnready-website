'use client';

/**
 * Progress — read-only view over the SAME documents the app writes:
 * users/{uid}/chapterProgress (exam aggregates + practice counter) and
 * users/{uid}.mockHistory. Displays only values the locked engine recorded
 * (lastPercentage, best raw score) — never re-derives scoring.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Arnie from '@/components/Arnie';
import SignInButton from '@/components/app/SignInButton';
import { CONFIG } from '@/lib/config';
import { getMockHistory, type MockHistoryEntry } from '@/lib/mockService';
import { getAllChapterProgress } from '@/lib/progressService';
import type { ProgressBlob } from '@/lib/progressShapes';
import { useAuth } from '@/lib/stores';

export default function ProgressView() {
  const { user, ready } = useAuth();
  const [progress, setProgress] = useState<Record<number, ProgressBlob> | null>(null);
  const [mocks, setMocks] = useState<MockHistoryEntry[] | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    getAllChapterProgress(CONFIG.CHAPTERS.map((c) => c.id)).then(setProgress);
    getMockHistory().then(setMocks);
  }, [ready, user]);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <Arnie mood="thinking" size={140} className="mx-auto" />
          <h1 className="mt-6 text-2xl font-black text-ink">
            Progress needs somewhere to live
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            You can study everything here without an account — but scores,
            streaks, and your mistakes deck only persist once you sign in.
            One Google tap, shared with the app.
          </p>
          <div className="mt-6 flex justify-center">
            <SignInButton label="Sign in with Google" />
          </div>
        </div>
      </div>
    );
  }

  if (progress === null || mocks === null) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <Arnie mood="working" size={120} className="mx-auto" />
          <p className="mt-4 text-sm font-bold text-muted">Adding it all up…</p>
        </div>
      </div>
    );
  }

  const rows = CONFIG.CHAPTERS.map((c) => ({ meta: c, blob: progress[c.id] ?? null }));
  const attemptedChapters = rows.filter((r) => (r.blob?.attempts ?? 0) > 0);
  const totalPracticed = rows.reduce((sum, r) => sum + (r.blob?.practiced ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-black text-ink">Your progress</h1>
      <p className="mt-2 text-sm text-muted">
        Same numbers as the app — one account, one record.
      </p>

      {/* Summary strip */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          [String(attemptedChapters.length), `of ${CONFIG.TOTAL_CHAPTERS} chapters examined`],
          [String(totalPracticed), 'practice questions answered'],
          [String(mocks.length), mocks.length === 1 ? 'mock taken' : 'mocks taken'],
        ].map(([n, label]) => (
          <div key={label} className="rounded-card bg-white p-5 text-center shadow-card">
            <p className="text-2xl font-black text-purple">{n}</p>
            <p className="mt-1 text-xs font-bold text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* Chapters */}
      <h2 className="mt-10 text-lg font-black text-ink">Chapter exams</h2>
      <div className="mt-3 space-y-2">
        {rows.map(({ meta, blob }) => {
          const pct = blob?.lastPercentage ?? 0;
          const hasRun = (blob?.attempts ?? 0) > 0;
          return (
            <div key={meta.id} className="rounded-card bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/app/exam/${meta.id}`}
                  className="min-w-0 truncate text-sm font-black text-ink hover:text-purple"
                >
                  {meta.id}. {meta.title}
                </Link>
                {hasRun ? (
                  <p className="shrink-0 text-xs font-bold text-muted">
                    last{' '}
                    <span
                      className={`font-black ${
                        pct >= CONFIG.WEAK_CHAPTER_THRESHOLD_PCT ? 'text-green' : 'text-amber'
                      }`}
                    >
                      {pct}%
                    </span>
                    {' · '}best {blob!.bestScore}/{blob!.bestTotal}
                    {' · '}
                    {blob!.attempts} attempt{blob!.attempts === 1 ? '' : 's'}
                  </p>
                ) : (
                  <p className="shrink-0 text-xs font-bold text-muted">not attempted yet</p>
                )}
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-cream">
                <div
                  className={`h-full rounded-full ${
                    pct >= CONFIG.WEAK_CHAPTER_THRESHOLD_PCT ? 'bg-green' : 'bg-amber'
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Mock history */}
      <h2 className="mt-10 text-lg font-black text-ink">Mock tests</h2>
      {mocks.length === 0 ? (
        <div className="mt-3 rounded-card bg-white p-6 shadow-card">
          <p className="text-sm font-bold text-muted">
            No mocks yet.{' '}
            <Link href="/app/mock" className="font-black text-purple hover:underline">
              Your free one is waiting
            </Link>{' '}
            — take it when you can give it the full two hours.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {[...mocks].reverse().map((m, i) => (
            <div
              key={`${m.date}-${i}`}
              className="flex items-center justify-between rounded-card bg-white p-4 shadow-card"
            >
              <p className="text-sm font-bold text-muted">
                {new Date(m.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p className="text-sm font-bold text-muted">
                <span
                  className={`font-black ${
                    m.percentage >= CONFIG.MOCK_PASS_MARK ? 'text-green' : 'text-amber'
                  }`}
                >
                  {m.percentage}%
                </span>{' '}
                · {m.score}/{m.total}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
