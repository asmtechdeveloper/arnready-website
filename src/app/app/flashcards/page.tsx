import type { Metadata } from 'next';
import Link from 'next/link';
import { CONFIG } from '@/lib/config';
import { loadChapterStats } from '@/lib/content';

export const metadata: Metadata = { title: 'Flashcards' };

export default function FlashcardsIndexPage() {
  const stats = loadChapterStats();
  const countFor = (id: number) => stats.find((s) => s.chapter === id)?.flashcardCount ?? 0;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-black text-ink">Flashcards</h1>
      <p className="mt-2 text-sm text-muted">
        Every card, every chapter, free. Flip, grade yourself honestly, and let
        the &ldquo;review again&rdquo; pile do its job.
      </p>
      <div className="mt-6 space-y-2.5">
        {CONFIG.CHAPTERS.map((c) => (
          <Link
            key={c.id}
            href={`/app/flashcards/${c.id}`}
            className="flex items-center justify-between rounded-card bg-white p-5 shadow-card transition-transform hover:-translate-y-0.5"
          >
            <span className="font-black text-ink">
              {c.id}. {c.title}
            </span>
            <span className="text-sm font-black text-purple">{countFor(c.id)} cards</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
