import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * authStore (M3) — the review protocol's M3 checklist for the auth side:
 *
 *   - "Cancel path truly cancels: no partial user doc writes, no orphan state"
 *   - "Auth state flaps (rapid sign-in/out) don't crash gated routes"
 *
 * plus the M3 scope rule (Anusha, 2026-07-18): M3 writes NOTHING to
 * Firestore — user-document creation belongs to M4.
 */

// ── Firebase Auth double ─────────────────────────────────────────────────
type FakeUser = { uid: string; displayName: string | null; email: string | null };

let authListener: ((user: FakeUser | null) => void) | null = null;
let currentUser: FakeUser | null = null;
let unsubscribeCount = 0;
let popupResult: { user: FakeUser } | Error = { user: userFixture('uid-a') };
let signOutCalls = 0;

function userFixture(uid: string): FakeUser {
  return { uid, displayName: 'Test Learner', email: `${uid}@example.com` };
}

function authError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  onAuthStateChanged: (_auth: unknown, cb: (user: FakeUser | null) => void) => {
    authListener = cb;
    return () => {
      unsubscribeCount += 1;
      authListener = null;
    };
  },
  signInWithPopup: async () => {
    if (popupResult instanceof Error) throw popupResult;
    currentUser = popupResult.user;
    return popupResult;
  },
  signOut: async () => {
    signOutCalls += 1;
    currentUser = null;
  },
}));

let authAvailable = true;
vi.mock('@/lib/firebaseClient', () => ({
  getAuthClient: () =>
    authAvailable ? ({ get currentUser() { return currentUser; } } as unknown) : null,
}));

// Real store would need Firestore; the lifecycle contract is what matters here.
const subscribeEntitlement = vi.fn();
const resetEntitlement = vi.fn();
vi.mock('@/lib/entitlementStore', () => ({
  subscribeEntitlement: (uid: string | null | undefined) => subscribeEntitlement(uid),
  resetEntitlement: () => resetEntitlement(),
}));

const {
  AUTH_FLAP_GRACE_MS,
  resetAuthForTests,
  signInWithGoogle,
  signOutOfArnready,
  startAuthSync,
  useAuth,
} = await import('@/lib/authStore');

