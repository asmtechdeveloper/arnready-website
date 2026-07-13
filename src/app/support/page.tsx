import type { Metadata } from 'next';
import { ContentPage } from '@/components/ContentCard';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with ARNReady. One developer, honest answers, within 48 hours.',
  alternates: { canonical: '/support' },
};

// WORKING — copy pending Anusha's voice pass.
export default function SupportPage() {
  return (
    <ContentPage title="Support">
      <section>
        <h2>Email</h2>
        <p>
          ARNReady is built and supported by one developer, so you&rsquo;ll
          get a real answer from a real person — usually within 48 hours.
        </p>
        <p>
          <a href="mailto:asmtechdeveloper@gmail.com">asmtechdeveloper@gmail.com</a>
        </p>
        <p>Include your app or website version and, for account issues, the Gmail you sign in with.</p>
      </section>

      <section>
        <h2>Common requests</h2>
        <p>
          Deleting your account and data: <a href="/delete-account">Delete account</a>.
        </p>
        <p>
          How your data is handled: <a href="/privacy">Privacy policy</a>.
        </p>
        <p>
          Questions about the exam or the free tier: <a href="/faq">FAQ</a>.
        </p>
      </section>
    </ContentPage>
  );
}
