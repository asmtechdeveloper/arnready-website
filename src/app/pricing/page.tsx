import type { Metadata } from 'next';
import Link from 'next/link';
import { Arnie } from '@/components/Arnie';
import { pricing } from '@/lib/copy';

export const metadata: Metadata = {
  title: pricing.meta.title,
  description: pricing.meta.description,
  alternates: { canonical: '/pricing' },
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-content px-gutter-mobile py-14 sm:px-gutter-desktop">
      <div className="mx-auto max-w-reading text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{pricing.h1}</h1>
        <p className="mt-4 text-base leading-7 text-muted">{pricing.sub}</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-content gap-6 sm:grid-cols-2">
        <div className="rounded-card bg-white p-8 shadow-card">
          <h2 className="text-xl font-bold text-ink">{pricing.free.title}</h2>
          <p className="mt-1 text-sm text-muted">{pricing.free.note}</p>
          <ul className="mt-6 space-y-3 text-[0.95rem] leading-7 text-muted">
            {pricing.free.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-card border-2 border-purple bg-white p-8 shadow-card">
          <h2 className="text-xl font-bold text-purple">{pricing.premium.title}</h2>
          <p className="mt-1 text-sm text-muted">{pricing.premium.note}</p>
          <ul className="mt-6 space-y-3 text-[0.95rem] leading-7 text-muted">
            {pricing.premium.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-8">
            <button
              type="button"
              disabled
              className="w-full rounded-pill bg-purple/40 px-6 py-3 text-base font-bold text-white"
              title={pricing.premium.checkoutTitle}
            >
              {pricing.premium.checkoutLabel}
            </button>
            <p className="mt-3 text-center text-sm text-muted">{pricing.premium.checkoutNote}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-reading flex-col items-center gap-6 text-center">
        <Arnie mood="thinking" size={140} />
        <p className="text-base leading-7 text-muted">{pricing.bottom.note}</p>
        <Link
          href={pricing.bottom.cta.href}
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          {pricing.bottom.cta.label}
        </Link>
      </div>
    </div>
  );
}
