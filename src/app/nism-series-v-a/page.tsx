import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NISM Series V-A exam guide',
  description: 'What the NISM Series V-A Mutual Fund Distributor exam is, how it works, and how to prepare.',
  alternates: { canonical: '/nism-series-v-a' },
};

// WORKING — awaiting Anusha's voice pass. Exam facts carry [VERIFY] per
// the copy scaffold's claims rules until she confirms them.
export default function NismSeriesVAPage() {
  return (
    <div className="mx-auto max-w-reading px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        The NISM Series V-A exam, explained
      </h1>
      <p className="mt-4 text-base leading-7 text-muted">
        NISM Series V-A is the certification exam mutual fund distributors in
        India are required to pass. It tests the syllabus set by the National
        Institute of Securities Markets — everything from how mutual funds
        are structured to how to talk an investor through risk. ARNReady is
        an independent study aid for this exam; it is not affiliated with,
        endorsed by, or approved by NISM, SEBI, or AMFI.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">Exam format</h2>
        <table className="mt-4 w-full border-collapse text-left text-sm">
          <tbody className="text-muted">
            <tr className="border-b border-line">
              <td className="py-2 pr-4 font-semibold text-ink">Questions</td>
              <td className="py-2">100, multiple choice [VERIFY]</td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-2 pr-4 font-semibold text-ink">Duration</td>
              <td className="py-2">120 minutes [VERIFY]</td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-2 pr-4 font-semibold text-ink">Pass mark</td>
              <td className="py-2">50% [VERIFY]</td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-2 pr-4 font-semibold text-ink">Negative marking</td>
              <td className="py-2">None [VERIFY]</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-semibold text-ink">Certificate validity</td>
              <td className="py-2">3 years [VERIFY]</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">How ARNReady helps</h2>
        <p className="mt-3 leading-7 text-muted">
          Twelve chapters of practice, flashcards for quick recall, an exam
          mode that mirrors the real thing, and a full mock test weighted
          like the actual paper — scored the strict way, so it never tells
          you you&rsquo;re ready before you are.
        </p>
      </section>

      <div className="mt-10 flex justify-center">
        <Link
          href="/syllabus"
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          See the full syllabus
        </Link>
      </div>
    </div>
  );
}
