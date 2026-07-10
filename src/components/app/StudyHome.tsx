'use client';

/**
 * The study room — chapter grid with live per-account progress when signed
 * in (Firestore-first with localStorage cache, same docs as the app).
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Arnie from '@/components/Arnie';
import { BookOpen, Layers, Monitor, Zap } from '@/components/Icon';
import { CONFIG } from '@/lib/config';
import { getAllChapterProgress } from '@/lib/progressService';
import type { ProgressBlob } from '@/lib/progressShapes';
import { useAuth, useEntitlement } from '@/lib/stores';

export default function StudyHome({
  freeCounts,
}: {
  freeCounts: Record<number, number>;
}) {
  const { user, ready } = useAuth();
  const ent = useEntitlement();
  const [progress, setProgress] = useState<Record<number, ProgressBlob>>({});

  useEffect(() => {
    if (!user) {
      setProgress({});
      return;
    }
    getAllChapterProgress(CONFIG.CHAPTERS.map((c) => c.id)).then(setProgress);
  }, [user]);

  const greeting = user?.displayName
    ? `Welcome back, ${user.displayName.split(' ')[0]}`
    : 'The study room';

  return (
    <div>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-ink">{greeting}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {user
              ? 'Your progress syncs with the app — pick up wherever you left off.'
              : 'Everything below is free to start. Sign in only when you want your progress saved.'}
          </p>
        </div>
        <Arnie mood="working" size={120} className="shrink-0" />
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/app/mock"
          className="flex items-center gap-4 rounded-card bg-purple p-5 text-white shadow-card transition-transform hover:-translate-y-0.5"
        >
          <Monitor size={24} />
          <div>
            <p className="font-black">Full mock test</p>
            <p className="text-xs text-purple-soft">100 questions · 120 min</p>
          </div>
        </Link>
        <Link
          href="/app/flashcards"
          className="flex items-center gap-4 rounded-card bg-white p-5 shadow-card transition-transform hover:-translate-y-0.5"
        >
          <span className="text-green">
            <Layers size={24} />
          </span>
          <div>
            <p className="font-black text-ink">Flashcards</p>
            <p className="text-xs text-muted">All chapters · all free</p>
          </div>
        </Link>
        <Link
          href="/app/mistakes"
          className="flex items-center gap-4 rounded-card bg-white p-5 shadow-card transition-transform hover:-translate-y-0.5"
        >
          <span className="text-amber">
            <Zap size={24} />
          </span>
          <div>
            <p className="font-black text-ink">Mistakes deck</p>
            <p className="text-xs text-muted">Retire what keeps biting you</p>
          </div>
        </Link>
      </div>

      {/* Chapters */}
      <h2 className="mt-12 text-xl font-black text-ink">Chapters</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONFIG.CHAPTERS.map((c) => {
          const p = progress[c.id];
          const bestPct =
            p && p.bestTotal > 0 ? Math.round((p.bestScore / p.bestTotal) * 100) : null;
          return (
            <div key={c.id} className="flex flex-col rounded-card bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-muted">
                  Chapter {c.id}
                </span>
                <span className="rounded-full bg-purple-soft px-2 py-0.5 text-xs font-black text-purple">
                  {CONFIG.MOCK_CHAPTER_WEIGHTS[c.id]}%
                </span>
              </div>
              <h3 className="mt-1.5 flex-1 text-base font-black leading-snug text-ink">
                {c.title}
              </h3>
              {ready && user && (
                <p className="mt-2 text-xs font-bold text-muted">
                  {p
                    ? `Best exam: ${bestPct != null ? `${bestPct}%` : '—'} · ${p.attempts} attempt${p.attempts === 1 ? '' : 's'} · ${p.practiced} practised`
                    : 'Not started yet'}
                </p>
              )}
              {!ent.isPaid && (
                <p className="mt-1 text-xs text-muted">
                  {freeCounts[c.id] ?? CONFIG.FREE_QUESTIONS_PER_CHAPTER} free questions
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/app/practice/${c.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-purple px-3 py-2 text-xs font-black text-white hover:bg-purple-dark"
                >
                  <BookOpen size={14} /> Practise
                </Link>
                <Link
                  href={`/app/exam/${c.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-purple px-3 py-2 text-xs font-black text-purple hover:bg-purple-soft"
                >
                  <Zap size={14} /> Exam
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
