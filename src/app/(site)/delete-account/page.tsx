// Ported from the live delete-account.html (the Play-gate compliance page).
// Copy preserved; do not reword without re-running the compliance check.
import type { Metadata } from 'next';
import Link from 'next/link';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Delete Your ARNReady Account',
  description:
    'How to permanently delete your ARNReady account and all associated study data — in the app or by email.',
  alternates: { canonical: '/delete-account' },
};

const EMAIL = CONFIG.SUPPORT_EMAIL;

const TABLE: Array<[string, string]> = [
  ['Your sign-in record (name, email)', 'Yes, permanently'],
  ['Chapter progress, scores, mock test history', 'Yes, permanently'],
  ['Mistakes deck and study data', 'Yes, permanently'],
  ['Premium unlock on the account', 'Yes — see the note below'],
  ['Payment audit records', 'Retained where required for tax and accounting compliance'],
  ['Google Play purchase records', 'Held by Google under its own policies'],
];

export default function DeleteAccountPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <h1 className="text-4xl font-black leading-tight text-purple">
        Delete your ARNReady account
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated: July 2026</p>

      <div className="prose-arnready mt-8 rounded-card bg-white p-8 shadow-card sm:p-10">
        <h2>In the app (fastest)</h2>
        <p>
          Open ARNReady and go to{' '}
          <strong className="text-ink">Profile &rarr; Delete Account</strong>,
          then confirm. This immediately and permanently deletes your sign-in
          record and all your study data &mdash; chapter progress, scores, mock
          test history, and your mistakes deck.
        </p>

        <h2>By email</h2>
        <p>
          If you can no longer access the app, email us from the Google account
          you used to sign in, with the subject &ldquo;Delete my ARNReady
          account&rdquo;:
        </p>
        <p>
          <a
            className="inline-block rounded-lg border border-purple bg-cream px-4 py-2 font-bold"
            href={`mailto:${EMAIL}`}
          >
            {EMAIL}
          </a>
        </p>
        <p>We aim to complete deletion within 48 hours and will confirm by reply.</p>

        <h2>What is deleted, and what isn&apos;t</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Deleted?</th>
            </tr>
          </thead>
          <tbody>
            {TABLE.map(([k, v]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* WORKING [VERIFY]: permanence/restoration wording pending device QA
            on a throwaway account (app repo). CF behaviour verified in code:
            recursive delete of users/{uid}, Auth user deleted, purchase-audit
            docs retained, idempotent. */}
        <div className="mt-4 rounded-xl bg-amber-soft p-4 text-sm leading-relaxed text-ink">
          <strong>Deleting your account is final.</strong> Your progress cannot
          be recovered, and premium access cannot be restored to a deleted
          account &mdash; even if you sign in again with the same Google
          account. Deleting your account does not entitle you to a refund.
        </div>

        <h2>Questions?</h2>
        <p>
          Anything about your data or this process:{' '}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a> or see{' '}
          <Link href="/support">Support</Link>.
        </p>
      </div>
    </section>
  );
}
