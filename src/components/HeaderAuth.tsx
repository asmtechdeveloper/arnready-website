'use client';

import Link from 'next/link';

import { auth as authCopy } from '@/lib/copy';
import { useAuth } from '@/lib/authStore';
import { Icon } from '@/components/Icon';
import { SignInButton } from '@/components/SignInButton';

/**
 * The header's auth slot — sign-in prompt #3 of the three in manual §1
 * (the other two: after the 10th sampler card, and on study CTAs in M5/M6).
 *
 * Three states, and the distinction matters:
 *
 *   undefined → auth not yet known. Renders a non-interactive placeholder of
 *               the SAME height as the button. Rendering "Sign in" here would
 *               flash the prompt at an already-signed-in learner on every
 *               page load; rendering nothing would shift the layout when
 *               auth resolves.
 *   null      → signed out. The sign-in prompt.
 *   AuthUser  → signed in. A link to /app, which is where sign-out lives.
 *
 * Entitlement is deliberately NOT shown here. `isPaid` drives study surfaces
 * (M5/M6), and a header badge would be one more place for paid state to be
 * read from something other than the listener.
 */
export function HeaderAuth({ variant }: { variant: 'desktop' | 'mobile' }) {
  const user = useAuth((s) => s.user);

  if (user === undefined) {
    return (
      <div
        aria-hidden="true"
        className={variant === 'desktop' ? 'hidden h-11 w-24 sm:block' : 'h-11'}
      />
    );
  }

  if (user === null) {
    return variant === 'desktop' ? (
      <div className="hidden sm:block">
        <SignInButton variant="secondary" label={authCopy.signIn} className="px-4" />
      </div>
    ) : (
      <SignInButton variant="secondary" label={authCopy.signIn} className="w-full" />
    );
  }

  const classes =
    variant === 'desktop'
      ? 'hidden min-h-11 items-center gap-2 rounded-pill border border-line px-4 text-sm font-semibold text-ink hover:border-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple sm:inline-flex'
      : 'flex min-h-11 items-center gap-2 text-base font-semibold text-ink';

  return (
    <Link href="/app" className={classes}>
      <Icon name="user" size={18} />
      {/* First name only in the header — the full identity lives on /app. */}
      {user.displayName?.trim().split(' ')[0] || authCopy.signIn}
    </Link>
  );
}
