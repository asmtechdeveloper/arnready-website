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

const rules = [
  { label: 'Delete account', href: '/delete-account' },
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'FAQ', href: '/faq' },
];

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
          <p>{linkify(support.common.deleteLine, rules)}</p>
          <p>{linkify(support.common.privacyLine, rules)}</p>
          <p>{linkify(support.common.faqLine, rules)}</p>
        </section>
      </ContentPage>

      <div className="mx-auto flex max-w-reading justify-center px-4 pb-14 sm:px-6">
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
