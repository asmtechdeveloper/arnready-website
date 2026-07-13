import type { Metadata } from 'next';
import Link from 'next/link';
import { Arnie } from '@/components/Arnie';
import { about } from '@/lib/copy';

export const metadata: Metadata = {
  title: about.meta.title,
  description: about.meta.description,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-reading px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{about.h1}</h1>

      <div className="mt-8 space-y-6 text-base leading-7 text-muted">
        <p className="rounded-control border border-line bg-white p-4 text-sm italic text-muted">
          {about.originSlot}
        </p>
        <p>{about.body2}</p>
        <p>{about.body3}</p>
      </div>

      <div className="mt-10 flex justify-center">
        <Arnie mood="reading" size={160} />
      </div>
      <p className="mt-4 text-center text-sm leading-7 text-muted">{about.arnieIntro}</p>

      <div className="mt-10 flex justify-center">
        <Link
          href={about.cta.href}
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          {about.cta.label}
        </Link>
      </div>
    </div>
  );
}
