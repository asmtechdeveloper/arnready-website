// WORKING copy — pending Anusha's voice pass + E-1/E-2 review.
import type { Metadata } from 'next';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import { CONFIG } from '@/lib/config';
import { loadChapterStats } from '@/lib/content';

export const metadata: Metadata = {
  title: 'NISM Series V-A Practice Questions — Free Question Bank',
  description:
    'Practise real exam-style NISM Series V-A questions with full explanations. 20 free questions per chapter across all 12 chapters, no sign-up needed.',
  alternates: { canonical: '/questions' },
};

export default function QuestionsPage() {
  const stats = loadChapterStats();
  const total = stats.reduce((a, c) => a + c.totalQuestions, 0);
  const free = stats.reduce((a, c) => a + c.freeCount, 0);

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
        <p className="mb-3 text-sm font-black uppercase tracking-widest text-green">
          {total.toLocaleString('en-IN')} questions · {free} free
        </p>
        <h1 className="text-4xl font-black leading-tight text-ink">
          A question bank that fights back
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted">
          Every question is written in the real exam&apos;s style — scenario-based,
          four options, one defensible answer — and every one carries a proper
          explanation, because a question you got right by luck is a mark you
          haven&apos;t earned yet. The first {CONFIG.FREE_QUESTIONS_PER_CHAPTER} of
          every chapter are free, no sign-up needed.
        </p>
        <div className="mt-8">
          <Link
            href="/app"
            className="rounded-full bg-purple px-8 py-3.5 text-sm font-black text-white shadow-card transition-colors hover:bg-purple-dark"
          >
            Start practising free
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-black text-ink">Three ways to face them</h2>
        <div className="mt-6 space-y-4">
          {[
            {
              title: 'Practice mode',
              body: 'Untimed, with the explanation revealed after every answer. This is where you learn — take your time, read why the wrong options are wrong.',
            },
            {
              title: 'Chapter exams',
              body: `${CONFIG.EXAM_QUESTIONS} questions under exam conditions, scored honestly. Fresh variations drawn each attempt, so memorising answers gets you nowhere (which is the point).`,
            },
            {
              title: 'The full mock',
              body: `${CONFIG.MOCK_QUESTIONS} questions, ${CONFIG.MOCK_DURATION_MIN} minutes, official chapter weightage — the complete dress rehearsal on your laptop.`,
            },
          ].map((c) => (
            <div key={c.title} className="rounded-card bg-white p-6 shadow-card">
              <h3 className="font-black text-ink">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-black text-ink">Browse by chapter</h2>
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
                    <td className="w-44 px-5 py-3.5 text-right text-xs font-bold text-muted">
                      {s ? `${s.totalQuestions} questions · ${s.freeCount} free` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <CtaBand
        heading="Stop reading about questions. Answer some."
        sub="Chapter 1, question 1 is free and waiting. Explanations included."
        ctaLabel="Start practising free"
        ctaHref="/app"
        mood="working"
      />
    </>
  );
}
