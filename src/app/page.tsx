import Link from 'next/link';
import { Arnie } from '@/components/Arnie';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-content px-4 py-16 sm:px-6">
      <section className="grid items-center gap-10 sm:grid-cols-2">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
            Get ARN Ready.
          </h1>
          <p className="mt-4 max-w-reading text-lg leading-8 text-muted">
            The honest prep for the NISM Series V-A Mutual Fund Distributor
            exam — on the web and in the app. Practice like it&rsquo;s the
            real thing — because here, it is.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
            >
              Get ARNReady — it&rsquo;s free to start
            </Link>
            <Link
              href="/syllabus"
              className="rounded-pill border border-line px-6 py-3 text-base font-semibold text-ink hover:border-purple hover:text-purple"
            >
              See the syllabus
            </Link>
          </div>
        </div>
        <div className="flex justify-center">
          <Arnie mood="waving" size={220} />
        </div>
      </section>

      <section className="mt-20 grid gap-8 sm:grid-cols-3">
        <div className="rounded-card bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-ink">1. Learn</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Flashcards and chapter teaching for all 12 syllabus chapters. Free.
          </p>
        </div>
        <div className="rounded-card bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-ink">2. Test yourself</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Exam mode and a full mock test, weighted like the real paper.
          </p>
        </div>
        <div className="rounded-card bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-ink">3. Trust your score</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            ARNReady never inflates your readiness. When it says you&rsquo;re
            ready, you&rsquo;re ready.
          </p>
        </div>
      </section>

      <section className="mt-20 max-w-reading">
        <h2 className="text-2xl font-extrabold text-ink">
          An app that won&rsquo;t lie to you.
        </h2>
        <p className="mt-3 text-base leading-7 text-muted">
          Most prep apps flatter you with easy scores. ARNReady&rsquo;s
          scoring is deliberately strict, because the goal isn&rsquo;t to
          make you feel ready — it&rsquo;s to make you ready.
        </p>
      </section>
    </div>
  );
}
