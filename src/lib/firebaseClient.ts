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

/** True when this build has a usable Firebase config — drives the UI state. */
export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig().ok;
}

/** Test-only: drops the memoised handles between tests. */
export function resetFirebaseClientForTests(): void {
  appInstance = null;
  authInstance = null;
  dbInstance = null;
  if (getApps().some((a) => a.name === APP_NAME)) {
    // Leaves the SDK's registry clean so a later test can re-initialise.
    void getApp(APP_NAME);
  }
}