function state() {
  return useAuth.getState();
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  resetAuthForTests();
  authListener = null;
  currentUser = null;
  unsubscribeCount = 0;
  signOutCalls = 0;
  authAvailable = true;
  popupResult = { user: userFixture('uid-a') };
  subscribeEntitlement.mockClear();
  resetEntitlement.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('initial state', () => {
  it('starts as "not yet known", never as signed out', () => {
    // Rendering `undefined` as signed-out would flash the sign-in prompt at an
    // already-authenticated learner on every page load.
    expect(state().user).toBeUndefined();
  });
});

describe('sign-in', () => {
  it('reports signed-in on success', async () => {
    await expect(signInWithGoogle()).resolves.toBe('signed-in');
  });

  it('does not set auth state directly — the listener is the only writer', async () => {
    await signInWithGoogle();
    // No listener mounted in this test, so state must still be unknown.
    expect(state().user).toBeUndefined();
  });

  it.each([
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
    'auth/user-cancelled',
  ])('treats %s as a clean cancel, not an error', async (code) => {
    popupResult = authError(code);
    await expect(signInWithGoogle()).resolves.toBe('cancelled');
  });

  it('a cancelled sign-in leaves NO state behind — no user, no writes, no listener', async () => {
    popupResult = authError('auth/popup-closed-by-user');
    await signInWithGoogle();

    expect(state().user).toBeUndefined();
    expect(state().signingIn).toBe(false);
    expect(subscribeEntitlement).not.toHaveBeenCalled();
    expect(resetEntitlement).not.toHaveBeenCalled();
  });

  it('reports a genuine failure as an error', async () => {
    popupResult = authError('auth/network-request-failed');
    await expect(signInWithGoogle()).resolves.toBe('error');
  });

  it('reports unavailable when the build has no usable Firebase config', async () => {
    authAvailable = false;
    await expect(signInWithGoogle()).resolves.toBe('unavailable');
  });

  it('always clears the pending flag, including on failure', async () => {
    popupResult = authError('auth/network-request-failed');
    await signInWithGoogle();
    expect(state().signingIn).toBe(false);
  });
});

describe('sign-out', () => {
  it('tears down entitlement before awaiting signOut, so paid UI cannot outlive the session', async () => {
    await signOutOfArnready();
    expect(resetEntitlement).toHaveBeenCalled();
    expect(signOutCalls).toBe(1);
  });

  it('still resets entitlement when signOut itself fails', async () => {
    authAvailable = false;
    await signOutOfArnready();
    expect(resetEntitlement).toHaveBeenCalled();
  });
});

describe('startAuthSync — state propagation', () => {
  it('applies a cold-start signed-out immediately (no flap grace)', () => {
    startAuthSync();
    authListener!(null);
    expect(state().user).toBeNull();
    expect(subscribeEntitlement).toHaveBeenCalledWith(null);
  });

  it('applies sign-in immediately and keys entitlement to the uid', () => {
    startAuthSync();
    authListener!(userFixture('uid-a'));

    expect(state().user).toEqual({
      uid: 'uid-a',
      displayName: 'Test Learner',
      email: 'uid-a@example.com',
    });
    expect(subscribeEntitlement).toHaveBeenCalledWith('uid-a');
  });

  it('holds only uid/displayName/email — never a token or the raw SDK user', () => {
    startAuthSync();
    authListener!(userFixture('uid-a'));
    expect(Object.keys(state().user!).sort()).toEqual(['displayName', 'email', 'uid']);
  });

  it('re-keys entitlement on an A→B switch', () => {
    startAuthSync();
    authListener!(userFixture('uid-a'));
    authListener!(userFixture('uid-b'));
    expect(subscribeEntitlement).toHaveBeenLastCalledWith('uid-b');
  });

  it('detaches the auth listener and resets entitlement on teardown', () => {
    const stop = startAuthSync();
    stop();
    expect(unsubscribeCount).toBe(1);
    expect(resetEntitlement).toHaveBeenCalled();
  });

  it('settles as signed out when the build has no usable Firebase config', () => {
    authAvailable = false;
    startAuthSync();
    expect(state().user).toBeNull();
  });
});

describe('the flap guard (ported from the app’s useAuthUser)', () => {
  it('ignores a transient null while currentUser is still set', () => {
    vi.useFakeTimers();
    startAuthSync();
    authListener!(userFixture('uid-a'));
    currentUser = userFixture('uid-a');

    // Token refresh blip.
    authListener!(null);
    expect(state().user).not.toBeNull();

    vi.advanceTimersByTime(AUTH_FLAP_GRACE_MS + 10);

    // currentUser survived the grace period — the learner stays signed in.
    expect(state().user?.uid).toBe('uid-a');
  });

  it('honours a real sign-out once the grace period passes with currentUser null', () => {
    vi.useFakeTimers();
    startAuthSync();
    authListener!(userFixture('uid-a'));
    currentUser = null;

    authListener!(null);
    expect(state().user).not.toBeNull(); // not yet believed

    vi.advanceTimersByTime(AUTH_FLAP_GRACE_MS + 10);

    expect(state().user).toBeNull();
    expect(subscribeEntitlement).toHaveBeenLastCalledWith(null);
  });

  it('a sign-in during the grace period cancels the pending sign-out', () => {
    vi.useFakeTimers();
    startAuthSync();
    authListener!(userFixture('uid-a'));
    currentUser = null;
    authListener!(null);

    // Auth recovers before the timer fires.
    currentUser = userFixture('uid-a');
    authListener!(userFixture('uid-a'));
    vi.advanceTimersByTime(AUTH_FLAP_GRACE_MS + 10);

    expect(state().user?.uid).toBe('uid-a');
  });

  it('clears a pending flap timer on teardown (no post-unmount state write)', () => {
    vi.useFakeTimers();
    const stop = startAuthSync();
    authListener!(userFixture('uid-a'));
    currentUser = null;
    authListener!(null);

    stop();
    vi.advanceTimersByTime(AUTH_FLAP_GRACE_MS + 10);

    // The timer must not have fired against a torn-down listener.
    expect(state().user?.uid).toBe('uid-a');
  });

  it('survives rapid flapping without throwing', () => {
    vi.useFakeTimers();
    startAuthSync();
    expect(() => {
      for (let i = 0; i < 50; i += 1) {
        currentUser = userFixture(`uid-${i}`);
        authListener!(currentUser);
        currentUser = null;
        authListener!(null);
        vi.advanceTimersByTime(10);
      }
      vi.advanceTimersByTime(AUTH_FLAP_GRACE_MS + 10);
    }).not.toThrow();
    expect(state().user).toBeNull();
  });

  it('pins the grace period to the app’s CONFIG.AUTH_FLAP_GRACE_MS', () => {
    expect(AUTH_FLAP_GRACE_MS).toBe(1500);
  });
});
