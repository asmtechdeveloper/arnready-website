/**
 * firebaseClient — lazy, browser-only Firebase initialisation (M3).
 *
 * The site is a static export, so every module here is prerendered on the
 * build machine as well as loaded in the browser. Nothing in this file may
 * run at import time: initialisation happens on first use, and only when a
 * real `window` exists. Prerender therefore produces the signed-out markup
 * with no Firebase involvement at all.
 *
 * Fail-closed (manual §0.9): if `getFirebaseConfig()` cannot resolve, every
 * accessor here returns `null`. Callers must treat `null` as "auth
 * unavailable → signed out, unpaid" — never as an error worth retrying into
 * an entitled state.
 *
 * SCOPE: this module hands out `Auth` and `Firestore` handles and nothing
 * else. It performs no reads, no writes, and holds no user state. M3 writes
 * NOTHING to Firestore — user-document creation belongs to M4, which owns
 * every write shape (Anusha, 2026-07-18).
 */
import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { type Firestore, getFirestore } from 'firebase/firestore';
import { type Functions, getFunctions } from 'firebase/functions';

import { getFirebaseConfig } from './firebaseEnv';

const APP_NAME = 'arnready-web';

/** True only in a real browser — guards every prerender path. */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

let appInstance: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isBrowser()) return null;
  if (appInstance) return appInstance;

  const resolved = getFirebaseConfig();
  if (!resolved.ok) {
    // Surfaced in the UI as the "auth unavailable" signed-out state; logged
    // once here so a misconfigured build is diagnosable from the console.
    console.error(`[ARNReady] Firebase is not configured. ${resolved.reason}`);
    return null;
  }

  // A named app avoids colliding with any default app another script might
  // register on the page, and keeps re-initialisation idempotent across
  // Fast Refresh in development.
  const existing = getApps().find((a) => a.name === APP_NAME);
  appInstance = existing ?? initializeApp(resolved.config, APP_NAME);
  return appInstance;
}

let authInstance: Auth | null = null;

export function getAuthClient(): Auth | null {
  if (!isBrowser()) return null;
  if (authInstance) return authInstance;

  const app = getFirebaseApp();
  if (!app) return null;

  authInstance = getAuth(app);
  // Local persistence mirrors the app's persistent sign-in (Anusha,
  // 2026-07-18): a learner returning to a chapter is still signed in.
  // Fire-and-forget — a failure here leaves the SDK's default persistence in
  // place, which is strictly more conservative, and must not block sign-in.
  setPersistence(authInstance, browserLocalPersistence).catch((error: unknown) => {
    console.error('[ARNReady] Could not set auth persistence.', error);
  });
  return authInstance;
}

let dbInstance: Firestore | null = null;

export function getDb(): Firestore | null {
  if (!isBrowser()) return null;
  if (dbInstance) return dbInstance;

  const app = getFirebaseApp();
  if (!app) return null;

  dbInstance = getFirestore(app);
  return dbInstance;
}

/**
 * Cloud Functions region — mirrors app `CONFIG.FUNCTIONS_REGION`
 * (../ARNReady-App/config.js: asia-south1 = Mumbai, same as Firestore). The
 * callables live in the APP repo's functions/ workspace; calling one from the
 * wrong region fails with not-found, silently breaking the flows that need it.
 */
export const FUNCTIONS_REGION = 'asia-south1';

let functionsInstance: Functions | null = null;

export function getFunctionsClient(): Functions | null {
  if (!isBrowser()) return null;
  if (functionsInstance) return functionsInstance;

  const app = getFirebaseApp();
  if (!app) return null;

  functionsInstance = getFunctions(app, FUNCTIONS_REGION);
  return functionsInstance;
}

/** True when this build has a usable Firebase config — drives the UI state. */
export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig().ok;
}

/**
 * DEV-ONLY test sign-in hook (M5 plan D13, step S9).
 *
 * Exposes `window.__arnreadyDevAuth` so the local dev browser can sign in as a
 * throwaway test account with a custom token MINTED LOCALLY from the dev
 * service-account key (exactly as `test/m4LiveSession.test.ts` mints one) — for
 * capturing the authenticated M5 screenshots the milestone requires. No
 * password is ever handled, typed, or stored.
 *
 * The ENTIRE body is behind `process.env.NODE_ENV !== 'production'`. Next
 * inlines that to `false` for `next build`, so the affordance is dead-code
 * eliminated from the static export — `out/` never contains the string
 * `__arnreadyDevAuth`, which `test/devAuthHookAbsent.test.ts` and the packet
 * both verify against the real build. It is a DECLARED DEVIATION recorded in
 * the M5 packet, not silent test scaffolding.
 */
export function installDevAuthHook(): void {
  if (process.env.NODE_ENV === 'production') return;
  if (!isBrowser()) return;
  const auth = getAuthClient();
  if (!auth) return;
  (window as unknown as Record<string, unknown>).__arnreadyDevAuth = {
    signInWithCustomToken: (token: string) =>
      import('firebase/auth').then(({ signInWithCustomToken }) =>
        signInWithCustomToken(auth, token),
      ),
    signOut: () => auth.signOut(),
  };
}

/** Test-only: drops the memoised handles between tests. */
export function resetFirebaseClientForTests(): void {
  appInstance = null;
  authInstance = null;
  dbInstance = null;
  functionsInstance = null;
  if (getApps().some((a) => a.name === APP_NAME)) {
    // Leaves the SDK's registry clean so a later test can re-initialise.
    void getApp(APP_NAME);
  }
}
