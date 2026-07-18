import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthProvider } from '@/components/AuthProvider';
import { brand, home } from '@/lib/copy';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://arnready.com'),
  title: {
    default: home.meta.title,
    template: `%s — ${brand.name}`,
  },
  description: home.meta.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        {/* Auth listener mounts once for the whole site (M3) — the header's
            sign-in slot needs it on public pages too, so it wraps everything. */}
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
