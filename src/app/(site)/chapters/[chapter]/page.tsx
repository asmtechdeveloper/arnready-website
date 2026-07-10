// WORKING copy — pending Anusha's voice pass + E-1/E-2 review.
// Sample questions shown here are FREE-tier content only (leak gate enforced).
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CtaBand from '@/components/CtaBand';
import { CheckCircle } from '@/components/Icon';
import { CONFIG } from '@/lib/config';
import { loadFreeQuestions, statsForChapter } from '@/lib/content';

export function generateStaticParams() {
  return CONFIG.CHAPTERS.map((c) => ({ chapter: c.slug }));
}

function chapterFromSlug(slug: string) {
  return CONFIG.CHAPTERS.find((c) => c.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string }>;
}): Promise<Metadata> {
  const { chapter } = await params;
  const meta = chapterFromSlug(chapter);
  if (!meta) return {};
  return {
    title: `Chapter ${meta.id}: ${meta.title} — NISM V-A Practice Questions`,
    description: `Free NISM Series V-A practice questions and flashcards for Chapter ${meta.id} (${meta.title}), worth ${CONFIG.MOCK_CHAPTER_WEIGHTS[meta.id]}% of the exam.`,
    alternates: { canonical: `/chapters/${meta.slug}` },
  };
}

const SAMPLE_COUNT = 3;

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const meta = chapterFromSlug(chapter);
  if (!meta) notFound();

  const stats = statsForChapter(meta.id);
  const samples = loadFreeQuestions(meta.id).slice(0, SAMPLE_COUNT);
  const weight = CONFIG.MOCK_CHAPTER_WEIGHTS[meta.id];

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
        <p className="mb-3 text-sm font-black uppercase tracking-widest text-green">
          Chapter {meta.id} of 12 · {weight}% of the exam
        </p>
        <h1 className="text-4xl font-black leading-tight text-ink">{meta.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">{meta.oneliner}</p>
        <div className="mt-8">
          <Link
            href={`/app/practice/${meta.id}`}
            className="rounded-full bg-purple px-8 py-3.5 text-sm font-black text-white shadow-card transition-colors hover:bg-purple-dark"
          >
            Practise this chapter free
          </Link>
        </div>
      </section>

      {stats && (
        <section className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-4 rounded-card bg-white p-6 shadow-card">
            {[
              [stats.totalQuestions, 'questions in the bank'],
              [stats.freeCount, 'free to practise now'],
              [stats.flashcardCount, 'flashcards, all free'],
            ].map(([n, label]) => (
              <div key={String(label)} className="py-2 text-center">
                <p className="text-2xl font-black text-purple">{n}</p>
                <p className="mt-1 text-xs font-bold text-muted">{label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {stats && stats.subtopics.length > 0 && (
        <section className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-black text-ink">What this chapter covers</h2>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {stats.subtopics.map((s) => (
              <li key={s} className="flex items-start gap-2.5 text-sm font-bold text-ink">
                <span className="mt-0.5 text-green">
                  <CheckCircle size={16} />
                </span>
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {samples.length > 0 && (
        <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-black text-ink">Try {samples.length} real questions</h2>
          <p className="mt-2 text-sm text-muted">
            Straight from the ARNReady question bank — the same style you&apos;ll
            face at the test centre.
          </p>
          <div className="mt-6 space-y-5">
            {samples.map((q, i) => (
              <details key={q.id} className="group rounded-card bg-white p-6 shadow-card">
                <summary className="cursor-pointer list-none">
                  <p className="text-xs font-black uppercase tracking-widest text-muted">
                    Question {i + 1} · {q.subtopic ?? 'General'}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-ink">
                    {q.question}
                  </p>
                  <ol className="mt-3 space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <li key={oi} className="text-sm leading-relaxed text-muted">
                        <span className="font-black text-ink">
                          {String.fromCharCode(65 + oi)}.
                        </span>{' '}
                        {opt}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-xs font-black text-purple group-open:hidden">
                    Show the answer
                  </p>
                </summary>
                <div className="mt-4 rounded-xl bg-green-soft p-4">
                  <p className="text-sm font-black text-green">
                    Answer: {String.fromCharCode(65 + q.correctIndex)}.{' '}
                    {q.options[q.correctIndex]}
                  </p>
                  {q.explanation && (
                    <p className="mt-2 text-sm leading-relaxed text-ink">{q.explanation}</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-white p-6 shadow-card">
          {meta.id > 1 ? (
            <Link
              href={`/chapters/${CONFIG.CHAPTERS[meta.id - 2].slug}`}
              className="text-sm font-black text-purple hover:underline"
            >
              &larr; Chapter {meta.id - 1}
            </Link>
          ) : (
            <span />
          )}
          {meta.id < 12 ? (
            <Link
              href={`/chapters/${CONFIG.CHAPTERS[meta.id].slug}`}
              className="text-sm font-black text-purple hover:underline"
            >
              Chapter {meta.id + 1} &rarr;
            </Link>
          ) : (
            <Link href="/mock-test" className="text-sm font-black text-purple hover:underline">
              Done with chapters? Take the mock &rarr;
            </Link>
          )}
        </div>
      </section>

      <CtaBand
        heading={`Ready to practise Chapter ${meta.id} properly?`}
        sub={`${stats?.freeCount ?? CONFIG.FREE_QUESTIONS_PER_CHAPTER} free questions with full explanations, plus every flashcard — no sign-up needed.`}
        ctaLabel="Practise this chapter free"
        ctaHref={`/app/practice/${meta.id}`}
        mood="working"
      />
    </>
  );
}
