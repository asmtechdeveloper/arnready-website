import Link from 'next/link';
import { footerDisclaimer } from '@/lib/copy';

export function Footer() {
  const year = 2026;
  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto max-w-content px-4 py-10 text-center sm:px-6">
        <p className="mx-auto max-w-reading text-sm leading-7 text-muted">{footerDisclaimer.body}</p>
        <p className="mt-3 text-sm text-muted">
          {footerDisclaimer.links.map((link, i) => (
            <span key={link.href}>
              {i > 0 && ' · '}
              <Link href={link.href} className="text-purple hover:underline">
                {link.label}
              </Link>
            </span>
          ))}
          {' · '}© {year} ASM Tech
        </p>
      </div>
    </footer>
  );
}
