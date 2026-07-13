import type { Metadata } from 'next';
import Link from 'next/link';
import { faq } from '@/lib/copy';
import { linkify } from '@/lib/linkify';

export const metadata: Metadata = {
  title: faq.meta.title,
  description: faq.meta.description,
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      <h1 className="text-3xl font-extrabold tracking-tight text-purple sm:text-4xl">{faq.h1}</h1>
      <div className="mt-8 space-y-8">
        {faq.items.map((item) => (
          <div key={item.q} className="rounded-card bg-white p-6 shadow-card">
            <h2 className="text-base font-bold text-ink">{item.q}</h2>
            <p className="mt-2 text-[0.95rem] leading-7 text-muted">{linkify(item.a, item.links ?? [])}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Link
          href={faq.cta.href}
          className="inline-block rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          {faq.cta.label}
        </Link>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
