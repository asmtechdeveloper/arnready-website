import type { Metadata } from 'next';
import { ContentPage } from '@/components/ContentCard';

export const metadata: Metadata = {
  title: 'Delete your account',
  description: 'How to permanently delete your ARNReady account and data.',
  alternates: { canonical: '/delete-account' },
};

// WORKING — permanence/restoration wording pending device QA on a
// throwaway account (copy scaffold §12). Deployed CF behaviour: recursive
// delete of users/{uid}, Auth user deleted, purchase-audit docs retained.
export default function DeleteAccountPage() {
  return (
    <ContentPage title="Delete your ARNReady account" meta="Last updated: July 2026">
      <section>
        <h2>In the app (fastest)</h2>
        <p>
          Open ARNReady and go to <strong>Profile → Delete Account</strong>,
          then confirm. This immediately and permanently deletes your sign-in
          record and all your study data — chapter progress, scores, mock
          test history, and your mistakes deck.
        </p>
      </section>

      <section>
        <h2>By email</h2>
        <p>
          If you can no longer access the app, email us from the Google
          account you used to sign in, with the subject &ldquo;Delete my
          ARNReady account&rdquo;:
        </p>
        <p>
          <a href="mailto:asmtechdeveloper@gmail.com">asmtechdeveloper@gmail.com</a>
        </p>
        <p>We aim to complete deletion within 48 hours and will confirm by reply.</p>
      </section>

      <section>
        <h2>What is deleted, and what isn&rsquo;t</h2>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2 pr-4 font-bold text-ink">Data</th>
              <th className="py-2 font-bold text-ink">Deleted?</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-line">
              <td className="py-2 pr-4">Your sign-in record (name, email)</td>
              <td className="py-2">Yes, permanently</td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-2 pr-4">Chapter progress, scores, mock test history</td>
              <td className="py-2">Yes, permanently</td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-2 pr-4">Mistakes deck and study data</td>
              <td className="py-2">Yes, permanently</td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-2 pr-4">Premium unlock on the account</td>
              <td className="py-2">Yes — see the note below</td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-2 pr-4">Payment audit records</td>
              <td className="py-2">Retained where required for tax and accounting compliance</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Google Play purchase records</td>
              <td className="py-2">Held by Google under its own policies</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="rounded-control border border-amber bg-amber/10 p-4">
        <p className="text-ink">
          <strong>Deleting your account is final.</strong> Your progress
          cannot be recovered, and premium access cannot be restored to a
          deleted account — even if you sign in again with the same Google
          account. Deleting your account does not entitle you to a refund.
        </p>
      </section>

      <section>
        <h2>Questions?</h2>
        <p>
          Anything about your data or this process:{' '}
          <a href="mailto:asmtechdeveloper@gmail.com">asmtechdeveloper@gmail.com</a>{' '}
          or see <a href="/support">Support</a>.
        </p>
      </section>
    </ContentPage>
  );
}
