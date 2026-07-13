import Link from 'next/link';
import { Arnie } from '@/components/Arnie';
import { home } from '@/lib/copy';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-content px-4 py-16 sm:px-6">
      <section className="grid items-center gap-10 sm:grid-cols-2">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
            {home.hero.h1}
          </h1>
          <p className="mt-4 max-w-reading text-lg leading-8 text-muted">{home.hero.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={home.hero.ctaPrimary.href}
              className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
            >
              {home.hero.ctaPrimary.label}
            </Link>
            <Link
              href={home.hero.ctaSecondary.href}
              className="rounded-pill border border-line px-6 py-3 text-base font-semibold text-ink hover:border-purple hover:text-purple"
            >
              {home.hero.ctaSecondary.label}
            </Link>
          </div>
        </div>
        <div className="flex justify-center">
          <Arnie mood="waving" size={220} priority />
        </div>
      </section>

      <section className="mt-section-gap-public grid gap-8 sm:grid-cols-3">
        {home.steps.map((step) => (
          <div key={step.title} className="rounded-card bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-section-gap-public max-w-reading">
        <h2 className="text-2xl font-extrabold text-ink">{home.honesty.h2}</h2>
        <p className="mt-3 text-base leading-7 text-muted">{home.honesty.body}</p>
      </section>
    </div>
  );
}
