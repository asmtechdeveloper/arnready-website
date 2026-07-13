import Link from 'next/link';
import { nav } from '@/lib/copy';

export function Header() {
  return (
    <header className="border-b border-line bg-bg">
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-purple">
          ARNReady
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 sm:flex">
          {nav.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-ink hover:text-purple"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Sign-in slot: stubbed until M3 wires Google auth + the
              entitlement store. Disabled, not a dead link. */}
          <button
            type="button"
            disabled
            title={nav.signIn.label}
            aria-disabled="true"
            className="hidden rounded-pill border border-line px-4 py-2 text-sm font-semibold text-muted sm:inline-block"
          >
            {nav.signIn.label}
          </button>
          <Link
            href={nav.primaryCta.href}
            className="rounded-pill bg-purple px-4 py-2 text-sm font-bold text-white hover:bg-purple-dark"
          >
            {nav.primaryCta.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
