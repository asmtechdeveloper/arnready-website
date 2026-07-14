import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { chapters, syllabus } from '@/lib/copy';
import { loadChapterContent, publishedSubtopics, TOTAL_CHAPTERS } from '@/lib/content';
import { subtopicSlug } from '@/lib/flashcardDeck';
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

function chapterFallbackTitle(chapter: number): string {
  return `${chapters.hub.chapterLabel} ${chapter}`;
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
    description: entry ? chapters.spoke.metaDescription(entry.subtopic, chapter) : undefined,
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

  const chapterName = chapterTitle(chapter) ?? chapterFallbackTitle(chapter);
  // Join the sampler share to this subtopic by canonical SLUG identity (M1-S1),
  // not display text — a capitalization difference must not zero out the share.
  const cardsForSubtopic = content.sampler.filter((c) => subtopicSlug(c.subtopic) === entry.subtopicSlug);
  const prev = ordered[index - 1];
  const next = ordered[index + 1];
  const title = `${entry.subtopic} — ${chapters.spoke.titleSuffix}`;

  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      <nav aria-label={chapters.breadcrumbs.ariaLabel} className="mb-4 text-sm text-muted">
        <Link href="/chapters" className="text-purple hover:underline">
          {chapters.breadcrumbs.chaptersLabel}
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href={`/chapters/${chapter}`} className="text-purple hover:underline">
          {chapterName}
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{entry.subtopic}</span>
      </nav>

      <header className="mb-8">
        <p className="text-sm font-bold text-purple">
          {chapters.hub.chapterLabel} {chapter} · {chapterName}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
      </header>

      <div className="rounded-card bg-white p-8 shadow-card sm:p-11">
        <TeachingBlocks blocks={entry.blocks} />
      </div>

      <section className="mt-10">
        {cardsForSubtopic.length > 0 ? (
          <>
            <h2 className="text-lg font-bold text-ink">{chapters.spoke.samplerHeading(cardsForSubtopic.length)}</h2>
            <div className="mt-4">
              <FlashcardSampler cards={cardsForSubtopic} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">{chapters.spoke.noCards}</p>
        )}
      </section>

      <nav
        aria-label={chapters.spoke.navAriaLabel}
        className="mt-10 flex flex-col gap-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4"
      >
        {prev ? (
          <Link href={`/chapters/${chapter}/${prev.subtopicSlug}`} className="min-w-0 break-words text-purple hover:underline">
            {chapters.spoke.prevLabel}: {prev.subtopic}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/chapters/${chapter}/${next.subtopicSlug}`}
            className="min-w-0 break-words text-purple hover:underline sm:text-right"
          >
            {chapters.spoke.nextLabel}: {next.subtopic}
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <div className="mt-8 flex justify-center">
        <Link
          href={`/chapters/${chapter}`}
          className="flex min-h-11 items-center rounded-pill bg-purple px-6 text-sm font-bold text-white hover:bg-purple-dark"
        >
          {chapters.spoke.backToChapter}
        </Link>
      </div>
    </div>
  );
}
