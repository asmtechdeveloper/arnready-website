/**
 * authStore — Google sign-in and auth state for the web (M3).
 *
 * Ports the app's `useAuthUser` flap guard (../ARNReady-App/services/
 * useAuthUser.js) and keys the entitlement store's lifecycle to the signed-in
 * uid exactly as the app's `useEntitlementSync` does.
 *
 * Three states, distinguished deliberately:
 *   undefined → auth state not yet known (first paint, before the SDK reports)
 *   null      → signed out
 *   AuthUser  → signed in
 *
 * `undefined` must never render as "signed out" — doing so flashes the
 * sign-in prompt at a returning, already-authenticated learner on every page
 * load.
 *
 * M3 WRITES NOTHING. Signing in creates a Firebase Auth record (unavoidable —
 * that is what sign-in is) but no Firestore document. `users/{uid}` creation
 * belongs to M4, which owns every write shape (Anusha, 2026-07-18). A user
 * with no document reads as unpaid, which is the correct fail-closed answer.
 */
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { create } from 'zustand';

import { getAuthClient } from './firebaseClient';
import { resetEntitlement, subscribeEntitlement } from './entitlementStore';

/**
 * Ported from the app's `CONFIG.AUTH_FLAP_GRACE_MS` (1500). `onAuthStateChanged`
 * can emit a transient null during token refresh or a network blip; honouring
 * it instantly would tear down a signed-in surface mid-study. A null is only
 * believed if it survives this grace period with `currentUser` still null.
 */
export const AUTH_FLAP_GRACE_MS = 1500;

/** The minimum we hold. Never the whole Firebase User, and never a token. */
export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
};

export type AuthState = {
  /** undefined = not yet known, null = signed out, AuthUser = signed in. */
  user: AuthUser | null | undefined;
  /** True while a sign-in popup is open — drives the button's pending state. */
  signingIn: boolean;
};

export const useAuth = create<AuthState>()(() => ({
  user: undefined,
  signingIn: false,
}));

function toAuthUser(user: User): AuthUser {
  return { uid: user.uid, displayName: user.displayName, email: user.email };
}

/** The outcome of a sign-in attempt. `cancelled` is a normal, silent path. */
export type SignInOutcome = 'signed-in' | 'cancelled' | 'unavailable' | 'error';

/**
 * Firebase's codes for "the human closed the popup" or "a second popup
 * superseded this one". Manual §1 requires every sign-in prompt to be
 * cancellable, so these are not errors: no message, no state change, no
 * write, no orphan listener. The user is exactly where they were.
 */
const CANCEL_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';
}

/**
 * Opens the Google sign-in popup.
 *
 * Popup rather than redirect (Anusha, 2026-07-18): a dismissed popup is a
 * clean, observable cancel, and a static export loses page state across a
 * redirect round trip.
 *
 * Auth state is applied by the `onAuthStateChanged` listener, not here — this
 * function never sets `user` directly. One source of truth for auth state.
 */
export async function signInWithGoogle(): Promise<SignInOutcome> {
  const auth = getAuthClient();
  if (!auth) return 'unavailable';

  useAuth.setState({ signingIn: true });
  try {
    const provider = new GoogleAuthProvider();
    // Always show the account chooser: on a shared machine, silently reusing
    // the last Google session would sign a learner into someone else's
    // ARNReady account.
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
    return 'signed-in';
  } catch (error: unknown) {
    if (CANCEL_CODES.has(errorCode(error))) return 'cancelled';
    console.error('[ARNReady] Sign-in failed.', error);
    return 'error';
  } finally {
    useAuth.setState({ signingIn: false });
  }
}

/**
 * Signs out and tears down entitlement immediately.
 *
 * `resetEntitlement()` is called BEFORE awaiting `signOut` so the paid UI
 * cannot outlive the session even briefly — the auth listener will reset it
 * again when it fires, and reset is idempotent.
 */
export async function signOutOfArnready(): Promise<void> {
  resetEntitlement();
  const auth = getAuthClient();
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error: unknown) {
    console.error('[ARNReady] Sign-out failed.', error);
  }
}

/**
 * Wires `onAuthStateChanged` to the auth and entitlement stores.
 *
 * Call ONCE, from the app-wide provider. Returns an unsubscribe that also
 * clears the flap timer and detaches the entitlement listener.
 */
export function startAuthSync(): () => void {
  const auth = getAuthClient();
  if (!auth) {
    // Unconfigured build: settle as signed out rather than leaving the UI in
    // the "not yet known" state forever.
    useAuth.setState({ user: null });
    resetEntitlement();
    return () => {};
  }

  let flapTimer: ReturnType<typeof setTimeout> | null = null;
  let lastUser: AuthUser | null | undefined = undefined;

  const clearFlapTimer = () => {
    if (flapTimer) {
      clearTimeout(flapTimer);
      flapTimer = null;
    }
  };

  const apply = (user: AuthUser | null) => {
    lastUser = user;
    useAuth.setState({ user });
    // subscribeEntitlement resets first, so an A→B switch never shows A's
    // entitlement to B.
    subscribeEntitlement(user?.uid ?? null);
  };

  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser || lastUser == null) {
      // Signed in, or we never had a user (cold start) — apply immediately.
      clearFlapTimer();
      apply(firebaseUser ? toAuthUser(firebaseUser) : null);
      return;
    }

    // Had a user, got null. Confirm it's a real sign-out before tearing down.
    clearFlapTimer();
    flapTimer = setTimeout(() => {
      flapTimer = null;
      if (!auth.currentUser) apply(null);
    }, AUTH_FLAP_GRACE_MS);
  });

  return () => {
    unsubscribe();
    clearFlapTimer();
    resetEntitlement();
  };
}

/** Test-only: returns the store to its initial, pre-sync state. */
export function resetAuthForTests(): void {
  useAuth.setState({ user: undefined, signingIn: false });
}
