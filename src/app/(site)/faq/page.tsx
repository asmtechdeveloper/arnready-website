// WORKING copy — pending Anusha's voice pass + E-1/E-2 review.
// Exam-fact answers marked [VERIFY] must be checked against the current
// NISM portal/workbook before ship.
import type { Metadata } from 'next';
import CtaBand from '@/components/CtaBand';
import JsonLd from '@/components/JsonLd';
import { CONFIG } from '@/lib/config';
import { loadChapterStats } from '@/lib/content';

export const metadata: Metadata = {
  title: 'FAQ — NISM Series V-A & ARNReady',
  description:
    'Frequently asked questions about the NISM Series V-A exam and about ARNReady: passing marks, negative marking, validity, free tier, honest scoring, and the one-time unlock.',
  alternates: { canonical: '/faq' },
};

const EXAM_FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'What is the passing score for NISM Series V-A?',
    a: 'You need 50% — 50 marks out of 100. There is no negative marking, so answer every question; a blank is the only guaranteed zero.',
  },
  {
    q: 'Is there negative marking in NISM Series V-A?',
    a: 'No. Wrong answers cost nothing beyond the mark you did not earn. This is why you should never leave a question unanswered.',
  },
  {
    q: 'How long is the exam and how many questions?',
    a: '100 multiple-choice questions of 1 mark each, in 2 hours (120 minutes), on a computer at a NISM test centre.',
  },
  {
    q: 'How long is the certificate valid?',
    a: 'Three years from the date you pass. After that you can refresh it through the NISM CPE route instead of re-sitting the full exam. Confirm current rules on the NISM portal.', // [VERIFY]
  },
  {
    q: 'Who needs to pass this exam?',
    a: 'Anyone who wants to distribute mutual funds in India — individual advisers and employees of distributors alike. Passing it is the prerequisite for getting your ARN (AMFI Registration Number).',
  },
  {
    q: 'How hard is the exam really?',
    a: 'Fair but wordy. The questions are scenario-based rather than pure recall, and the two-hour format punishes poor time management more than poor memory. Chapter-weighted practice and at least one full timed mock make the difference.',
  },
];

const arnreadyFaqs = (totalFlashcards: number): Array<{ q: string; a: string }> => [
  {
    q: 'What is actually free on ARNReady?',
    a: `All ${totalFlashcards} flashcards, the first ${CONFIG.FREE_QUESTIONS_PER_CHAPTER} questions of every chapter with full explanations, and one complete 100-question mock per account. No sign-up is needed to practise; signing in (free) saves your progress and unlocks the mock.`,
  },
  {
    q: 'Why does my ARNReady score look lower than other apps?',
    a: 'Because it is honest. Skipped questions count against you and percentages are calculated against a real question set, not just the ones you answered. The number is designed to predict your exam result, not to make you feel good.',
  },
  {
    q: `What does the ${CONFIG.UNLOCK_PRICE_DISPLAY} unlock include?`,
    a: 'The full question bank for all 12 chapters, fresh exam variations every attempt, unlimited full mocks, and no ads. It is a one-time payment — no subscription, nothing else to buy.',
  },
  {
    q: 'Do my progress and unlock work across web and the Android app?',
    a: 'Yes. Sign in with the same Google account and your progress, mistakes deck, mock history and unlock are shared — they belong to your account, not your device.',
  },
  {
    q: 'Is ARNReady affiliated with NISM, SEBI or AMFI?',
    a: 'No. ARNReady is an independent study aid built by ASM Tech. It is not affiliated with, endorsed by, or approved by NISM, SEBI, or AMFI. For official exam registration and rules, always use the NISM portal.',
  },
  {
    q: 'How do I delete my account and data?',
    a: 'From the app (Profile → Delete Account) or by emailing us — the delete-account page has the exact steps. Deletion is permanent and covers your progress, scores and mistakes deck.',
  },
];

function FaqList({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <div className="mt-6 space-y-4">
      {items.map((f) => (
        <details key={f.q} className="group rounded-card bg-white p-6 shadow-card">
          <summary className="cursor-pointer list-none font-black text-ink group-open:text-purple">
            {f.q}
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export default function FaqPage() {
  const totalFlashcards = loadChapterStats().reduce((a, c) => a + c.flashcardCount, 0);
  const ARNREADY_FAQS = arnreadyFaqs(totalFlashcards);
  const all = [...EXAM_FAQS, ...ARNREADY_FAQS];
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: all.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />

      <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
        <p className="mb-3 text-sm font-black uppercase tracking-widest text-green">FAQ</p>
        <h1 className="text-4xl font-black leading-tight text-ink">
          Fair questions, straight answers
        </h1>

        <h2 className="mt-12 text-2xl font-black text-ink">About the exam</h2>
        <FaqList items={EXAM_FAQS} />

        <h2 className="mt-12 text-2xl font-black text-ink">About ARNReady</h2>
        <FaqList items={ARNREADY_FAQS} />
      </section>

      <CtaBand
        heading="No more questions? Good. Time to answer some."
        sub="Free chapter practice with real exam-style questions is one click away."
        ctaLabel="Start practising free"
        ctaHref="/app"
        mood="thinking"
      />
    </>
  );
}
