import type { Metadata } from 'next';
import { ContentPage } from '@/components/ContentCard';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How ARNReady collects, stores, and protects your data.',
  alternates: { canonical: '/privacy' },
};

// WORKING — awaiting Anusha's voice pass + legal accuracy review (copy
// scaffold §12: "[VERIFY by Anusha]"). Reflects the 13 Jul product model:
// the web is ad-free (no AdMob on web surfaces); Razorpay is approved for
// a future website checkout but is not live yet.
export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy Policy" meta="Last updated: July 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          ARNReady is built and operated by Anusha Murthy, trading as ASM
          Tech, Bengaluru, India. If you have questions about this policy,
          email{' '}
          <a href="mailto:asmtechdeveloper@gmail.com">asmtechdeveloper@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <p>If you sign in with Google, on the app or on the website:</p>
        <ul>
          <li>Your name and email address from your Google account</li>
          <li>Your display name, if you choose to set one</li>
          <li>Your exam date, if you choose to enter it</li>
        </ul>
        <p>Automatically, once signed in:</p>
        <ul>
          <li>Your progress through chapters, flashcards, and mock tests</li>
          <li>Questions you answered correctly and incorrectly</li>
          <li>Crash and performance data via Firebase</li>
          <li>
            Ad performance data via Google AdMob — Android app free users
            only. The website is ad-free; no ad data is collected here.
          </li>
        </ul>
        <p>We never collect your payment card details, your location, or your contacts.</p>
      </section>

      <section>
        <h2>Where your data lives</h2>
        <p>
          Your account and study data are stored in Google Firebase (Cloud
          Firestore), in the asia-south1 (Mumbai) region.
        </p>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To save your progress across sessions, devices, and platforms</li>
          <li>To show your score honestly and point out weak areas</li>
          <li>To serve relevant ads to free users of the Android app</li>
          <li>To fix bugs and improve the product</li>
        </ul>
      </section>

      <section>
        <h2>Third parties</h2>
        <ul>
          <li>Google Firebase — authentication and data storage</li>
          <li>Google AdMob — advertising for free users of the Android app only</li>
          <li>Google Play — payment processing for the app&rsquo;s premium unlock; we never see your card details</li>
          <li>
            Razorpay — planned for website checkout; not live yet. We will
            name it here again, with full detail, before it goes live, and we
            will never see your card details.
          </li>
        </ul>
        <p>None of these parties receive your data for their own marketing purposes beyond their standard platform terms.</p>
      </section>

      <section>
        <h2>Your data, your rights</h2>
        <ul>
          <li>
            You can delete your account and all associated data — in the app
            (Profile → Delete Account) or by email. Details:{' '}
            <a href="/delete-account">Delete account</a>
          </li>
          <li>
            You can request a copy of your data at any time by emailing{' '}
            <a href="mailto:asmtechdeveloper@gmail.com">asmtechdeveloper@gmail.com</a>
          </li>
          <li>Paid users are ad-free everywhere — AdMob does not run on paid accounts</li>
        </ul>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          ARNReady is intended for adults preparing for a professional
          certification. We do not knowingly collect data from anyone under 18.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If we make material changes, we will notify you within the app or on
          this website. Continued use after notification means you accept the
          updated policy.
        </p>
      </section>
    </ContentPage>
  );
}
