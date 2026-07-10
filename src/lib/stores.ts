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
import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
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

let entitlementUnsub: Unsubscribe | null = null;

export function resetEntitlement(): void {
  epoch += 1;
  entitlementUnsub?.();
  entitlementUnsub = null;
  useEntitlement.setState({ isPaid: false, known: false });
}

/**
 * Live entitlement subscription (architecture §5: server state is
 * authoritative and revocations/purchases land while the page is open).
 * The UID-scoped cache is only a fast first paint for a RETURNING user —
 * `known` stays false until the server answers, so ad surfaces and the
 * mock gate never act on cache alone.
 */
export function hydrateEntitlement(uid: string): void {
  const started = epoch;
  let cachedHint: boolean | null = null;
  try {
    const cached = localStorage.getItem(`${IS_PAID_CACHE}_${uid}`);
    if (cached != null && started === epoch) {
      cachedHint = cached === 'true';
      useEntitlement.setState({ isPaid: cachedHint, known: false });
    }
  } catch {
    // cache miss is fine — the snapshot settles it
  }
  const db = getDb();
  if (!db) return;
  entitlementUnsub = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (started !== epoch) return;
      const fresh = snap.data()?.isPaid === true;
      useEntitlement.setState({ isPaid: fresh, known: true });
      try {
        localStorage.setItem(`${IS_PAID_CACHE}_${uid}`, String(fresh));
      } catch {}
    },
    () => {
      // Listener failure (offline, rules): fail toward the cached hint for
      // DISPLAY, but never mark a paid state known without the server.
      if (started !== epoch) return;
      useEntitlement.setState({
        isPaid: cachedHint === true,
        known: cachedHint === false, // "free" is safe to settle; "paid" is not
      });
    },
  );
}
