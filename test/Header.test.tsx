import { describe, expect, it, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import { Header } from '@/components/Header';

// usePathname is mocked via this module-level variable so tests can drive
// same-route vs cross-route scenarios without a real Next.js router.
let mockPathname = '/pricing';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// next/link only calls preventDefault (and takes over navigation) when it
// finds a RouterContext provider above it; without one it falls back to a
// native anchor click, which jsdom can't perform and logs a stderr error.
// Supplying a stub router keeps the click entirely inside React/jsdom.
const stubRouter = { push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() };

function renderHeader() {
  return render(
    <RouterContext.Provider value={stubRouter as never}>
      <Header />
    </RouterContext.Provider>,
  );
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /^menu$/i }));
}

function menuIsOpen() {
  return screen.queryByRole('button', { name: /^close menu$/i }) !== null;
}

describe('Header mobile menu closes correctly (M0-R6 regression coverage)', () => {
  it('closes when the already-active primary CTA is clicked (same route)', () => {
    mockPathname = '/pricing';
    renderHeader();
    openMenu();
    expect(menuIsOpen()).toBe(true);

    fireEvent.click(screen.getByRole('link', { name: 'Get ARNReady' }));

    expect(menuIsOpen()).toBe(false);
  });

  it('closes when the already-active mobile navigation link is clicked (same route)', () => {
    mockPathname = '/pricing';
    renderHeader();
    openMenu();
    const mobileNav = screen.getByRole('navigation', { name: 'Primary (mobile)' });
    expect(within(mobileNav).getByRole('link', { name: 'Pricing' })).toBeInTheDocument();

    fireEvent.click(within(mobileNav).getByRole('link', { name: 'Pricing' }));

    expect(menuIsOpen()).toBe(false);
  });

  it('closes on a cross-route pathname change (belt-and-braces fallback)', () => {
    mockPathname = '/';
    const { rerender } = renderHeader();
    openMenu();
    expect(menuIsOpen()).toBe(true);

    mockPathname = '/syllabus';
    rerender(
      <RouterContext.Provider value={stubRouter as never}>
        <Header />
      </RouterContext.Provider>,
    );

    expect(menuIsOpen()).toBe(false);
  });
});
