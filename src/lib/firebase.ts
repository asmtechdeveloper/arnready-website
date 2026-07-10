/**
 * Firebase Web SDK gateway — same Firebase project as the app, same uid,
 * same Firestore documents.
 *
 * STATUS (10 Jul): no Firebase WEB app is registered yet (Anusha gates that
 * step), so config arrives via NEXT_PUBLIC_FIREBASE_* env at build time and
 * everything here degrades gracefully when unconfigured: the unsigned free
 * tier runs entirely on build-time content and never touches Firebase.
 * Auth/Firestore paths are NOT integration-tested until registration.
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;

function getApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!app) app = getApps()[0] ?? initializeApp(config);
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const a = getApp();
  return a ? getAuth(a) : null;
}

export function getDb(): Firestore | null {
  const a = getApp();
  return a ? getFirestore(a) : null;
}

/** Thrown when the user dismissed the popup — cancelling is always fine. */
export class SignInCancelled extends Error {}

export async function signInWithGoogle(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Sign-in is not available yet.');
  await setPersistence(auth, browserLocalPersistence);
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new SignInCancelled();
    }
    // Popup blocked (or an environment that can't host one): fall back to
    // the full-page redirect flow (architecture §5 requirement).
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, new GoogleAuthProvider());
      return;
    }
    throw err;
  }
}

/** Remove every per-user cache this site writes (all keys are UID-scoped). */
export function clearUserCaches(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('arnready_')) localStorage.removeItem(key);
    }
  } catch {}
}

export async function signOutEverywhere(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) await signOut(auth);
  clearUserCaches();
}
