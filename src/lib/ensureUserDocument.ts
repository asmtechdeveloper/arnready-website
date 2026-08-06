/**
 * ensureUserDocument (client) — asks the server to create the root
 * `users/{uid}` document for accounts that entered the ecosystem on the web.
 *
 * WHY A CALLABLE (M6, Anusha-approved 2026-08-06): the deployed create rule
 * requires the client to send `isPaid: false`, and manual §0.9 forbids any
 * web client path writing that field — so creation is server-side only. The
 * callable (`ensureUserDocument`, app repo functions/, region asia-south1)
 * verifies the caller, ignores the payload entirely, and creates the app's
 * exact sign-in document if and only if it is absent. THIS module writes
 * nothing: invoking a server function is not a client write path.
 *
 * WHO CALLS IT:
 *   - AuthProvider, once per sign-in, fire-and-forget — so the document
 *     exists long before it is needed;
 *   - the mock pre-start surface, AWAITED — a free user must never begin a
 *     120-minute mock whose submit write the rules would refuse. On 'error'
 *     the surface shows its error state, never a silent "eligible".
 *
 * Success is memoised per uid: the callable is idempotent, but there is no
 * reason to make a network round trip per surface. The memo is process
 * memory only — never web storage (M3: no cross-account bleed) — and is
 * keyed to the uid, so an account switch re-ensures.
 */
import { httpsCallable } from 'firebase/functions';

import { getAuthClient, getFunctionsClient } from './firebaseClient';

export type EnsureOutcome = 'ensured' | 'signed-out' | 'unavailable' | 'error';

let ensuredUid: string | null = null;
let inflight: { uid: string; promise: Promise<EnsureOutcome> } | null = null;

export async function ensureUserDocument(): Promise<EnsureOutcome> {
  const uid = getAuthClient()?.currentUser?.uid ?? null;
  if (!uid) return 'signed-out';
  if (ensuredUid === uid) return 'ensured';
  if (inflight?.uid === uid) return inflight.promise;

  const functions = getFunctionsClient();
  if (!functions) return 'unavailable';

  const promise = (async (): Promise<EnsureOutcome> => {
    try {
      // Payload deliberately empty — the server takes identity from the
      // verified token and ignores anything the client sends.
      await httpsCallable(functions, 'ensureUserDocument')();
      ensuredUid = uid;
      return 'ensured';
    } catch (err) {
      console.warn('[ensureUserDocument] callable failed:', (err as Error)?.message);
      return 'error';
    } finally {
      inflight = null;
    }
  })();

  inflight = { uid, promise };
  return promise;
}

/** Test-only: clears the per-uid memo. */
export function resetEnsureUserDocumentForTests(): void {
  ensuredUid = null;
  inflight = null;
}
