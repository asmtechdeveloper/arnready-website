/**
 * progressBackend — the narrow Firestore seam beneath the progress services.
 *
 * WHY A SEAM (M4)
 * The website must write progress/sessions/mistakes documents byte-identical to
 * the app's `progressService`. Proving that requires capturing the exact
 * payloads the REAL service produces — the same way the app-side fixture
 * generator captures the real app service. So the service talks to this
 * interface, the browser gets `firestoreBackend()`, and the parity test injects
 * a recorder. The code under test is the shipping code, not a restatement of it.
 *
 * Sentinels are created HERE, never inlined in the service, so the parity test
 * can encode them as `{ __sentinel: … }` exactly as the app's generator does.
 * A serverTimestamp and a client `new Date()` therefore cannot compare equal —
 * the timestamp-semantics drift that would silently corrupt the app's
 * Prepometer fails the test loudly instead.
 *
 * SCOPE: the ONLY module in `src/` that may write to `chapterProgress`,
 * `sessions`, or `mistakes`. `test/singleWriteSite.test.ts` pins that.
 */
import {
  type Firestore,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { getAuthClient, getDb } from './firebaseClient';

/** A Firestore field sentinel. Opaque by design — never inspected or built by hand. */
export type Sentinel = unknown;

export interface MistakeWrite {
  docId: string;
  data: Record<string, unknown>;
  merge: boolean;
}

export interface ActiveMistake {
  id: string;
  correctStreak: number;
}

export interface ProgressBackend {
  /** The signed-in uid, or null when signed out. Every write is a no-op when null. */
  uid(): string | null;
  serverTimestamp(): Sentinel;
  increment(by: number): Sentinel;
  /** The raw `chapterProgress/{docId}` data, or undefined when the document is absent. */
  readChapterProgress(docId: string): Promise<Record<string, unknown> | undefined>;
  writeChapterProgress(docId: string, data: Record<string, unknown>, merge: boolean): Promise<void>;
  addSession(payload: Record<string, unknown>): Promise<void>;
  /** Non-retired deck entries. The service's only mistakes query. */
  readActiveMistakes(): Promise<ActiveMistake[]>;
  /** Committed as one batch, mirroring the app. Never called with an empty list. */
  commitMistakes(writes: MistakeWrite[]): Promise<void>;
  /**
   * Creates `users/{uid}` if absent, and merges whitelisted profile fields when
   * it already exists. Transactional so a concurrent server-side entitlement
   * grant is never overwritten. Ported field-for-field from the app's
   * `ensureUserDocument`, including its two-field whitelist — which is what
   * makes `isPaid` unreachable through the profile argument (manual §0.9).
   *
   * `user` is passed explicitly rather than read from ambient auth state, as in
   * the app: the caller has just obtained the user, and re-reading
   * `currentUser` mid-transaction can resolve to a different account during a
   * fast sign-in/sign-out flap.
   */
  ensureUserDocument(
    user: { uid: string; displayName?: string | null; email?: string | null },
    profile?: { displayName?: unknown; newsletterOptIn?: unknown },
  ): Promise<boolean>;
}

/**
 * The real backend. Returns null when Firebase is unavailable or signed out —
 * callers treat null as "no write happens", never as an error to retry.
 */
export function firestoreBackend(): ProgressBackend | null {
  const db = getDb();
  if (!db) return null;

  const currentUid = (): string | null => getAuthClient()?.currentUser?.uid ?? null;

  const userDoc = (db2: Firestore, uid: string) => doc(db2, 'users', uid);

  return {
    uid: currentUid,
    serverTimestamp: () => serverTimestamp(),
    increment: (by: number) => increment(by),

    async readChapterProgress(docId) {
      const uid = currentUid();
      if (!uid) return undefined;
      const snap = await getDoc(doc(db, 'users', uid, 'chapterProgress', docId));
      return snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
    },

    async writeChapterProgress(docId, data, merge) {
      const uid = currentUid();
      if (!uid) return;
      await setDoc(doc(db, 'users', uid, 'chapterProgress', docId), data, { merge });
    },

    async addSession(payload) {
      const uid = currentUid();
      if (!uid) return;
      await addDoc(collection(db, 'users', uid, 'sessions'), payload);
    },

    async readActiveMistakes() {
      const uid = currentUid();
      if (!uid) return [];
      const snap = await getDocs(
        query(collection(db, 'users', uid, 'mistakes'), where('retired', '==', false)),
      );
      return snap.docs.map((d) => ({
        id: d.id,
        correctStreak: (d.data() as { correctStreak?: number }).correctStreak ?? 0,
      }));
    },

    async commitMistakes(writes) {
      const uid = currentUid();
      if (!uid) return;
      const batch = writeBatch(db);
      for (const w of writes) {
        batch.set(doc(db, 'users', uid, 'mistakes', w.docId), w.data, { merge: w.merge });
      }
      await batch.commit();
    },

    async ensureUserDocument(user, profile = {}) {
      if (!user?.uid) return false;

      // Whitelist of client-owned profile fields, ported verbatim from
      // ../ARNReady-App/services/userDocumentService.js. This is the security
      // boundary: `isPaid` cannot pass through this helper because only these
      // two keys, at these two types, are ever copied out of the caller's
      // object. The spread below is therefore safe — it can only ever spread
      // these two fields. Only the server-side entitlement chain may grant.
      const safeProfile: { displayName?: string; newsletterOptIn?: boolean } = {};
      if (typeof profile.displayName === 'string') safeProfile.displayName = profile.displayName;
      if (typeof profile.newsletterOptIn === 'boolean') {
        safeProfile.newsletterOptIn = profile.newsletterOptIn;
      }

      let created = false;
      await runTransaction(db, async (transaction) => {
        const ref = userDoc(db, user.uid);
        const snap = await transaction.get(ref);
        if (snap.exists()) {
          if (Object.keys(safeProfile).length > 0) {
            transaction.set(ref, safeProfile, { merge: true });
          }
          return;
        }

        // `isPaid: false` is required by the deployed rule
        // `create: … request.resource.data.isPaid == false`. The `?? ''`
        // fallbacks are the app's: a Google account with no display name must
        // store an empty string, never null.
        transaction.set(ref, {
          uid: user.uid,
          displayName: safeProfile.displayName ?? user.displayName ?? '',
          email: user.email ?? '',
          createdAt: serverTimestamp(),
          isPaid: false,
          freeMockConsumed: false,
          ...safeProfile,
        });
        created = true;
      });
      return created;
    },
  };
}
