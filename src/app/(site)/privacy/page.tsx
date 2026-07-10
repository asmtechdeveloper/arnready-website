// Ported from the live privacy.html (the Play-gate compliance page).
// Copy preserved; do not reword without re-running the compliance check.
import type { Metadata } from 'next';
import Link from 'next/link';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'ARNReady privacy policy',
  alternates: { canonical: '/privacy' },
};

const EMAIL = CONFIG.SUPPORT_EMAIL;

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <h1 className="text-4xl font-black leading-tight text-purple">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: July 2026</p>

      <div className="prose-arnready mt-8 rounded-card bg-white p-8 shadow-card sm:p-10">
        <h2>Who we are</h2>
        <p>
          ARNReady is built and operated by Anusha Murthy, trading as ASM Tech,
          Bengaluru, India. If you have questions about this policy, email{' '}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>

        <h2>What we collect</h2>
        <p>If you sign in (Google account):</p>
        <ul>
          <li>Your name and email address from your Google account</li>
          <li>Your display name if you choose to set one</li>
          <li>Your exam date if you choose to enter it</li>
        </ul>
        <p>Automatically, once signed in:</p>
        <ul>
          <li>Your progress through chapters and mock tests</li>
          <li>Questions you answered correctly and incorrectly</li>
          <li>Ad performance data via Google AdMob (free users of the Android app only)</li>
          <li>Crash and performance data via Firebase</li>
        </ul>
        <p>If you sign up for launch updates on this website:</p>
        <ul>
          <li>
            The email address you enter in the form &mdash; processed by
            Formspree and used only to send you ARNReady updates
          </li>
        </ul>
        <p>We never collect:</p>
        <ul>
          <li>
            Your payment card details &mdash; payments are handled entirely by
            Google Play
          </li>
          <li>Your location</li>
          <li>Your contacts or any data outside ARNReady</li>
        </ul>

        <h2>Where your data lives</h2>
        <p>
          Your account and study data are stored in Google Firebase (Cloud
          Firestore), in the asia-south1 (Mumbai) region.
        </p>

        <h2>How we use it</h2>
        <ul>
          <li>To save your progress across sessions and devices</li>
          <li>To show you your Prepometer score and weak areas</li>
          <li>To serve relevant ads to free users via Google AdMob</li>
          <li>To fix bugs and improve the app</li>
        </ul>
        <p>
          With your permission: when you first sign in, you can choose whether
          to receive occasional updates from ARNReady &mdash; new features,
          exam tips, and study resources. Untick the box and we won&apos;t send
          them. You can unsubscribe at any time from any email we send. We will
          never sell or share your email address with third parties for
          marketing purposes.
        </p>

        <h2>Third parties</h2>
        <ul>
          <li>Google Firebase &mdash; authentication and data storage</li>
          <li>Google AdMob &mdash; advertising for free users (Android app)</li>
          <li>
            Google Play &mdash; payment processing for the app&apos;s premium
            unlock; we never see your card details
          </li>
          <li>Formspree &mdash; processes the launch-updates email form on this website</li>
        </ul>
        <p>
          None of these parties receive your data for their own marketing
          purposes beyond their standard platform terms. If we add a way to pay
          on the website, we will name the payment provider here before it goes
          live.
        </p>

        <h2>Your data, your rights</h2>
        <ul>
          <li>
            You can delete your account and all associated data &mdash; in the
            app (Profile &rarr; Delete Account) or by email. Details:{' '}
            <Link href="/delete-account">Delete account</Link>
          </li>
          <li>
            You can request a copy of your data at any time by emailing{' '}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </li>
          <li>
            Paid users are ad-free &mdash; AdMob does not run on paid accounts
          </li>
        </ul>

        <h2>Children</h2>
        <p>
          ARNReady is intended for adults preparing for a professional
          certification. We do not knowingly collect data from anyone under 18.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If we make material changes, we will notify you within the app.
          Continued use after notification means you accept the updated policy.
        </p>
      </div>
    </section>
  );
}
