// WORKING copy — pending Anusha's voice pass + E-1/E-2 review.
import type { Metadata } from 'next';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: 'NISM Series V-A Syllabus & Chapter Weightage',
  description:
    'The full NISM Series V-A syllabus: all 12 chapters with official exam weightage, so you know exactly where your study hours earn the most marks.',
  alternates: { canonical: '/syllabus' },
};

export default function SyllabusPage() {
  const rows = CONFIG.CHAPTERS.map((c) => ({
    ...c,
    weight: CONFIG.MOCK_CHAPTER_WEIGHTS[c.id],
  }));
  const maxWeight = Math.max(...rows.map((r) => r.weight));

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
        <p className="mb-3 text-sm font-black uppercase tracking-widest text-green">
          Syllabus &amp; weightage
        </p>
        <h1 className="text-4xl font-black leading-tight text-ink">
          12 chapters. 100 marks. Not evenly split.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted">
          This is the official NISM Series V-A chapter weightage. Chapters 9 and
          12 alone are worth 30 marks; chapters 3 and 8 together are worth 8.
          Plan your hours like the examiner plans the paper.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-card bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-5 py-3.5 font-black text-ink">Chapter</th>
                <th className="w-28 px-5 py-3.5 text-right font-black text-ink">Weightage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/chapters/${r.slug}`}
                      className="font-bold text-ink hover:text-purple"
                    >
                      {r.id}. {r.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      <span
                        className="h-2 rounded-full bg-purple"
                        style={{ width: `${(r.weight / maxWeight) * 56}px` }}
                        aria-hidden
                      />
                      <span className="w-12 text-right font-black text-purple">
                        {r.weight}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Weightage as published in the NISM Series V-A workbook. ARNReady&apos;s
          100-question mock draws from each chapter in exactly these
          proportions.
        </p>
      </section>

      <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-black text-ink">How to read this table</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          <li>
            <strong className="text-ink">The big four (48 marks):</strong> Investor
            Services (15), Scheme Selection (15), Legal &amp; Regulatory
            Framework (10), and Scheme Related Information (10). Master these
            first — nearly half the paper lives here.
          </li>
          <li>
            <strong className="text-ink">The middle (38 marks):</strong> Investment
            Landscape, NAV &amp; Expenses, Risk &amp; Return, Performance,
            Concept &amp; Role, and Distribution. Steady, connected material —
            the flashcards earn their keep here.
          </li>
          <li>
            <strong className="text-ink">The small two (8 marks):</strong> Legal
            Structure (4) and Taxation (4). Do not skip them — 8 marks is often
            the gap between 48% and a pass — but do not give them a week each
            either.
          </li>
        </ul>
      </section>

      <CtaBand
        heading="Now you know where the marks are."
        sub="Go get them — chapter-wise practice with real exam-style questions, free to start."
        ctaLabel="Browse the chapters"
        ctaHref="/chapters"
        mood="reading"
      />
    </>
  );
}
