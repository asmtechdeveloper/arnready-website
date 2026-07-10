// WORKING copy — pending Anusha's voice pass + E-1/E-2 review.
import type { Metadata } from 'next';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import JsonLd from '@/components/JsonLd';
import { ArrowRight } from '@/components/Icon';
import { CONFIG } from '@/lib/config';
import { loadChapterStats } from '@/lib/content';

export const metadata: Metadata = {
  title: 'All 12 NISM Series V-A Chapters — Practice & Notes',
  description:
    'Every chapter of the NISM Series V-A syllabus with free practice questions, flashcards, and exam weightage. Start with any chapter, free.',
  alternates: { canonical: '/chapters' },
};

export default function ChaptersPage() {
  const stats = loadChapterStats();
  const statFor = (id: number) => stats.find((s) => s.chapter === id);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'NISM Series V-A chapters',
          itemListElement: CONFIG.CHAPTERS.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.title,
            url: `${CONFIG.SITE_URL}/chapters/${c.slug}`,
          })),
        }}
      />

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-green">
            The full syllabus
          </p>
          <h1 className="text-4xl font-black leading-tight text-ink">
            All 12 chapters, ready to practise
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted">
            Each chapter comes with {CONFIG.FREE_QUESTIONS_PER_CHAPTER} free
            exam-style questions, free flashcards for every subtopic, and its
            official exam weightage. Start anywhere — though Chapter 1 is a
            perfectly good anywhere.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CONFIG.CHAPTERS.map((c) => {
            const s = statFor(c.id);
            return (
              <Link
                key={c.id}
                href={`/chapters/${c.slug}`}
                className="group flex flex-col rounded-card bg-white p-6 shadow-card transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-muted">
                    Chapter {c.id}
                  </span>
                  <span className="rounded-full bg-purple-soft px-2.5 py-0.5 text-xs font-black text-purple">
                    {CONFIG.MOCK_CHAPTER_WEIGHTS[c.id]}% of the exam
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-black leading-snug text-ink group-hover:text-purple">
                  {c.title}
                </h2>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{c.oneliner}</p>
                {s && (
                  <p className="mt-4 text-xs font-bold text-muted">
                    {s.totalQuestions} questions · {s.flashcardCount} flashcards ·{' '}
                    {s.freeCount} free
                  </p>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-purple">
                  Open chapter <ArrowRight size={16} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <CtaBand
        heading="Twelve chapters. One exam. Zero excuses."
        sub="Pick a chapter above, or jump straight into the study room and let Arnie keep you company."
        ctaLabel="Start practising free"
        ctaHref="/app"
        mood="working"
      />
    </>
  );
}
