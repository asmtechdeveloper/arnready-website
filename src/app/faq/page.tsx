import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers to common questions about ARNReady, the free tier, and the NISM Series V-A exam.',
  alternates: { canonical: '/faq' },
};

// WORKING — awaiting Anusha's voice pass. Exam facts carry [VERIFY] per the
// copy scaffold's claims rules until she confirms them.
const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Is ARNReady free?',
    a: (
      <>
        Genuinely free to start: read every chapter and try 10 sampler
        flashcards without signing in. Sign in with Google (still free) and
        you get 20 real practice questions per chapter, every flashcard, one
        full mock test ever, and your mistakes deck. The complete question
        bank and unlimited mocks are a one-time ₹250.
      </>
    ),
  },
  {
    q: 'Is this official NISM material?',
    a: 'No. ARNReady is independent and not affiliated with, endorsed by, or approved by NISM, SEBI, or AMFI. Questions are original, written from the syllabus concepts — never copied from any paper.',
  },
  {
    q: 'What is the NISM Series V-A exam?',
    a: 'The mandatory certification exam for mutual fund distributors in India: 100 questions, 120 minutes, 50% pass mark, no negative marking. [VERIFY]',
  },
  {
    q: 'Will this alone make me pass?',
    a: "It's designed to get you genuinely exam-ready, and it will never tell you that you're ready before you are. But nobody honest guarantees a pass, so we won't either.",
  },
  {
    q: 'Why is the scoring so strict?',
    a: "Most prep apps flatter you with easy scores. ARNReady's free scoring divides by at least 10 questions even if you attempt fewer, so a lucky streak can't inflate your number — the goal is to make you ready, not to make you feel ready.",
  },
  {
    q: 'Do I need a subscription?',
    a: 'No. ₹250 once, yours forever — on the app today, and on the website once web checkout ships (coming soon).',
  },
  {
    q: 'How do I delete my account?',
    a: (
      <>
        In the app: Profile → Delete Account. Full details on{' '}
        <Link href="/delete-account">the delete-account page</Link>.
      </>
    ),
  },
  {
    q: 'I paid but premium isn’t showing.',
    a: 'On the app, use Restore Purchases from the account screen. If it still isn’t showing, email support with the Gmail you sign in with and we’ll sort it out within 48 hours.',
  },
  {
    q: 'Is there an iOS version?',
    a: 'Not yet — ARNReady is Android and web today. [ANUSHA-DECIDE: iOS timeline]',
  },
  {
    q: 'Who built this?',
    a: (
      <>
        Anusha Murthy (ASM Tech). See <Link href="/about">About ARNReady</Link>.
      </>
    ),
  },
];

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: typeof f.a === 'string' ? f.a : '',
      },
    })),
  };

  return (
    <div className="mx-auto max-w-reading px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-purple sm:text-4xl">
        Frequently asked questions
      </h1>
      <div className="mt-8 space-y-8">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-card bg-white p-6 shadow-card">
            <h2 className="text-base font-bold text-ink">{f.q}</h2>
            <p className="mt-2 text-[0.95rem] leading-7 text-muted">{f.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Link
          href="/pricing"
          className="inline-block rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          See free vs. premium
        </Link>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
