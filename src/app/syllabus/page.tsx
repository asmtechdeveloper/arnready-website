import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NISM Series V-A syllabus',
  description: 'The 12 chapters of the NISM Series V-A Mutual Fund Distributor exam syllabus.',
  alternates: { canonical: '/syllabus' },
};

// WORKING — awaiting Anusha's voice pass. Chapter weightages are
// [VERIFY] until confirmed against the current NISM workbook edition;
// per-chapter teaching pages ship in a later milestone (manual M1).
const chapters = [
  'Indian Securities Market — an overview',
  'Concept and Role of a Mutual Fund',
  'Legal Structure of Mutual Funds in India',
  'Legal and Regulatory Framework',
  'Scheme-Related Information',
  'Fund Distribution and Channel Management',
  'NAV, Total Expense Ratio, and Pricing',
  'Taxation',
  'Investor Services',
  'Risk, Return, and Performance of Funds',
  'Mutual Fund Scheme Performance',
  'Mutual Fund Scheme Selection',
];

export default function SyllabusPage() {
  return (
    <div className="mx-auto max-w-reading px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        NISM Series V-A syllabus
      </h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Twelve chapters make up the NISM Series V-A Mutual Fund Distributor
        exam. Exact chapter-wise weightage varies by exam edition — treat the
        order below as a study path, not a guaranteed mark split. [VERIFY]
      </p>

      <ol className="mt-8 space-y-3">
        {chapters.map((title, i) => (
          <li
            key={title}
            className="flex items-baseline gap-3 rounded-card bg-white p-4 shadow-card"
          >
            <span className="text-sm font-bold text-purple">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="text-[0.95rem] leading-6 text-ink">{title}</span>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex justify-center">
        <Link
          href="/pricing"
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          See free vs. premium
        </Link>
      </div>
    </div>
  );
}
