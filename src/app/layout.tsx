import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://arnready.com'),
  title: {
    default: 'ARNReady — NISM Series V-A Mock Tests, Practice Questions & Flashcards',
    template: '%s — ARNReady',
  },
  description:
    'Prepare for the NISM Series V-A Mutual Fund Distributor exam with honest mock tests, 1,000+ practice questions and free flashcards. Built in India, for India.',
  icons: { icon: '/favicon.png' },
  openGraph: {
    siteName: 'ARNReady',
    type: 'website',
    images: ['/icon-512.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
