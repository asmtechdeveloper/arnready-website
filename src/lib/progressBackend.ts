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
 * MOSTLY NOT IN SCOPE: the `users/{uid}` ROOT document. An earlier M4 draft
 * included a ported `ensureUserDocument`, which wrote `isPaid: false` on
 * creation because the deployed rule `create: … request.resource.data.isPaid
 * == false` demands it. Codex finding M4-B1 rejected that: manual §0.9 says no
 * client code path may write `isPaid`, full stop, and a deployed rule
 * requiring the field does not override the canon — it means client-side
 * CREATION of that document is simply not available to the web. Removed in
 * M4-r; creation is now server-side via the app repo's `ensureUserDocument`
 * callable (M6, Anusha-approved 2026-08-06).
 *
 * M6 narrows that boundary by exactly one write, without touching M4-B1's
 * conclusion: `appendMockAttempt` UPDATES the root document's `mockHistory` /
 * `freeMockConsumed` fields — the app's `mockService.js` write shape, which
 * the deployed update rule (`mockHistoryUpdateIsValid()`) exists to police.
 * It is an update by construction (the doc is created server-side first), it
 * names no other field, and this module still never names `isPaid` at all —
 * `test/isPaidDiscipline.test.ts` pins both properties.
 */
import {
  addDoc,
  arrayUnion,
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
  /**
   * M6 (mistakes surface): the deck entry's home chapter and subtopic,
   * straight off the document with the app's own defaults (`chapter ?? null`,
   * `subtopic ?? 'General'` — app mistakesService.js `getActiveMistakes`).
   * OPTIONAL by design: the M4 parity fixtures and test stubs predate these
   * fields and never read them, so they stay untouched.
   */
  chapter?: number | null;
  subtopic?: string;
}

/**
 * The session-log `source` label for a mistakes-deck re-attempt run — the
 * app's `source === 'mistakes'` (QuizScreen.js:134), which `writeSessionLog`
 * stores verbatim on the session document. Defined HERE rather than at the
 * call site because `test/singleWriteSite.test.ts` reserves the quoted
 * literal to this module: its scan cannot tell a collection name from a
 * field value, and this is the one file already permitted to hold it. The
 * value is data on a session doc, not a collection reference.
 */
export const MISTAKES_RUN_SOURCE = 'mistakes';

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
   * The raw `users/{uid}` ROOT document data, or undefined when absent or
   * signed out. Mock eligibility and history read this — the same direct doc
   * read the app's `mockService.js` performs. Read-only here; the entitlement
   * store remains the only reader of `isPaid` off this document.
   */
  readUserRoot(): Promise<Record<string, unknown> | undefined>;
  /**
   * The ONE root-document write the web performs (see the header): appends a
   * completed mock attempt exactly as the app does — `mockHistory` arrayUnion
   * plus `freeMockConsumed: true`, merged. The record is data, not a sentinel:
   * serverTimestamp() is not allowed inside arrayUnion, so `date` is an ISO
   * string by design (app `mockService.js`).
   */
  appendMockAttempt(record: Record<string, unknown>): Promise<void>;
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
      return snap.docs.map((d) => {
        const data = d.data() as {
          correctStreak?: number;
          chapter?: number | null;
          subtopic?: string;
        };
        return {
          id: d.id,
          correctStreak: data.correctStreak ?? 0,
          chapter: data.chapter ?? null,
          subtopic: data.subtopic ?? 'General',
        };
      });
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

    async readUserRoot() {
      const uid = currentUid();
      if (!uid) return undefined;
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
    },

    async appendMockAttempt(record) {
      const uid = currentUid();
      if (!uid) return;
      await setDoc(
        doc(db, 'users', uid),
        { mockHistory: arrayUnion(record), freeMockConsumed: true },
        { merge: true },
      );
    },

  };
}
