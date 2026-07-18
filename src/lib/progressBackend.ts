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
 *
 * NOT IN SCOPE: the `users/{uid}` document itself. An earlier M4 draft included
 * a ported `ensureUserDocument`, which wrote `isPaid: false` on creation
 * because the deployed rule `create: … request.resource.data.isPaid == false`
 * demands it. Codex finding M4-B1 rejected that: manual §0.9 says no client
 * code path may write `isPaid`, full stop, and a deployed rule requiring the
 * field does not override the canon — it means client-side creation of that
 * document is simply not available to the web. Removed in M4-r. Nothing here
 * needs it: `users/{uid}/{document=**}` grants the subcollection writes below
 * without the parent document existing, and free question reads (`isFree ==
 * true`) do not consult it either. See the M4 packet §6.3 for what this leaves
 * open for M5.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
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
}

/**
 * The real backend. Returns null when Firebase is unavailable or signed out —
 * callers treat null as "no write happens", never as an error to retry.
 */
export function firestoreBackend(): ProgressBackend | null {
  const db = getDb();
  if (!db) return null;

  const currentUid = (): string | null => getAuthClient()?.currentUser?.uid ?? null;

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

  };
}
