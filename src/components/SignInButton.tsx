'use client';

import { useState } from 'react';

import { auth as authCopy } from '@/lib/copy';
import { signInWithGoogle, signOutOfArnready, useAuth } from '@/lib/authStore';
import { Icon } from '@/components/Icon';

/**
 * The ONE sign-in control (M3). Every one of the sign-in prompts in manual §1
 * renders this component, so "always cancellable" is guaranteed structurally
 * rather than re-implemented per site.
 *
 * Cancelling is SILENT: closing the Google popup returns the learner exactly
 * where they were, with no message, no error styling, and no state change.
 * Only a genuine failure shows anything.
 */
export function SignInButton({
  variant = 'primary',
  label,
  className = '',
}: {
  variant?: 'primary' | 'secondary';
  label?: string;
  className?: string;
}) {
  const signingIn = useAuth((s) => s.signingIn);
  const [message, setMessage] = useState<string | null>(null);

  const onClick = async () => {
    setMessage(null);
    const outcome = await signInWithGoogle();
    // 'signed-in' needs no message — the auth listener re-renders the surface.
    // 'cancelled' is silent BY DESIGN: nothing went wrong.
    if (outcome === 'error') setMessage(authCopy.error);
    if (outcome === 'unavailable') setMessage(authCopy.unavailable);
  };

  const base =
    'flex min-h-11 items-center justify-center gap-2 rounded-pill px-6 text-sm font-bold ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'disabled:cursor-not-allowed disabled:opacity-70';
  const variants = {
    primary: 'bg-purple text-white hover:bg-purple-dark focus-visible:outline-purple-dark',
    secondary: 'border border-line bg-white text-ink hover:border-purple focus-visible:outline-purple',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={signingIn}
        className={`${base} ${variants[variant]} ${className}`}
      >
        <Icon name="log-in" size={18} />
        {signingIn ? authCopy.signingIn : (label ?? authCopy.signInWithGoogle)}
      </button>
      {message !== null && (
        // role="status" not "alert": a failed sign-in is worth announcing, but
        // it is not an emergency and must not interrupt a screen reader.
        <p role="status" className="max-w-reading text-center text-[0.85rem] leading-5 text-muted">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Signed-in counterpart: identity plus sign-out. Kept beside the sign-in
 * control so the two halves of the auth UI can never drift apart.
 */
export function SignOutButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => void signOutOfArnready()}
      className={
        'flex min-h-11 items-center gap-2 rounded-pill border border-line px-4 text-sm ' +
        'font-semibold text-ink hover:border-purple focus-visible:outline ' +
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple ' +
        className
      }
    >
      <Icon name="log-out" size={18} />
      {authCopy.signOut}
    </button>
  );
}
