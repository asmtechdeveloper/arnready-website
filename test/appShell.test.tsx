import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { act, render, screen } from '@testing-library/react';

/**
 * The /app shell's four auth states (M3), plus the M3 scope boundary: this
 * surface carries NO study functionality and NO nudges — those land in
 * M5/M6 (manual M3 scope amendment, Anusha 2026-07-16).
 */
let configured = true;
vi.mock('@/lib/firebaseClient', () => ({
  isFirebaseConfigured: () => configured,
  getAuthClient: () => null,
  getDb: () => null,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { AppShell } = await import('@/components/AppShell');
const { useAuth } = await import('@/lib/authStore');
const { useEntitlement } = await import('@/lib/entitlementStore');
const { appShell, auth: authCopy } = await import('@/lib/copy');

function signedIn(uid = 'uid-a') {
  useAuth.setState({ user: { uid, displayName: 'Test Learner', email: 'test@example.com' } });
}

beforeEach(() => {
  configured = true;
  useAuth.setState({ user: undefined, signingIn: false });
  useEntitlement.setState({ isPaid: false, known: false });
});

describe('/app shell — auth states', () => {
  it('shows a waiting state while auth is not yet known (never the sign-in prompt)', () => {
    render(<AppShell />);
    expect(screen.getByText(appShell.loading)).toBeInTheDocument();
    expect(screen.queryByText(authCopy.signInWithGoogle)).toBeNull();
  });

  it('signed out: shows the sign-in prompt and keeps free reading reachable', () => {
    useAuth.setState({ user: null });
    render(<AppShell />);

    expect(screen.getByText(appShell.signedOut.title)).toBeInTheDocument();
    expect(screen.getByText(authCopy.signInWithGoogle)).toBeInTheDocument();
    expect(screen.getByText(appShell.signedOut.browseInstead.label)).toHaveAttribute(
      'href',
      '/chapters',
    );
  });

  it('signed in: shows identity and a sign-out control', () => {
    signedIn();
    render(<AppShell />);

    expect(screen.getByText(appShell.signedIn.title)).toBeInTheDocument();
    expect(screen.getByText(/Signed in as Test Learner/)).toBeInTheDocument();
    expect(screen.getByText(authCopy.signOut)).toBeInTheDocument();
    expect(screen.queryByText(authCopy.signInWithGoogle)).toBeNull();
  });

  it('falls back to the email, then a neutral noun, when there is no display name', () => {
    expect(authCopy.signedInAs(null, 'a@b.com')).toBe('Signed in as a@b.com');
    expect(authCopy.signedInAs('   ', null)).toBe('Signed in as your account');
    expect(authCopy.signedInAs(null, null)).toBe('Signed in as your account');
  });

  it('unconfigured build: honest unavailable state, free reading still offered', () => {
    configured = false;
    useAuth.setState({ user: null });
    render(<AppShell />);

    expect(screen.getByText(appShell.unavailable.title)).toBeInTheDocument();
    expect(screen.queryByText(authCopy.signInWithGoogle)).toBeNull();
    expect(screen.getByText(appShell.unavailable.browse.label)).toHaveAttribute('href', '/chapters');
  });
});

describe('/app shell — entitlement is observed, never derived', () => {
  it('exposes the live entitlement state for the integration matrix', () => {
    signedIn();
    useEntitlement.setState({ isPaid: true, known: true });
    render(<AppShell />);

    const marker = screen.getByTestId('entitlement-state');
    expect(marker).toHaveAttribute('data-is-paid', 'true');
    expect(marker).toHaveAttribute('data-known', 'true');
  });

  it('reflects a server-side revoke without a remount', () => {
    signedIn();
    useEntitlement.setState({ isPaid: true, known: true });
    render(<AppShell />);
    expect(screen.getByTestId('entitlement-state')).toHaveAttribute('data-is-paid', 'true');

    // The listener firing mid-session is the real scenario this pins: the
    // store updates and the mounted surface must follow it, with no reload.
    act(() => {
      useEntitlement.setState({ isPaid: false, known: true });
    });

    expect(screen.getByTestId('entitlement-state')).toHaveAttribute('data-is-paid', 'false');
  });

  it('renders identically for paid and free users — M3 has no entitlement-gated UI', () => {
    signedIn();
    useEntitlement.setState({ isPaid: false, known: true });
    const free = render(<AppShell />).container.querySelector('h1')?.textContent;

    useEntitlement.setState({ isPaid: true, known: true });
    const paid = render(<AppShell />).container.querySelector('h1')?.textContent;

    expect(free).toBe(paid);
  });
});

describe('/app shell — M3 scope boundary', () => {
  it('renders NO nudge and NO upgrade wall (those are M5/M6 render sites)', async () => {
    const { nudge, upgradeWall } = await import('@/lib/copy');
    signedIn();
    render(<AppShell />);

    expect(screen.queryByText(upgradeWall.title)).toBeNull();
    expect(screen.queryByText(nudge.practice.title)).toBeNull();
    expect(screen.queryByText(nudge.exam.title)).toBeNull();
    for (const variant of nudge.flashcard.variants) {
      expect(screen.queryByText(variant.title)).toBeNull();
    }
    // The premium pitch itself must not appear on an auth shell.
    expect(screen.queryByText(nudge.getApp.label)).toBeNull();
    expect(screen.queryByText(nudge.webSoon.label)).toBeNull();
  });

});

describe('/app shell — the M6 modes row', () => {
  it('links the three M6 surfaces with the right hrefs', () => {
    signedIn();
    render(<AppShell />);
    const { modes } = appShell.signedIn;
    expect(screen.getByRole('link', { name: modes.mock.label })).toHaveAttribute(
      'href',
      '/app/mock',
    );
    expect(screen.getByRole('link', { name: modes.mistakes.label })).toHaveAttribute(
      'href',
      '/app/mistakes',
    );
    expect(screen.getByRole('link', { name: modes.progress.label })).toHaveAttribute(
      'href',
      '/app/progress',
    );
  });

  it('no longer carries the comingSoon roadmap — the surfaces shipped', () => {
    // The key is gone from the copy module entirely, so nothing can render
    // a "coming soon" promise for surfaces that exist.
    expect('comingSoon' in appShell.signedIn).toBe(false);
  });
});
