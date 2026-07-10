import type { Metadata } from 'next';
import Link from 'next/link';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = { title: 'Practice' };

export default function PracticeIndexPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-black text-ink">Pick a chapter to practise</h1>
      <p className="mt-2 text-sm text-muted">
        Untimed, instant explanations, honest company.
      </p>
      <div className="mt-6 space-y-2.5">
        {CONFIG.CHAPTERS.map((c) => (
          <Link
            key={c.id}
            href={`/app/practice/${c.id}`}
            className="flex items-center justify-between rounded-card bg-white p-5 shadow-card transition-transform hover:-translate-y-0.5"
          >
            <span className="font-black text-ink">
              {c.id}. {c.title}
            </span>
            <span className="text-sm font-black text-purple">Start</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
