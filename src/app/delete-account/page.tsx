import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/ContentCard';
import { deleteAccount, contact } from '@/lib/copy';
import { linkify } from '@/lib/linkify';

export const metadata: Metadata = {
  title: deleteAccount.meta.title,
  description: deleteAccount.meta.description,
  alternates: { canonical: '/delete-account' },
};

export default function DeleteAccountPage() {
  return (
    <>
      <ContentPage title={deleteAccount.h1} meta={deleteAccount.meta_updated}>
        <section>
          <h2>{deleteAccount.inApp.h2}</h2>
          <p>{deleteAccount.inApp.body}</p>
        </section>

        <section>
          <h2>{deleteAccount.byEmail.h2}</h2>
          <p>{deleteAccount.byEmail.intro}</p>
          <p>
            <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>
          </p>
          <p>{deleteAccount.byEmail.outro}</p>
        </section>

        <section>
          <h2>{deleteAccount.table.h2}</h2>
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">{deleteAccount.table.caption}</caption>
            <thead>
              <tr className="border-b border-line">
                {deleteAccount.table.columns.map((col) => (
                  <th key={col} scope="col" className="py-2 pr-4 font-bold text-ink">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-muted">
              {deleteAccount.table.rows.map(([label, value]) => (
                <tr key={label} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">
                    {label}
                  </th>
                  <td className="py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-control border border-amber bg-amber/10 p-4">
          <p className="text-ink">
            <strong>{deleteAccount.finalNote.lead}</strong> {deleteAccount.finalNote.rest}
          </p>
        </section>

        <section>
          <h2>{deleteAccount.questions.h2}</h2>
          <p>{linkify(deleteAccount.questions.body.text, deleteAccount.questions.body.links ?? [])}</p>
        </section>
      </ContentPage>

      <div className="mx-auto flex max-w-reading justify-center px-gutter-mobile pb-14 sm:px-gutter-desktop">
        <Link
          href={deleteAccount.cta.href}
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          {deleteAccount.cta.label}
        </Link>
      </div>
    </>
  );
}
