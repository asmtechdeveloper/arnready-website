import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';

/**
 * The header's auth slot — sign-in prompt #3 of the three in manual §1.
 *
 * The state that matters most is `undefined` (auth not yet known): the header
 * renders on EVERY page, so getting this wrong flashes "Sign in" at an
 * already-authenticated learner on every single navigation.
 */
vi.mock('@/lib/firebaseClient', () => ({
  isFirebaseConfigured: () => true,
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

const { HeaderAuth } = await import('@/components/HeaderAuth');
const { useAuth } = await import('@/lib/authStore');
const { auth: authCopy } = await import('@/lib/copy');

beforeEach(() => {
  useAuth.setState({ user: undefined, signingIn: false });
});

describe.each(['desktop', 'mobile'] as const)('HeaderAuth (%s)', (variant) => {
  it('renders neither a prompt nor an identity while auth is unknown', () => {
    render(<HeaderAuth variant={variant} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders the sign-in prompt when signed out', () => {
    useAuth.setState({ user: null });
    render(<HeaderAuth variant={variant} />);
    expect(screen.getByRole('button', { name: new RegExp(authCopy.signIn, 'i') })).toBeEnabled();
  });

  it('renders a link to /app with the first name when signed in', () => {
    useAuth.setState({
      user: { uid: 'u1', displayName: 'Anusha Murthy', email: 'a@example.com' },
    });
    render(<HeaderAuth variant={variant} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/app');
    expect(link).toHaveTextContent('Anusha');
    // Surname withheld in a persistent chrome element.
    expect(link).not.toHaveTextContent('Murthy');
  });

  it('falls back to the sign-in label when the account has no display name', () => {
    useAuth.setState({ user: { uid: 'u1', displayName: null, email: 'a@example.com' } });
    render(<HeaderAuth variant={variant} />);
    expect(screen.getByRole('link')).toHaveTextContent(authCopy.signIn);
  });

  it('never shows entitlement in the header, even for a paid account', async () => {
    const { useEntitlement } = await import('@/lib/entitlementStore');
    useEntitlement.setState({ isPaid: true, known: true });
    // Deliberately neutral display name so the assertion tests the component,
    // not the fixture.
    useAuth.setState({ user: { uid: 'u1', displayName: 'Ravi Kumar', email: 'r@example.com' } });

    render(<HeaderAuth variant={variant} />);

    expect(screen.queryByText(/premium|paid|upgrade/i)).toBeNull();
  });
});
