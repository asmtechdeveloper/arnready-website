// Ported from the live support.html (the Play-gate compliance page).
// WORKING: copy pending Anusha's voice pass.
import type { Metadata } from 'next';
import Link from 'next/link';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Support',
  description:
    'Get help with ARNReady — account issues, data questions, or anything about the app and website. Real answers from a real person.',
  alternates: { canonical: '/support' },
};

const EMAIL = CONFIG.SUPPORT_EMAIL;

export default function SupportPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <h1 className="text-4xl font-black leading-tight text-purple">Support</h1>

      <div className="prose-arnready mt-8 rounded-card bg-white p-8 shadow-card sm:p-10">
        <h2>Email</h2>
        <p>
          ARNReady is built and supported by one developer, so you&apos;ll get a
          real answer from a real person &mdash; usually within 48 hours.
        </p>
        <p>
          <a
            className="inline-block rounded-lg border border-purple bg-cream px-4 py-2 font-bold"
            href={`mailto:${EMAIL}`}
          >
            {EMAIL}
          </a>
        </p>
        <p>
          Include your app version and, for account issues, the Gmail you sign
          in with.
        </p>

        <h2>Common requests</h2>
        <p>
          Deleting your account and data:{' '}
          <Link href="/delete-account">Delete account</Link>.
        </p>
        <p>
          How your data is handled: <Link href="/privacy">Privacy policy</Link>.
        </p>
      </div>
    </section>
  );
}
