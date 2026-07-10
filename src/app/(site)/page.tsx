// WORKING copy throughout — ships only after Anusha's voice pass + E-1/E-2 review.
import type { Metadata } from 'next';
import Link from 'next/link';
import Arnie from '@/components/Arnie';
import CtaBand from '@/components/CtaBand';
import JsonLd from '@/components/JsonLd';
import { BookOpen, CheckCircle, Clock, Layers, Monitor, Zap } from '@/components/Icon';
import { CONFIG } from '@/lib/config';
import { loadChapterStats } from '@/lib/content';

export const metadata: Metadata = {
  description:
    'Free NISM Series V-A mock tests, practice questions and flashcards. Honest scoring, chapter-wise practice, and a full 100-question laptop mock. Built for the Mutual Fund Distributors exam.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  const stats = loadChapterStats();
  const totalQuestions = stats.reduce((a, c) => a + c.totalQuestions, 0);
  const totalFlashcards = stats.reduce((a, c) => a + c.flashcardCount, 0);
  const freeQuestions = stats.reduce((a, c) => a + c.freeCount, 0);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'ARNReady',
          url: CONFIG.SITE_URL,
          logo: `${CONFIG.SITE_URL}/icon-512.png`,
          email: CONFIG.SUPPORT_EMAIL,
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'ARNReady',
          url: CONFIG.SITE_URL,
        }}
      />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="flex flex-col-reverse items-center gap-10 md:flex-row md:justify-between">
          <div className="max-w-xl text-center md:text-left">
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-green">
              NISM Series V-A · Mutual Fund Distributors
            </p>
            <h1 className="text-4xl font-black leading-tight text-ink sm:text-5xl">
              Earning your ARN should be <span className="text-purple">fun</span>.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted">
              I built ARNReady because studying for NISM V-A shouldn&apos;t feel like
              punishment. Real exam-style questions, honest scoring that never
              flatters you, and a proper 100-question mock on your laptop —
              exactly like exam day.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row md:justify-start">
              <Link
                href="/app"
                className="rounded-full bg-purple px-8 py-3.5 text-sm font-black text-white shadow-card transition-colors hover:bg-purple-dark"
              >
                Start practising free
              </Link>
              <p className="text-xs font-bold text-muted">
                No sign-up needed · {freeQuestions} free questions
              </p>
            </div>
          </div>
          <Arnie mood="waving" size={260} priority className="shrink-0" />
        </div>
      </section>

      {/* Numbers band */}
      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 rounded-card bg-white p-6 shadow-card sm:grid-cols-4">
          {[
            [`${totalQuestions.toLocaleString('en-IN')}`, 'exam-style questions'],
            [`${totalFlashcards}`, 'flashcards, all free'],
            ['12', 'chapters, full syllabus'],
            ['100', 'question mock · 120 min'],
          ].map(([n, label]) => (
            <div key={label} className="py-4 text-center">
              <p className="text-3xl font-black text-purple">{n}</p>
              <p className="mt-1 text-xs font-bold text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-black text-ink">
          Practise. Test. Master.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted">
          The same three-step loop that works for every serious exam — minus the
          boredom.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: <BookOpen size={24} />,
              title: 'Practise chapter by chapter',
              body: 'Untimed practice with instant explanations. Flashcards for every subtopic when you want a lighter session.',
            },
            {
              icon: <Zap size={24} />,
              title: 'Take chapter exams',
              body: '30 questions, exam conditions, honest scoring. Your score is never inflated to make you feel good — that helps nobody on exam day.',
            },
            {
              icon: <Monitor size={24} />,
              title: 'Sit the full mock',
              body: '100 questions, 120 minutes, weighted exactly like the real NISM V-A paper. Built for your laptop with a question palette and keyboard shortcuts.',
            },
          ].map((c) => (
            <div key={c.title} className="rounded-card bg-white p-8 shadow-card">
              <div className="mb-4 inline-flex rounded-full bg-purple-soft p-3 text-purple">
                {c.icon}
              </div>
              <h3 className="text-lg font-black text-ink">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Honest scoring */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 rounded-card bg-white p-8 shadow-card md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-3xl font-black text-ink">
              Scores you can actually trust
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Most prep apps quietly inflate your score so you keep coming back.
              ARNReady does the opposite: if you attempt 4 questions and get 4
              right, that is not 100% — not until you&apos;ve earned it across a
              real set. The number you see is the number that predicts your
              exam.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Free scores are measured against at least a ten-question set — 4/4 is not 100%',
                'With the full unlock, every question served counts, skipped ones included',
                'Paid chapter exams draw fresh variations every attempt',
                'The mock uses official chapter weightage',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm font-bold text-ink">
                  <span className="mt-0.5 text-green">
                    <CheckCircle size={18} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <Arnie mood="thinking" size={220} />
          </div>
        </div>
      </section>

      {/* Free tier honesty */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-black text-ink">
          Free means actually free
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted">
          Knowledge is free. Mastery is earned. Here&apos;s exactly where the line
          sits — no surprises at question 3.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: <Layers size={22} />,
              title: 'All flashcards',
              body: `Every one of the ${totalFlashcards} flashcards, across all 12 chapters. Free forever, no sign-in needed.`,
            },
            {
              icon: <BookOpen size={22} />,
              title: `${CONFIG.FREE_QUESTIONS_PER_CHAPTER} questions per chapter`,
              body: 'Real questions from the same bank paid users get — the first 20 of every chapter, with full explanations.',
            },
            {
              icon: <Clock size={22} />,
              title: 'One full mock',
              body: 'Every account gets one complete 100-question mock, free. Sit it when you are ready — it only counts once.',
            },
          ].map((c) => (
            <div key={c.title} className="rounded-card bg-white p-6 shadow-card">
              <div className="mb-3 inline-flex rounded-full bg-green-soft p-2.5 text-green">
                {c.icon}
              </div>
              <h3 className="font-black text-ink">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Want everything?{' '}
          <Link href="/pricing" className="font-bold text-purple hover:underline">
            One unlock, {CONFIG.UNLOCK_PRICE_DISPLAY}, yours forever.
          </Link>
        </p>
      </section>

      <CtaBand
        heading="Chapter 1 is waiting. So is Arnie."
        sub="Start with real questions right now — no account, no card, no drama. Sign in later only if you want your progress saved."
        ctaLabel="Start practising free"
        ctaHref="/app"
      />
    </>
  );
}
