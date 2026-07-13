import Link from 'next/link';
import { brand, footerDisclaimer } from '@/lib/copy';

export function Footer() {
  const year = footerDisclaimer.copyrightYear;
  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto max-w-content px-gutter-mobile py-8 text-center sm:px-gutter-desktop">
        <p className="mx-auto max-w-reading text-sm leading-7 text-muted">{footerDisclaimer.body}</p>
        <ul className="mt-1 flex flex-wrap items-center justify-center gap-x-1">
          {footerDisclaimer.links.map((link, i) => (
            <li key={link.href} className="flex items-center">
              {i > 0 && (
                <span aria-hidden="true" className="mr-1 text-sm text-muted">
                  ·
                </span>
              )}
              <Link
                href={link.href}
                className="flex min-h-11 items-center px-1 text-sm text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="flex min-h-11 items-center px-1 text-sm text-muted">
            · © {year} {brand.legalName}
          </li>
        </ul>
      </div>
    </footer>
  );
}
