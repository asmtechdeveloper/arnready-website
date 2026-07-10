// WORKING copy — pending Anusha's voice pass + E-1/E-2 review. This page is
// in Anusha's first person; she owns every word before it ships.
import type { Metadata } from 'next';
import Arnie from '@/components/Arnie';
import CtaBand from '@/components/CtaBand';

export const metadata: Metadata = {
  title: 'About ARNReady',
  description:
    'ARNReady is an independent NISM Series V-A study aid built by ASM Tech in Bengaluru. Honest scoring, real exam practice, and a panda named Arnie.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
          <Arnie mood="proud" size={180} priority className="shrink-0" />
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-green">
              About
            </p>
            <h1 className="text-4xl font-black leading-tight text-ink">
              Hi, I&apos;m Anusha. This is Arnie. We&apos;d like you to pass.
            </h1>
          </div>
        </div>

        <div className="mt-10 space-y-5 text-sm leading-relaxed text-muted">
          <p>
            ARNReady exists because I believe earning your ARN should be fun —
            or at the very least, not miserable. The NISM Series V-A workbook is
            thorough, well-intentioned, and roughly as engaging as a train
            timetable. The exam itself is fair. The gap between the two is
            where most people give up, and that gap is what I built this to
            close.
          </p>
          <p>
            So ARNReady turns the syllabus into things you can actually do:
            practice questions with proper explanations, flashcards you can
            flip through in spare minutes, chapter exams that behave like the
            real thing, and a full 100-question mock on your laptop — because
            the real exam is on a computer, not a phone.
          </p>
          <p>
            One thing I refuse to do is flatter you. Plenty of prep tools
            inflate scores to keep you feeling good and coming back. ARNReady&apos;s
            scoring is deliberately strict: skipped questions count against
            you, and your percentage reflects what you would actually score.
            A comfortable lie in practice becomes an expensive surprise at the
            test centre — I&apos;d rather you were briefly annoyed at Arnie in July
            than genuinely upset in a test centre in August.
          </p>
          <p>
            About Arnie: he is a panda, he appears exactly where he is useful,
            and he only celebrates when you have earned it. He is very firm on
            that last point.
          </p>
          <p>
            ARNReady is built and run by me — Anusha Murthy, trading as ASM
            Tech, Bengaluru. It is an independent study aid: not affiliated
            with, endorsed by, or approved by NISM, SEBI, or AMFI. The mission
            fits in one line, and it is on every page of this site: knowledge
            is free, mastery is earned.
          </p>
        </div>
      </section>

      <CtaBand
        heading="That's the story. Now go study."
        sub="Free chapter practice, all flashcards, one full mock — Arnie will be there."
        ctaLabel="Start practising free"
        ctaHref="/app"
        mood="waving"
      />
    </>
  );
}
