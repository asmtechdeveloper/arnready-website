import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { chapters, syllabus } from '@/lib/copy';
import { loadChapterContent, publishedSubtopics, TOTAL_CHAPTERS } from '@/lib/content';
import { TeachingBlocks } from '@/components/TeachingBlocks';
import { FlashcardSampler } from '@/components/FlashcardSampler';

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { chapter: string } }) {
  const chapter = Number(params.chapter);
  return publishedSubtopics(chapter).map((s) => ({ subtopic: s.subtopicSlug }));
}

function chapterTitle(chapter: number): string | undefined {
  return syllabus.chapters[chapter - 1];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string; subtopic: string }>;
}): Promise<Metadata> {
  const { chapter: chapterParam, subtopic } = await params;
  const chapter = Number(chapterParam);
  const entry = publishedSubtopics(chapter).find((s) => s.subtopicSlug === subtopic);
  const title = entry ? `${entry.subtopic} — ${chapters.spoke.titleSuffix}` : subtopic;
  return {
    title,
    description: entry
      ? `${entry.subtopic}: free NISM Series V-A teaching and sampler flashcards, chapter ${chapter}.`
      : undefined,
    alternates: { canonical: `/chapters/${chapter}/${subtopic}` },
  };
}

export default async function SubtopicSpokePage({
  params,
}: {
  params: Promise<{ chapter: string; subtopic: string }>;
}) {
  const { chapter: chapterParam, subtopic } = await params;
  const chapter = Number(chapterParam);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > TOTAL_CHAPTERS) notFound();

  const content = loadChapterContent(chapter);
  const ordered = publishedSubtopics(chapter);
  const index = ordered.findIndex((s) => s.subtopicSlug === subtopic);
  if (index === -1) notFound();
  const entry = ordered[index]!;

  const chapterName = chapterTitle(chapter) ?? `Chapter ${chapter}`;
  const cardsForSubtopic = content.sampler.filter((c) => c.subtopic === entry.subtopic);
  const prev = ordered[index - 1];
  const next = ordered[index + 1];
  const title = `${entry.subtopic} — ${chapters.spoke.titleSuffix}`;

  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <Link href="/chapters" className="text-purple hover:underline">
          {chapters.breadcrumbs.chaptersLabel}
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href={`/chapters/${chapter}`} className="text-purple hover:underline">
          {chapterName}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{entry.subtopic}</span>
      </nav>

      <header className="mb-8">
        <p className="text-sm font-bold text-purple">
          Chapter {chapter} · {chapterName}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
      </header>

      <div className="rounded-card bg-white p-8 shadow-card sm:p-11">
        <TeachingBlocks blocks={entry.blocks} />
      </div>

      <section className="mt-10">
        {cardsForSubtopic.length > 0 ? (
          <>
            <h2 className="text-lg font-bold text-ink">{chapters.hub.samplerHeading}</h2>
            <div className="mt-4">
              <FlashcardSampler cards={cardsForSubtopic} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">{chapters.spoke.noCards}</p>
        )}
      </section>

      <nav aria-label="Subtopic navigation" className="mt-10 flex flex-col gap-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        {prev ? (
          <Link href={`/chapters/${chapter}/${prev.subtopicSlug}`} className="min-w-0 break-words text-purple hover:underline">
            ← {chapters.spoke.prevLabel}: {prev.subtopic}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/chapters/${chapter}/${next.subtopicSlug}`}
            className="min-w-0 break-words text-purple hover:underline sm:text-right"
          >
            {chapters.spoke.nextLabel}: {next.subtopic} →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <div className="mt-8 flex justify-center">
        <Link href={`/chapters/${chapter}`} className="text-sm font-semibold text-purple hover:underline">
          {chapters.spoke.backToChapter}
        </Link>
      </div>

      <div className="mt-12 flex flex-col items-center gap-3 rounded-card bg-purple-soft p-8 text-center">
        <p className="max-w-reading text-[0.95rem] leading-6 text-ink">{chapters.hub.signIn.body}</p>
        <button
          type="button"
          disabled
          title={chapters.hub.signIn.title}
          aria-disabled="true"
          className="flex min-h-11 items-center rounded-pill border border-line bg-white px-6 text-sm font-bold text-muted"
        >
          {chapters.hub.signIn.label}
        </button>
        <Link href={chapters.hub.pricingLink.href} className="text-sm text-purple hover:underline">
          {chapters.hub.pricingLink.label}
        </Link>
      </div>
    </div>
  );
}
