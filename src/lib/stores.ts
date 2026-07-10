'use client';

/**
 * Auth + entitlement stores — mirror the app's entitlementStore rules:
 * isPaid has ONE owner, `known` stays false until a read resolves (ad
 * surfaces render nothing until entitlement is known), and an epoch guard
 * stops a slow read for the previous user writing state for the current one.
 * isPaid is SERVER-WRITE-ONLY in Firestore; the web only ever reads it.
 */
import { useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { getDb, getFirebaseAuth, isFirebaseConfigured } from './firebase';

// ── Auth ────────────────────────────────────────────────────────────────────

type AuthState = {
  user: User | null;
  /** false until the first onAuthStateChanged callback fires. */
  ready: boolean;
};

export const useAuth = create<AuthState>()(() => ({
  user: null,
  ready: !isFirebaseConfigured(), // unconfigured = permanently signed out
}));

let authWired = false;

/** Mount once in the product shell. */
export function useAuthSync(): void {
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth || authWired) return;
    authWired = true;
    onAuthStateChanged(auth, (user) => {
      useAuth.setState({ user, ready: true });
      if (user) {
        resetEntitlement();
        hydrateEntitlement(user.uid);
        ensureUserDoc(user);
      } else {
        resetEntitlement();
      }
    });
  }, []);
}

/** users/{uid} must exist for the paid-questions rule; create is isPaid:false. */
async function ensureUserDoc(user: User): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        isPaid: false,
        displayName: user.displayName ?? null,
        email: user.email ?? null,
      });
    }
  } catch {
    // First write races are benign; rules reject anything unsafe.
  }
}

// ── Entitlement ─────────────────────────────────────────────────────────────

const IS_PAID_CACHE = 'arnready_is_paid_cache';

type EntitlementState = {
  isPaid: boolean;
  known: boolean;
};

let epoch = 0;

export const useEntitlement = create<EntitlementState>()(() => ({
  isPaid: false,
  known: false,
}));

export function resetEntitlement(): void {
  epoch += 1;
  useEntitlement.setState({ isPaid: false, known: false });
}

export async function hydrateEntitlement(uid: string): Promise<boolean> {
  const started = epoch;
  try {
    const cached = localStorage.getItem(`${IS_PAID_CACHE}_${uid}`);
    if (cached != null && started === epoch) {
      useEntitlement.setState({ isPaid: cached === 'true', known: true });
    }
  } catch {
    // cache miss is fine — the fresh read settles it
  }
  const db = getDb();
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const fresh = snap.data()?.isPaid === true;
    if (started === epoch) {
      useEntitlement.setState({ isPaid: fresh, known: true });
      try {
        localStorage.setItem(`${IS_PAID_CACHE}_${uid}`, String(fresh));
      } catch {}
    }
    return fresh;
  } catch {
    return useEntitlement.getState().isPaid;
  }
}
