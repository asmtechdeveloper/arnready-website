// WORKING copy — pending Anusha's voice pass + E-1/E-2 review.
import type { Metadata } from 'next';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import { CONFIG } from '@/lib/config';
import { loadChapterStats } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Free NISM Series V-A Flashcards — All 12 Chapters',
  description:
    'Free flashcards for the entire NISM Series V-A syllabus, organised by chapter and subtopic. Definitions, formulas and rules — no sign-up needed.',
  alternates: { canonical: '/flashcards' },
};

export default function FlashcardsPage() {
  const stats = loadChapterStats();
  const total = stats.reduce((a, c) => a + c.flashcardCount, 0);

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
        <p className="mb-3 text-sm font-black uppercase tracking-widest text-green">
          {total} flashcards · all free
        </p>
        <h1 className="text-4xl font-black leading-tight text-ink">
          Flashcards for the whole syllabus. Free. All of them.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted">
          Every definition, formula, limit and rule from the NISM Series V-A
          workbook, condensed into flashcards you can flip through in a chai
          break. No sign-up, no paywall, no &ldquo;first 10 free&rdquo; nonsense —
          knowledge is free, mastery is earned.
        </p>
        <div className="mt-8">
          <Link
            href="/app/flashcards"
            className="rounded-full bg-purple px-8 py-3.5 text-sm font-black text-white shadow-card transition-colors hover:bg-purple-dark"
          >
            Start flipping
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-black text-ink">Chapter by chapter</h2>
        <div className="mt-6 overflow-hidden rounded-card bg-white shadow-card">
          <table className="w-full text-sm">
            <tbody>
              {CONFIG.CHAPTERS.map((c) => {
                const s = stats.find((x) => x.chapter === c.id);
                return (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/chapters/${c.slug}`}
                        className="font-bold text-ink hover:text-purple"
                      >
                        {c.id}. {c.title}
                      </Link>
                    </td>
                    <td className="w-32 px-5 py-3.5 text-right font-black text-purple">
                      {s?.flashcardCount ?? 0} cards
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-black text-ink">How to use them well</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          <li>
            <strong className="text-ink">Before a chapter:</strong> flip through
            once to meet the vocabulary, then go practise questions. Terms you
            have seen once stick twice as fast.
          </li>
          <li>
            <strong className="text-ink">After a rough exam score:</strong> come
            back to the flashcards for the subtopics that hurt you. Most wrong
            answers are a definition you half-knew.
          </li>
          <li>
            <strong className="text-ink">The last week:</strong> flashcards are
            the perfect revision format when your brain refuses to read one
            more full paragraph of the workbook.
          </li>
        </ul>
      </section>

      <CtaBand
        heading={`${total} cards. Zero rupees. Start now.`}
        sub="Grade yourself honestly — knew it or didn't — and the deck does the rest."
        ctaLabel="Start flipping"
        ctaHref="/app/flashcards"
        mood="reading"
      />
    </>
  );
}
