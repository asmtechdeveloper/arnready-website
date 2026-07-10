// WORKING copy — pending Anusha's voice pass + E-1/E-2 review.
import type { Metadata } from 'next';
import Link from 'next/link';
import Arnie from '@/components/Arnie';
import CtaBand from '@/components/CtaBand';
import { Clock, Flag, Grid, Monitor } from '@/components/Icon';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Free NISM Series V-A Mock Test — 100 Questions, 120 Minutes',
  description:
    'Take a full NISM Series V-A mock test online: 100 questions, 2 hours, official chapter weightage, question palette and keyboard shortcuts. One full mock free per account.',
  alternates: { canonical: '/mock-test' },
};

export default function MockTestPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="flex flex-col-reverse items-center gap-10 md:flex-row md:justify-between">
          <div className="max-w-xl text-center md:text-left">
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-green">
              The full dress rehearsal
            </p>
            <h1 className="text-4xl font-black leading-tight text-ink sm:text-5xl">
              A mock that behaves like the real exam
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted">
              {CONFIG.MOCK_QUESTIONS} questions, {CONFIG.MOCK_DURATION_MIN}{' '}
              minutes, drawn chapter by chapter in the official weightage. Sit
              it on your laptop the way you&apos;ll sit the real thing at the test
              centre — and get a weak-chapter breakdown at the end, not just a
              number.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row md:justify-start">
              <Link
                href="/app/mock"
                className="rounded-full bg-purple px-8 py-3.5 text-sm font-black text-white shadow-card transition-colors hover:bg-purple-dark"
              >
                Take the free mock
              </Link>
              <p className="text-xs font-bold text-muted">
                One full mock free per account
              </p>
            </div>
          </div>
          <Arnie mood="meditating" size={240} priority className="shrink-0" />
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-black text-ink">Built for a laptop, on purpose</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted">
          The real exam is computer-based. Practising 100 questions on a phone
          is like training for a marathon on a treadmill set to stroll.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <Grid size={22} />,
              title: 'Question palette',
              body: 'See all 100 questions at a glance — answered, skipped, flagged. Jump anywhere instantly, exactly like the test-centre software.',
            },
            {
              icon: <Clock size={22} />,
              title: 'Real 120-minute timer',
              body: 'A proper countdown with quiet warnings. Time management is half this exam; the mock makes you practise it.',
            },
            {
              icon: <Flag size={22} />,
              title: 'Flag and return',
              body: 'Not sure? Flag it, move on, come back. The habit that saves borderline candidates 5 marks.',
            },
            {
              icon: <Monitor size={22} />,
              title: 'Keyboard shortcuts',
              body: 'Answer with A–D, move with arrow keys, flag with F. Your hands stay on the keys; your mind stays on the paper.',
            },
          ].map((c) => (
            <div key={c.title} className="rounded-card bg-white p-6 shadow-card">
              <div className="mb-3 inline-flex rounded-full bg-purple-soft p-2.5 text-purple">
                {c.icon}
              </div>
              <h3 className="font-black text-ink">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-black text-ink">How the mock is assembled</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Each mock draws {CONFIG.MOCK_QUESTIONS} questions using the official
          NISM chapter weightage — 15 from Investor Services, 15 from Scheme
          Selection, 10 from the Regulatory Framework, and so on down to 4 from
          Legal Structure. No repeats within a paper, fresh draws every time.
          The full weightage table is on the{' '}
          <Link href="/syllabus" className="font-bold text-purple hover:underline">
            syllabus page
          </Link>
          .
        </p>
        <h2 className="mt-10 text-2xl font-black text-ink">Why only one free mock?</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Because a mock only tells the truth once. Your first full attempt is
          the honest baseline — sit it when you&apos;ve done some chapter work and
          treat it like the real day. After that, unlimited mocks come with{' '}
          <Link href="/pricing" className="font-bold text-purple hover:underline">
            the {CONFIG.UNLOCK_PRICE_DISPLAY} unlock
          </Link>
          , alongside the full question bank. Signing in (free) is required for
          the mock so your attempt and results stay with your account.
        </p>
      </section>

      <CtaBand
        heading="Two hours. One hundred questions. Zero surprises later."
        sub="Sit the free mock under real conditions and find out exactly where you stand."
        ctaLabel="Take the free mock"
        ctaHref="/app/mock"
        mood="meditating"
      />
    </>
  );
}
