import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { Header } from '@/components/Header';

// usePathname is mocked via this module-level variable so tests can drive
// same-route vs cross-route scenarios without a real Next.js router.
let mockPathname = '/pricing';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// next/link's real click handling depends on an internal, undocumented
// RouterContext that only takes over (and calls preventDefault) once a
// full app router is mounted; without one it falls through to a native
// anchor click, which jsdom doesn't implement and logs a stderr error.
// Rather than depend on that internal, unversioned Next.js path, replace
// next/link with a plain anchor that always prevents the browser's
// default navigation itself before invoking the real onClick — this is
// the only thing under test here (does Header's own onClick fire and
// close the menu), so a real router has nothing to add.
vi.mock('next/link', () => ({
  default: ({ href, onClick, children, ...rest }: ComponentProps<'a'>) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /^menu$/i }));
}

function menuIsOpen() {
  return screen.queryByRole('button', { name: /^close menu$/i }) !== null;
}

describe('Header mobile menu closes correctly (M0-R6 regression coverage)', () => {
  it('closes when the already-active primary CTA is clicked (same route)', () => {
    mockPathname = '/pricing';
    render(<Header />);
    openMenu();
    expect(menuIsOpen()).toBe(true);

    fireEvent.click(screen.getByRole('link', { name: 'Get ARNReady' }));

    expect(menuIsOpen()).toBe(false);
  });

  it('closes when the already-active mobile navigation link is clicked (same route)', () => {
    mockPathname = '/pricing';
    render(<Header />);
    openMenu();
    const mobileNav = screen.getByRole('navigation', { name: 'Primary (mobile)' });
    expect(within(mobileNav).getByRole('link', { name: 'Pricing' })).toBeInTheDocument();

    fireEvent.click(within(mobileNav).getByRole('link', { name: 'Pricing' }));

    expect(menuIsOpen()).toBe(false);
  });

  it('closes on a cross-route pathname change (belt-and-braces fallback)', () => {
    mockPathname = '/';
    const { rerender } = render(<Header />);
    openMenu();
    expect(menuIsOpen()).toBe(true);

    mockPathname = '/syllabus';
    rerender(<Header />);

    expect(menuIsOpen()).toBe(false);
  });
});
