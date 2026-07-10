'use client';

/**
 * Account — identity, plan, sign-out. isPaid is read-only here (locked:
 * SERVER-WRITE-ONLY); the plan chip just mirrors the entitlement store.
 */
import Link from 'next/link';
import Arnie from '@/components/Arnie';
import SignInButton from '@/components/app/SignInButton';
import { LogOut } from '@/components/Icon';
import { signOutEverywhere } from '@/lib/firebase';
import { useAuth, useEntitlement } from '@/lib/stores';

export default function AccountPanel() {
  const { user, ready } = useAuth();
  const ent = useEntitlement();

  if (!ready) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <Arnie mood="waving" size={140} className="mx-auto" />
          <h1 className="mt-6 text-2xl font-black text-ink">No account yet — no problem</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Everything free works without signing in. An account adds the
            sticky bits: saved progress, your mistakes deck, your free mock,
            and your unlock — shared with the app.
          </p>
          <div className="mt-6 flex justify-center">
            <SignInButton label="Sign in with Google" />
          </div>
        </div>
      </div>
    );
  }

  const isPaid = ent.known && ent.isPaid;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-3xl font-black text-ink">Account</h1>

      <div className="mt-6 rounded-card bg-white p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-black text-ink">{user.displayName ?? 'You'}</p>
            <p className="truncate text-sm font-bold text-muted">{user.email}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
              isPaid ? 'bg-green-soft text-green' : 'bg-purple-soft text-purple'
            }`}
          >
            {!ent.known ? '…' : isPaid ? 'Unlocked' : 'Free plan'}
          </span>
        </div>

        {ent.known && !isPaid && (
          <Link
            href="/app/upgrade"
            className="mt-5 block rounded-full bg-purple px-6 py-2.5 text-center text-sm font-black text-white hover:bg-purple-dark"
          >
            Unlock everything
          </Link>
        )}

        <button
          type="button"
          onClick={() => signOutEverywhere().catch(() => {})}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-line px-6 py-2.5 text-sm font-black text-muted transition-colors hover:border-red hover:text-red"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>

      <div className="mt-6 rounded-card bg-white p-6 shadow-card">
        <h2 className="text-sm font-black text-ink">The boring-but-important bits</h2>
        <ul className="mt-3 space-y-2 text-sm font-bold">
          <li>
            <Link href="/privacy" className="text-purple hover:underline">
              Privacy policy
            </Link>
          </li>
          <li>
            <Link href="/delete-account" className="text-purple hover:underline">
              Delete your account and data
            </Link>
          </li>
          <li>
            <Link href="/support" className="text-purple hover:underline">
              Support
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
