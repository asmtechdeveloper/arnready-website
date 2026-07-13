'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { brand, nav } from '@/lib/copy';
import { Icon } from '@/components/Icon';

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [renderedPathname, setRenderedPathname] = useState(pathname);

  // Belt-and-braces close on route change (adjusted during render, not an
  // effect, per React's "you might not need an effect" guidance) — catches
  // any navigation this component doesn't have a click handler for. Cannot
  // be the only mechanism: clicking a link back to the CURRENT route (e.g.
  // the header CTA while already on /pricing) never changes pathname, so
  // every closing link below also gets an explicit onClick.
  if (pathname !== renderedPathname) {
    setRenderedPathname(pathname);
    setOpen(false);
  }

  const closeMenu = () => setOpen(false);

  return (
    <header className="border-b border-line bg-bg">
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-gutter-mobile py-3 sm:px-gutter-desktop">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex min-h-11 items-center text-lg font-extrabold tracking-tight text-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
        >
          {brand.name}
        </Link>

        <nav aria-label={nav.ariaLabel} className="hidden items-center gap-6 sm:flex">
          {nav.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center text-sm font-semibold text-ink hover:text-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
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
            className="hidden min-h-11 items-center rounded-pill border border-line px-4 text-sm font-semibold text-muted sm:inline-flex"
          >
            {nav.signIn.label}
          </button>
          <Link
            href={nav.primaryCta.href}
            onClick={closeMenu}
            className="flex min-h-11 items-center rounded-pill bg-purple px-4 text-sm font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark"
          >
            {nav.primaryCta.label}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? nav.closeMenuLabel : nav.menuLabel}
            className="flex h-11 w-11 items-center justify-center rounded-control border border-line text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple sm:hidden"
          >
            <Icon name={open ? 'x' : 'menu'} />
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label={nav.ariaLabelMobile} className="border-t border-line px-4 py-3 sm:hidden">
          <ul className="flex flex-col gap-1">
            {nav.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeMenu}
                  className="flex min-h-11 items-center text-base font-semibold text-ink hover:text-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                disabled
                title={nav.signIn.label}
                aria-disabled="true"
                className="flex min-h-11 items-center text-base font-semibold text-muted"
              >
                {nav.signIn.label}
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
