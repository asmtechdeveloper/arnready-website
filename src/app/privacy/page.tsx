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

export default function PrivacyPage() {
  return (
    <>
      <ContentPage title={privacy.h1} meta={privacy.meta_updated}>
        {privacy.sections.map((section) => (
          <section key={section.h2}>
            <h2>{section.h2}</h2>
            {section.blocks.map((block, i) => {
              if (block.type === 'email') {
                return (
                  <p key={i}>
                    <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>
                  </p>
                );
              }
              if (block.type === 'ul') {
                return (
                  <ul key={i}>
                    {block.items.map((item) => (
                      <li key={item.text}>{linkify(item.text, item.links ?? [])}</li>
                    ))}
                  </ul>
                );
              }
              return <p key={i}>{linkify(block.text, block.links ?? [])}</p>;
            })}
          </section>
        ))}
      </ContentPage>

      <div className="mx-auto flex max-w-reading justify-center px-gutter-mobile pb-14 sm:px-gutter-desktop">
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
