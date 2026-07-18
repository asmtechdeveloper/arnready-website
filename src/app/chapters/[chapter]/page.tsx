import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { chapters, syllabus } from '@/lib/copy';
import { loadChapterContent, publishedSubtopics, TOTAL_CHAPTERS } from '@/lib/content';
import { TeachingBlocks } from '@/components/TeachingBlocks';
import { FlashcardSampler } from '@/components/FlashcardSampler';
import { SignInButton } from '@/components/SignInButton';

// generateStaticParams + dynamicParams for the {chapter} segment live in the
// sibling layout.tsx — a page.tsx's own generateStaticParams only registers
// params for its OWN leaf route, never propagates to nested child routes
// (/chapters/[chapter]/[subtopic]), so the layout is the single source.

function chapterTitle(chapter: number): string | undefined {
  return syllabus.chapters[chapter - 1];
}

function chapterFallbackTitle(chapter: number): string {
  return `${chapters.hub.chapterLabel} ${chapter}`;
}

export async function generateMetadata({ params }: { params: Promise<{ chapter: string }> }): Promise<Metadata> {
  const { chapter: chapterParam } = await params;
  const chapter = Number(chapterParam);
  const title = chapterTitle(chapter) ?? chapterFallbackTitle(chapter);
  return {
    title,
    description: chapters.hub.metaDescription(chapter, title),
    alternates: { canonical: `/chapters/${chapter}` },
  };
}

export default async function ChapterHubPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter: chapterParam } = await params;
  const chapter = Number(chapterParam);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > TOTAL_CHAPTERS) notFound();

  const content = loadChapterContent(chapter);
  if (!content.chapterTeaching) notFound();

  const title = chapterTitle(chapter) ?? chapterFallbackTitle(chapter);
  const subtopics = publishedSubtopics(chapter);

  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      <nav aria-label={chapters.breadcrumbs.ariaLabel} className="mb-4 text-sm text-muted">
        <Link href="/chapters" className="text-purple hover:underline">
          {chapters.breadcrumbs.chaptersLabel}
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{title}</span>
      </nav>

      <header className="mb-8">
        <p className="text-sm font-bold text-purple">
          {chapters.hub.chapterLabel} {chapter}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
      </header>

      <div className="rounded-card bg-white p-8 shadow-card sm:p-11">
        <TeachingBlocks blocks={content.chapterTeaching.blocks} />
      </div>

      {subtopics.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">{chapters.hub.subtopicsHeading}</h2>
          <ul className="mt-4 space-y-2">
            {subtopics.map((s) => (
              <li key={s.subtopicSlug} className="rounded-card bg-white p-4 shadow-card">
                <Link
                  href={`/chapters/${chapter}/${s.subtopicSlug}`}
                  className="flex min-h-11 items-center text-[0.95rem] font-semibold text-ink hover:text-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
                >
                  {s.subtopic}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {content.sampler.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-ink">{chapters.hub.samplerHeading}</h2>
          <div className="mt-4">
            <FlashcardSampler cards={content.sampler} />
          </div>
        </section>
      )}

      <div className="mt-12 flex flex-col items-center gap-3 rounded-card bg-purple-soft p-8 text-center">
        <p className="max-w-reading text-[0.95rem] leading-6 text-ink">{chapters.hub.signIn.body}</p>
        {/* Sign-in prompt #1 of the three in manual §1 ("after the 10th
            sampler card"), live since M3. This is now the hub's ONE primary
            CTA, per manual M1 step 2 ("one sign-in CTA") — M1-B8 had made the
            pricing link primary only because sign-in was a disabled stub, so
            with auth live the pricing link demotes to a quiet secondary. */}
        <SignInButton label={chapters.hub.signIn.label} />
        <Link
          href={chapters.hub.pricingLink.href}
          className="mt-1 flex min-h-11 items-center text-sm font-semibold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
        >
          {chapters.hub.pricingLink.label}
        </Link>
      </div>
    </div>
  );
}
