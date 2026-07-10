'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from '@/components/Icon';

const NAV = [
  { href: '/nism-series-v-a', label: 'The Exam' },
  { href: '/chapters', label: 'Chapters' },
  { href: '/mock-test', label: 'Mock Test' },
  { href: '/flashcards', label: 'Flashcards' },
  { href: '/pricing', label: 'Pricing' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="ARNReady home">
          <Image src="/favicon.png" alt="" width={32} height={32} className="rounded-lg" />
          <span className="text-xl font-black tracking-tight text-purple">ARNReady</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-bold transition-colors hover:text-purple ${
                pathname?.startsWith(item.href) ? 'text-purple' : 'text-muted'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/app"
            className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white shadow-card transition-colors hover:bg-purple-dark"
          >
            Start practising
          </Link>
        </nav>

        <button
          type="button"
          className="p-2 text-ink md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-cream px-4 py-4 md:hidden" aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-bold text-ink hover:bg-purple-soft"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                href="/app"
                onClick={() => setOpen(false)}
                className="block rounded-full bg-purple px-5 py-2.5 text-center text-sm font-bold text-white"
              >
                Start practising
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
