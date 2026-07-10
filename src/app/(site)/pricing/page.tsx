// WORKING copy — pending Anusha's voice pass + E-1/E-2 review.
// PURCHASE AVAILABILITY IS WORKING STATE (10 Jul): web checkout (Razorpay)
// ships at Web-3 and the Android app is pending its Play release. Until
// either is live, this page must NOT claim you can buy right now — the
// upgrade card says "coming soon". Update this copy the day checkout ships.
import type { Metadata } from 'next';
import Link from 'next/link';
import CtaBand from '@/components/CtaBand';
import { Check, X } from '@/components/Icon';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Pricing — Free Tier & One-Time Unlock',
  description: `ARNReady pricing: a genuinely useful free tier, and one ${CONFIG.UNLOCK_PRICE_DISPLAY} unlock for the full NISM Series V-A question bank, unlimited mocks, and no ads. No subscription.`,
  alternates: { canonical: '/pricing' },
};

const ROWS: Array<{ feature: string; free: string | boolean; paid: string | boolean }> = [
  { feature: 'Flashcards (all 12 chapters)', free: true, paid: true },
  { feature: 'Practice questions per chapter', free: 'First 20', paid: 'Entire bank' },
  { feature: 'Chapter exams (30 questions)', free: 'From free pool', paid: 'Fresh variations every attempt' },
  { feature: 'Full 100-question mock', free: 'One, ever', paid: 'Unlimited' },
  { feature: 'Mistakes deck (retry what you got wrong)', free: true, paid: true },
  { feature: 'Progress & weak-chapter tracking', free: 'With free sign-in', paid: true },
  { feature: 'Ads', free: 'Yes', paid: 'None' },
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true)
    return (
      <span className="inline-flex text-green" aria-label="Included">
        <Check size={18} />
      </span>
    );
  if (v === false)
    return (
      <span className="inline-flex text-muted" aria-label="Not included">
        <X size={18} />
      </span>
    );
  return <span className="text-xs font-bold text-muted">{v}</span>;
}

export default function PricingPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pt-16 text-center sm:px-6">
        <p className="mb-3 text-sm font-black uppercase tracking-widest text-green">
          Pricing
        </p>
        <h1 className="text-4xl font-black leading-tight text-ink">
          One price. No subscription. No fine print.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
          The free tier is genuinely useful — enough to study every chapter and
          sit a full mock. When you want the whole bank and unlimited mocks,
          it&apos;s {CONFIG.UNLOCK_PRICE_DISPLAY} once, yours forever. Less than
          the auto fare to your test centre.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-card bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-5 py-4 font-black text-ink">What you get</th>
                <th className="w-32 px-4 py-4 text-center font-black text-ink">Free</th>
                <th className="w-40 px-4 py-4 text-center">
                  <span className="rounded-full bg-purple px-3 py-1 text-xs font-black text-white">
                    {CONFIG.UNLOCK_PRICE_DISPLAY} once
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.feature} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5 font-bold text-ink">{r.feature}</td>
                  <td className="px-4 py-3.5 text-center">
                    <Cell v={r.free} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Cell v={r.paid} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-3xl px-4 sm:px-6">
        <div className="rounded-card border border-purple/20 bg-purple-soft p-6">
          <h2 className="font-black text-ink">Buying the unlock</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Web checkout is coming soon — one payment of{' '}
            {CONFIG.UNLOCK_PRICE_DISPLAY} tied to your Google sign-in, so the
            unlock works everywhere you use ARNReady, on the web and in the
            Android app. Until then, everything on the free tier is open right
            now, and your progress carries over the moment you upgrade.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl font-black text-ink">Honest answers to fair questions</h2>
        <div className="mt-6 space-y-4">
          {[
            {
              q: 'Why is the free mock limited to one?',
              a: 'Because your first mock is a diagnostic, and a diagnostic only works once. Unlimited free mocks would tempt you to burn them casually — one free mock makes it count. Paid users get unlimited mocks with fresh draws.',
            },
            {
              q: 'Is this a subscription in disguise?',
              a: `No. ${CONFIG.UNLOCK_PRICE_DISPLAY} once, everything unlocked, forever. There is nothing else to buy.`,
            },
            {
              q: 'Do free and paid users get different questions?',
              a: 'Same bank, same quality. Free covers the first 20 questions of each chapter; paid opens the rest and generates fresh exam variations. The free questions are not the easy ones — they are simply the first ones.',
            },
          ].map((f) => (
            <div key={f.q} className="rounded-card bg-white p-6 shadow-card">
              <h3 className="font-black text-ink">{f.q}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.a}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          More questions? The{' '}
          <Link href="/faq" className="font-bold text-purple hover:underline">
            FAQ
          </Link>{' '}
          has the long answers.
        </p>
      </section>

      <CtaBand
        heading="Start free. Upgrade only if it earns it."
        sub="Every chapter, every flashcard, one full mock — free. The unlock will be here when you want more."
        ctaLabel="Start practising free"
        ctaHref="/app"
      />
    </>
  );
}
