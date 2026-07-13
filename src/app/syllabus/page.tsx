import type { Metadata } from 'next';
import Link from 'next/link';
import { syllabus } from '@/lib/copy';

export const metadata: Metadata = {
  title: syllabus.meta.title,
  description: syllabus.meta.description,
  alternates: { canonical: '/syllabus' },
};

export default function SyllabusPage() {
  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-14 sm:px-gutter-desktop">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{syllabus.h1}</h1>
      <p className="mt-4 text-base leading-7 text-muted">{syllabus.intro}</p>

      <ol className="mt-8 space-y-3">
        {syllabus.chapters.map((title, i) => (
          <li key={title} className="flex items-baseline gap-3 rounded-card bg-white p-4 shadow-card">
            <span className="text-sm font-bold text-purple">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-[0.95rem] leading-6 text-ink">{title}</span>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex justify-center">
        <Link
          href={syllabus.cta.href}
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          {syllabus.cta.label}
        </Link>
      </div>
    </div>
  );
}
