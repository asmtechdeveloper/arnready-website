import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { faq } from '@/lib/copy';

export const metadata: Metadata = {
  title: faq.meta.title,
  description: faq.meta.description,
  alternates: { canonical: '/faq' },
};

type FaqItem = (typeof faq.items)[number];

/** Splits an answer's plain text around any linked phrase and wraps it in a <Link>. */
function renderAnswer(item: FaqItem): ReactNode {
  const links = 'links' in item ? item.links : undefined;
  if (!links || links.length === 0) return item.a;

  let remaining: ReactNode[] = [item.a];
  for (const link of links) {
    remaining = remaining.flatMap((chunk) => {
      if (typeof chunk !== 'string' || !chunk.includes(link.label)) return [chunk];
      const [before, after] = chunk.split(link.label);
      return [
        before,
        <Link key={link.href} href={link.href} className="text-purple hover:underline">
          {link.label}
        </Link>,
        after,
      ];
    });
  }
  return remaining;
}

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
    <div className="mx-auto max-w-reading px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-purple sm:text-4xl">{faq.h1}</h1>
      <div className="mt-8 space-y-8">
        {faq.items.map((item) => (
          <div key={item.q} className="rounded-card bg-white p-6 shadow-card">
            <h2 className="text-base font-bold text-ink">{item.q}</h2>
            <p className="mt-2 text-[0.95rem] leading-7 text-muted">{renderAnswer(item)}</p>
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
