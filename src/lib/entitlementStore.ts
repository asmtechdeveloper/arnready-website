/**
 * entitlementStore — the ONE web owner of `isPaid` state (M3).
 *
 * Mirrors the app's `entitlementStore` (../ARNReady-App/services/
 * entitlementStore.ts): same zustand shape, same `{ isPaid, known }`
 * contract, same epoch guard against cross-account bleed. Screens subscribe
 * via `useEntitlement()`; nothing else reads entitlement, and `isPaid` never
 * rides route params or props.
 *
 * ── The absolute rule (manual §0.9, CLAUDE.md non-negotiable 3) ────────────
 * `users/{uid}.isPaid` is SERVER-WRITE-ONLY. This module READS it and does
 * nothing else. There is no code path here — none, on any branch, including
 * error handling — that writes it, computes it, infers it from a purchase
 * callback, or defaults it to true. Entitlement flows in exactly one
 * direction: Firestore listener → store → UI.
 *
 * ── Two deliberate divergences from the app, both mandated ────────────────
 * 1. LISTENER, not polling. The app does a one-shot read plus a foreground
 *    refresh; the manual specifies a live `onSnapshot` listener for the web
 *    (M3 spec: "read-only isPaid listener"), so a server-side grant flips the
 *    UI without a reload.
 * 2. NO CACHE. The app caches isPaid per-uid in AsyncStorage for offline
 *    reads. The web deliberately caches nothing: the review protocol's M3
 *    checklist requires "no caching across accounts", and a live listener
 *    makes a cache redundant. Offline simply means unpaid — fail-closed.
 *
 * ── Fail-closed, every branch ─────────────────────────────────────────────
 * Missing user doc, malformed doc, permission error, offline, unresolved
 * Firebase config → `isPaid: false`. A user is treated as paid ONLY when a
 * document exists AND `isPaid === true` (strict, not truthy).
 */
import { doc, onSnapshot } from 'firebase/firestore';
import { create } from 'zustand';

import { getDb } from './firebaseClient';

export type EntitlementState = {
  /** Strictly `users/{uid}.isPaid === true`. Never inferred locally. */
  isPaid: boolean;
  /** False until a read (or a definitive failure) has settled. */
  known: boolean;
};

export const useEntitlement = create<EntitlementState>()(() => ({
  isPaid: false,
  known: false,
}));

/**
 * Bumped on every reset (sign-out / uid switch). A listener callback carries
 * the epoch it was attached under and drops its result if the epoch has
 * moved — a late snapshot for the PREVIOUS user must never write paid state
 * for the current one. Ported from the app's identical guard, which exists
 * because a slow read for user A flashed Premium at a freshly signed-in
 * user B.
 */
let epoch = 0;

/** The live Firestore listener, if attached. Exactly one at a time. */
let detach: (() => void) | null = null;

/** The uid the current listener belongs to — used only for the no-op check. */
let currentUid: string | null = null;

function settle(startedEpoch: number, isPaid: boolean): void {
  if (startedEpoch !== epoch) return; // stale — a different user now
  useEntitlement.setState({ isPaid, known: true });
}

/**
 * Detaches any live listener and returns state to unknown/unpaid.
 * Called on sign-out, on uid switch, and on unmount. Idempotent.
 */
export function resetEntitlement(): void {
  epoch += 1;
  if (detach) {
    detach();
    detach = null;
  }
  currentUid = null;
  useEntitlement.setState({ isPaid: false, known: false });
}

/**
 * Points the store at `uid`, or clears it when signed out.
 *
 * Ordering is deliberate and load-bearing: reset FIRST, always. A direct
 * A→B account switch emits no null in between, so without the leading reset
 * the UI would show account A's entitlement while B's first snapshot is in
 * flight. Unknown-and-unpaid is the only acceptable intermediate state.
 */
export function subscribeEntitlement(uid: string | null | undefined): void {
  const nextUid = uid ?? null;

  // Same user, listener already live — re-subscribing would drop a working
  // listener and re-enter the unknown state for no reason.
  if (nextUid !== null && nextUid === currentUid && detach !== null) return;

  resetEntitlement();
  if (nextUid === null) return;

  const db = getDb();
  if (!db) {
    // Firebase unconfigured. Settle as unpaid rather than leaving the UI
    // waiting on a read that will never happen.
    settle(epoch, false);
    return;
  }

  const startedEpoch = epoch;
  currentUid = nextUid;

  detach = onSnapshot(
    doc(db, 'users', nextUid),
    (snapshot) => {
      // Strict equality, not truthiness: a stray "true" string or 1 must not
      // grant entitlement.
      settle(startedEpoch, snapshot.exists() && snapshot.data()?.isPaid === true);
    },
    (error) => {
      // Permission denied, offline, or a transient failure — all unpaid.
      // `known: true` so the UI settles rather than spinning; the entitlement
      // itself stays false, which is the fail-closed answer.
      console.error('[ARNReady] Entitlement listener error — treating as unpaid.', error);
      settle(startedEpoch, false);
    },
  );
}

/** Test-only: the number of live listeners (0 or 1). Pins detach-on-sign-out. */
export function hasLiveEntitlementListener(): boolean {
  return detach !== null;
}
