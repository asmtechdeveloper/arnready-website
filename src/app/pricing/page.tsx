import type { Metadata } from 'next';
import Link from 'next/link';
import { Arnie } from '@/components/Arnie';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'ARNReady is free to start. Everything, unlocked once, for ₹250.',
  alternates: { canonical: '/pricing' },
};

// WORKING — awaiting Anusha's voice pass. Web checkout (Razorpay) isn't
// live yet (manual M7); the CTA below says so honestly.
export default function PricingPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-reading text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Free to start. ₹250 once, for everything.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          No subscription, no discount theatrics, no countdown clock. One
          payment unlocks the full question bank, unlimited mocks, and answer
          review — on the app today, and on the website once web checkout
          ships.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-content gap-6 sm:grid-cols-2">
        <div className="rounded-card bg-white p-8 shadow-card">
          <h2 className="text-xl font-bold text-ink">Free</h2>
          <p className="mt-1 text-sm text-muted">No card, no trial clock.</p>
          <ul className="mt-6 space-y-3 text-[0.95rem] leading-7 text-muted">
            <li>20 real practice questions per chapter</li>
            <li>Chapter exam mode, same free question set</li>
            <li>One full mock test, ever</li>
            <li>Every flashcard, forever</li>
            <li>Mistakes deck and progress tracking</li>
          </ul>
        </div>

        <div className="rounded-card border-2 border-purple bg-white p-8 shadow-card">
          <h2 className="text-xl font-bold text-purple">Premium — ₹250 once</h2>
          <p className="mt-1 text-sm text-muted">One-time. About the price of a good chai and a decent samosa.</p>
          <ul className="mt-6 space-y-3 text-[0.95rem] leading-7 text-muted">
            <li>The complete question bank, every chapter</li>
            <li>Unlimited mock tests</li>
            <li>Full answer review on every question</li>
            <li>Zero nudges, anywhere</li>
            <li>Pay once, anywhere — the website and the app unlock together</li>
          </ul>
          <div className="mt-8">
            <button
              type="button"
              disabled
              className="w-full rounded-pill bg-purple/40 px-6 py-3 text-base font-bold text-white"
              title="Web checkout is coming soon"
            >
              Web checkout — coming soon
            </button>
            <p className="mt-3 text-center text-sm text-muted">
              Premium is live on the app today.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-reading flex-col items-center gap-6 text-center">
        <Arnie mood="proud" size={140} />
        <p className="text-base leading-7 text-muted">
          Pay once, anywhere — the website and the app unlock together,
          forever. No subscription, ever.
        </p>
        <Link
          href="/syllabus"
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          Start free — no sign-in needed
        </Link>
      </div>
    </div>
  );
}
