import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/ContentCard';
import { privacy, contact } from '@/lib/copy';
import { linkify } from '@/lib/linkify';

export const metadata: Metadata = {
  title: privacy.meta.title,
  description: privacy.meta.description,
  alternates: { canonical: '/privacy' },
};

const rules = [
  { label: 'the delete-account page', href: '/delete-account' },
  { label: 'emailing us', href: `mailto:${contact.supportEmail}` },
];

export default function PrivacyPage() {
  return (
    <>
      <ContentPage title={privacy.h1} meta={privacy.meta_updated}>
        {privacy.sections.map((section) => (
          <section key={section.h2}>
            <h2>{section.h2}</h2>
            {section.paragraphs?.map((p) => <p key={p}>{linkify(p, rules)}</p>)}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{linkify(item, rules)}</li>
                ))}
              </ul>
            )}
            {section.paragraphs2?.map((p) => <p key={p}>{linkify(p, rules)}</p>)}
            {section.list2 && (
              <ul>
                {section.list2.map((item) => (
                  <li key={item}>{linkify(item, rules)}</li>
                ))}
              </ul>
            )}
            {section.paragraphs3?.map((p) => <p key={p}>{linkify(p, rules)}</p>)}
            {section.h2 === 'Who we are' && (
              <p>
                <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>
              </p>
            )}
          </section>
        ))}
      </ContentPage>

      <div className="mx-auto flex max-w-reading justify-center px-4 pb-14 sm:px-6">
        <Link
          href={privacy.cta.href}
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          {privacy.cta.label}
        </Link>
      </div>
    </>
  );
}
