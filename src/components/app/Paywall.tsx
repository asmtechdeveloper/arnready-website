'use client';

/**
 * The free-cap paywall (after Q20 of a chapter, or the second mock).
 * LOCKED: no ads on this surface, ever. The website may sell freely —
 * this links to /pricing; web checkout itself ships at Web-3.
 */
import Link from 'next/link';
import Arnie from '@/components/Arnie';
import { Check } from '@/components/Icon';
import { CONFIG } from '@/lib/config';

export default function Paywall({
  heading,
  sub,
  secondaryLabel,
  onSecondary,
}: {
  heading: string;
  sub: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="rounded-card bg-white p-10 shadow-card">
        <Arnie mood="proud" size={140} className="mx-auto" />
        <h2 className="mt-6 text-2xl font-black text-ink">{heading}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{sub}</p>

        <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left">
          {[
            'The full question bank, every chapter',
            'Fresh exam variations every attempt',
            'Unlimited full mocks',
            'No ads, ever',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm font-bold text-ink">
              <span className="mt-0.5 text-green">
                <Check size={16} />
              </span>
              {t}
            </li>
          ))}
        </ul>

        <Link
          href="/pricing"
          className="mt-8 block w-full rounded-full bg-purple px-8 py-3 text-sm font-black text-white transition-colors hover:bg-purple-dark"
        >
          Unlock everything — {CONFIG.UNLOCK_PRICE_DISPLAY}, once
        </Link>
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="mt-3 w-full rounded-full px-8 py-3 text-sm font-black text-purple hover:bg-purple-soft"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
