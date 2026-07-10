// WORKING copy — pending Anusha's voice pass + E-1/E-2 review.
// Exam facts below marked [VERIFY] must be checked against the current
// NISM workbook/portal before this page ships publicly.
import type { Metadata } from 'next';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: 'NISM Series V-A Exam Guide — Pattern, Passing Marks, Syllabus',
  description:
    'Everything about the NISM Series V-A Mutual Fund Distributors exam: pattern, passing marks, negative marking, validity, how to register, and how to prepare.',
  alternates: { canonical: '/nism-series-v-a' },
};

const FACTS: Array<[string, string]> = [
  ['Exam name', 'NISM Series V-A: Mutual Fund Distributors Certification Examination'],
  ['Questions', '100 multiple-choice questions'],
  ['Marks', '100 (1 mark each)'],
  ['Duration', '2 hours (120 minutes)'],
  ['Passing score', '50%'],
  ['Negative marking', 'None'],
  ['Mode', 'Computer-based, at NISM test centres'],
  ['Certificate validity', '3 years'], // [VERIFY]
];

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: 'Register on the NISM portal',
    body: 'Create an account on the NISM certification portal, pick Series V-A, choose a test centre and slot, and pay the exam fee. Slots in bigger cities fill up, so book a couple of weeks ahead.',
  },
  {
    title: 'Study the 12-chapter syllabus',
    body: 'The official workbook is the source of truth. It is also 400+ pages of committee prose — which is exactly why ARNReady exists. Practise chapter by chapter and let the weightage guide where your hours go.',
  },
  {
    title: 'Sit full mocks before the real thing',
    body: 'The exam is a 2-hour endurance event, not 100 separate questions. Sit at least two full 100-question mocks on a laptop under time pressure so the format holds no surprises.',
  },
  {
    title: 'Pass, then get your ARN',
    body: 'After passing, complete the AMFI registration process to receive your ARN (AMFI Registration Number) — that is the licence to actually distribute mutual funds.',
  },
];

export default function ExamGuidePage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
        <p className="mb-3 text-sm font-black uppercase tracking-widest text-green">
          The exam, explained
        </p>
        <h1 className="text-4xl font-black leading-tight text-ink">
          NISM Series V-A: the complete guide
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted">
          If you want to distribute mutual funds in India, this is the exam
          between you and your ARN. Here is everything that matters — the
          pattern, the passing marks, and an honest take on how to prepare.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-black text-ink">Exam pattern at a glance</h2>
        <div className="mt-6 overflow-hidden rounded-card bg-white shadow-card">
          <table className="w-full text-sm">
            <tbody>
              {FACTS.map(([k, v]) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <th className="w-2/5 px-6 py-3.5 text-left font-black text-ink">{k}</th>
                  <td className="px-6 py-3.5 text-muted">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Always confirm current fees, dates and rules on the official NISM
          portal:{' '}
          <a
            href={CONFIG.NISM_PORTAL_URL}
            rel="noopener noreferrer"
            target="_blank"
            className="font-bold text-purple hover:underline"
          >
            certifications.nism.ac.in
          </a>
          . ARNReady is an independent study aid, not affiliated with NISM.
        </p>
      </section>

      <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-black text-ink">No negative marking — use it</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          There is no penalty for a wrong answer, so an unanswered question is
          the only guaranteed zero on your paper. Answer everything. This is
          also why ARNReady&apos;s honest scoring counts skipped questions against
          you — leaving blanks is a habit worth breaking long before exam day.
        </p>
      </section>

      <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-black text-ink">From zero to ARN, in four steps</h2>
        <ol className="mt-6 space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-card bg-white p-6 shadow-card">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple text-sm font-black text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-black text-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-black text-ink">Where the marks actually are</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          The 12 chapters are not weighted equally — two chapters (Investor
          Services, and Scheme Selection) carry 30 marks between them, while
          Legal Structure carries just 4. Study accordingly. The full
          chapter-by-chapter weightage is on the{' '}
          <Link href="/syllabus" className="font-bold text-purple hover:underline">
            syllabus page
          </Link>
          , and ARNReady&apos;s mock draws questions in exactly these proportions.
        </p>
      </section>

      <CtaBand
        heading="Reading about the exam is not preparing for it."
        sub="Start with free chapter practice and see where you stand today — the honest way."
        ctaLabel="Start practising free"
        ctaHref="/app"
        mood="reading"
      />
    </>
  );
}
