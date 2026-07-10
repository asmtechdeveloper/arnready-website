import Link from 'next/link';
import Arnie, { type ArnieMood } from '@/components/Arnie';

/**
 * The ONE primary CTA that ends every public page (process rule 3).
 * Keep a single action; the quiet line underneath is context, not a CTA.
 */
export default function CtaBand({
  heading,
  sub,
  ctaLabel,
  ctaHref,
  mood = 'waving',
}: {
  heading: string;
  sub: string;
  ctaLabel: string;
  ctaHref: string;
  mood?: ArnieMood;
}) {
  return (
    <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
      <div className="flex flex-col items-center gap-6 rounded-card bg-purple px-6 py-12 text-center shadow-card sm:px-12">
        <Arnie mood={mood} size={120} />
        <h2 className="max-w-2xl text-2xl font-black text-white sm:text-3xl">{heading}</h2>
        <p className="max-w-xl text-sm leading-relaxed text-purple-soft">{sub}</p>
        <Link
          href={ctaHref}
          className="rounded-full bg-white px-8 py-3 text-sm font-black text-purple transition-transform hover:scale-105"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
