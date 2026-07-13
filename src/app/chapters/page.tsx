import type { Metadata } from 'next';
import Link from 'next/link';
import { chapters, syllabus } from '@/lib/copy';
import { publishedChapters } from '@/lib/content';

export const metadata: Metadata = {
  title: chapters.index.meta.title,
  description: chapters.index.meta.description,
  alternates: { canonical: '/chapters' },
};

export default function ChaptersIndexPage() {
  const published = new Set(publishedChapters());

  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-14 sm:px-gutter-desktop">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{chapters.index.h1}</h1>
      <p className="mt-4 text-base leading-7 text-muted">{chapters.index.intro}</p>

      <ol className="mt-8 space-y-3">
        {syllabus.chapters.map((title, i) => {
          const num = i + 1;
          const isPublished = published.has(num);
          return (
            <li key={title} className="rounded-card bg-white p-4 shadow-card">
              {isPublished ? (
                <Link
                  href={`/chapters/${num}`}
                  className="flex min-h-11 items-baseline gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
                >
                  <span className="text-sm font-bold text-purple">{String(num).padStart(2, '0')}</span>
                  <span className="text-[0.95rem] leading-6 text-ink hover:text-purple">{title}</span>
                </Link>
              ) : (
                <span className="flex min-h-11 items-baseline gap-3">
                  <span className="text-sm font-bold text-muted">{String(num).padStart(2, '0')}</span>
                  <span className="text-[0.95rem] leading-6 text-muted">{title}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {published.size === 0 && <p className="mt-6 text-sm text-muted">{chapters.index.emptyNote}</p>}

      <div className="mt-10 flex justify-center">
        <Link
          href={chapters.index.cta.href}
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          {chapters.index.cta.label}
        </Link>
      </div>
    </div>
  );
}
