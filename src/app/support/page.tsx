import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/ContentCard';
import { support, contact } from '@/lib/copy';
import { linkify } from '@/lib/linkify';

export const metadata: Metadata = {
  title: support.meta.title,
  description: support.meta.description,
  alternates: { canonical: '/support' },
};

export default function SupportPage() {
  return (
    <>
      <ContentPage title={support.h1}>
        <section>
          <h2>{support.email.h2}</h2>
          <p>{support.email.body}</p>
          <p>
            <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>
          </p>
          <p>{support.email.note}</p>
        </section>

        <section>
          <h2>{support.common.h2}</h2>
          {support.common.lines.map((line) => (
            <p key={line.text}>{linkify(line.text, line.links ?? [])}</p>
          ))}
        </section>
      </ContentPage>

      <div className="mx-auto flex max-w-reading justify-center px-gutter-mobile pb-14 sm:px-gutter-desktop">
        <Link
          href={support.cta.href}
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          {support.cta.label}
        </Link>
      </div>
    </>
  );
}
