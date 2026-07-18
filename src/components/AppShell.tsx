'use client';

import Link from 'next/link';

import { appShell, auth as authCopy } from '@/lib/copy';
import { useAuth } from '@/lib/authStore';
import { useEntitlement } from '@/lib/entitlementStore';
import { isFirebaseConfigured } from '@/lib/firebaseClient';
import { Arnie } from '@/components/Arnie';
import { Icon } from '@/components/Icon';
import { SignInButton, SignOutButton } from '@/components/SignInButton';

/**
 * The `/app` shell (M3) — auth states only.
 *
 * Four states, each of which a reviewer should be able to reach:
 *   unconfigured → no usable Firebase config; honest, non-alarming, and the
 *                  free public content stays reachable
 *   loading      → auth not yet known (user === undefined)
 *   signed out   → the sign-in prompt
 *   signed in    → identity, sign-out, and a plain statement of what is
 *                  still being built
 *
 * NO study surfaces and NO nudges live here. The nudge/wall machinery from M2
 * renders at its M5/M6 render sites, not on this shell — a nudge here would
 * fire outside any run, which the nudge law does not sanction.
 */
export function AppShell() {
  const user = useAuth((s) => s.user);
  const { isPaid, known } = useEntitlement();

  const wrapper = 'mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop';
  const card = 'rounded-card bg-white p-8 text-center shadow-card sm:p-11';

  if (!isFirebaseConfigured()) {
    return (
      <div className={wrapper}>
        <div className={card}>
          <h1 className="text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {appShell.unavailable.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">
            {appShell.unavailable.body}
          </p>
          <Link
            href={appShell.unavailable.browse.href}
            className="mt-6 inline-flex min-h-11 items-center rounded-pill bg-purple px-6 text-sm font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark"
          >
            {appShell.unavailable.browse.label}
          </Link>
        </div>
      </div>
    );
  }

  if (user === undefined) {
    return (
      <div className={wrapper}>
        {/* role="status" so a screen reader hears the wait rather than
            landing on an empty page. */}
        <div className={card} role="status">
          <p className="text-[0.95rem] leading-7 text-muted">{appShell.loading}</p>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className={wrapper}>
        <div className={card}>
          <Arnie mood={appShell.signedOut.mood} size={140} className="mx-auto" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {appShell.signedOut.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">
            {appShell.signedOut.body}
          </p>
          <div className="mt-6 flex flex-col items-center gap-4">
            <SignInButton />
            <Link
              href={appShell.signedOut.browseInstead.href}
              className="flex min-h-11 items-center text-sm font-semibold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
            >
              {appShell.signedOut.browseInstead.label}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <div className={card}>
        <Arnie mood={appShell.signedIn.mood} size={140} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
          {appShell.signedIn.title}
        </h1>
        <p className="mt-2 text-sm text-muted">{authCopy.signedInAs(user.displayName, user.email)}</p>

        <p className="mx-auto mt-6 text-[0.95rem] leading-7 text-muted">
          {appShell.signedIn.body}
        </p>
        <ul className="mx-auto mt-4 flex max-w-sm flex-col gap-2 text-left">
          {appShell.signedIn.comingSoon.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[0.95rem] leading-7 text-muted">
              <span className="mt-1.5 text-purple">
                <Icon name="chevron-right" size={16} />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Link
            href={appShell.signedIn.browse.href}
            className="flex min-h-11 items-center rounded-pill bg-purple px-6 text-sm font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark"
          >
            {appShell.signedIn.browse.label}
          </Link>
          <SignOutButton />
        </div>

        {/*
          Entitlement is read and rendered ONLY as a machine-readable marker in
          M3 — there is no paid/free UI to drive until the study surfaces exist
          (M5/M6). It is emitted so the integration matrix can observe the
          listener flipping live when isPaid changes server-side, without
          inventing a premium badge the manual never specified.
        */}
        <span
          hidden
          data-testid="entitlement-state"
          data-known={String(known)}
          data-is-paid={String(isPaid)}
        />
      </div>
    </div>
  );
}
