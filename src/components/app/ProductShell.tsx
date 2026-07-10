'use client';

/**
 * Client chrome for every /app surface. Mounts the auth listener once and
 * renders the product header. Unsigned visitors get the full free tier —
 * sign-in is offered, never demanded (locked access model).
 */
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuthSync, useAuth } from '@/lib/stores';
import SignInButton from '@/components/app/SignInButton';

const NAV = [
  { href: '/app', label: 'Study', exact: true },
  { href: '/app/mock', label: 'Mock' },
  { href: '/app/flashcards', label: 'Flashcards' },
  { href: '/app/progress', label: 'Progress' },
];

export default function ProductShell({ children }: { children: React.ReactNode }) {
  useAuthSync();
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2" aria-label="ARNReady home">
              <Image src="/favicon.png" alt="" width={28} height={28} className="rounded-lg" />
              <span className="hidden text-lg font-black tracking-tight text-purple sm:inline">
                ARNReady
              </span>
            </Link>
            <nav className="flex items-center gap-4" aria-label="Product">
              {NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-bold transition-colors hover:text-purple ${
                      active ? 'text-purple' : 'text-muted'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/app/account"
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-ink shadow-card hover:text-purple"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-soft text-xs font-black text-purple">
                  {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{user.displayName ?? 'Account'}</span>
              </Link>
            ) : (
              <SignInButton />
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
