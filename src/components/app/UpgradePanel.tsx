'use client';

// WORKING copy — pending Anusha's voice pass + E-1/E-2 review.
// PURCHASE AVAILABILITY IS WORKING STATE (10 Jul): web checkout (Razorpay)
// ships at Web-3 — this page must NOT claim you can buy right now. When
// checkout ships, the CTA becomes the Razorpay order flow (Opus moment,
// lives in the app repo's functions/ workspace). LOCKED: no ads on this
// surface, ever. isPaid stays SERVER-WRITE-ONLY — this page only reads it.

import Link from 'next/link';
import Arnie from '@/components/Arnie';
import { Check } from '@/components/Icon';
import { CONFIG } from '@/lib/config';
import { useAuth, useEntitlement } from '@/lib/stores';

const BENEFITS = [
  `The full question bank — every chapter, not just the first ${CONFIG.FREE_QUESTIONS_PER_CHAPTER}`,
  'Fresh exam variations on every attempt',
  'Unlimited full mocks with real chapter weightage',
  'Honest paid scoring across everything you attempt',
  'No ads, ever',
  'One unlock, web and Android app together',
];

export default function UpgradePanel() {
  const { user, ready } = useAuth();
  const ent = useEntitlement();
  const isPaid = Boolean(user) && ent.known && ent.isPaid;

  if (ready && isPaid) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <Arnie mood="celebrating" size={140} className="mx-auto" />
          <h1 className="mt-6 text-2xl font-black text-ink">You&apos;re already unlocked</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Everything&apos;s open — full bank, unlimited mocks, no ads. The
            only thing left is the studying. Off you go.
          </p>
          <Link
            href="/app"
            className="mt-8 inline-block rounded-full bg-purple px-8 py-2.5 text-sm font-black text-white hover:bg-purple-dark"
          >
            Back to the study room
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-card bg-white p-8 text-center shadow-card sm:p-10">
        <Arnie mood="proud" size={140} className="mx-auto" />
        <h1 className="mt-6 text-2xl font-black text-ink">
          Unlock everything — {CONFIG.UNLOCK_PRICE_DISPLAY}, once
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Not a subscription. One payment, tied to your Google sign-in, valid
          on the web and in the Android app.
        </p>

        <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left">
          {BENEFITS.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm font-bold text-ink">
              <span className="mt-0.5 shrink-0 text-green">
                <Check size={16} />
              </span>
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl bg-cream p-5 text-left">
          <p className="text-sm font-black text-ink">Web checkout is coming soon</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            We&apos;re finishing the payment plumbing so your unlock lands
            safely on your account. Until then the free tier is fully open —
            and everything you do now carries over the moment you upgrade.
          </p>
        </div>

        <Link
          href="/pricing"
          className="mt-6 inline-block rounded-full border-2 border-purple px-8 py-2.5 text-sm font-black text-purple hover:bg-purple-soft"
        >
          See the full pricing breakdown
        </Link>
      </div>
    </div>
  );
}
