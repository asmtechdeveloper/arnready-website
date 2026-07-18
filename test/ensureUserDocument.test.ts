/**
 * `ensureUserDocument` — behavioural parity with the app's
 * ../ARNReady-App/services/userDocumentService.js.
 *
 * The progress-parity fixtures cover the three record functions but STUB this
 * one, so without this file the user-document write shape would be pinned by
 * nothing but a source-text scan. Since it is the single place the web writes
 * to `users/{uid}` — the document that carries `isPaid` — it gets real
 * behavioural coverage of every branch.
 *
 * Firestore is doubled at the module boundary so the REAL `firestoreBackend()`
 * runs, including its transaction body.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SERVER_TS = { __sentinel: 'serverTimestamp' };

/** Captures what the transaction body does, in order. */
const captured: Array<{ op: 'set'; path: string; data: Record<string, unknown>; merge: boolean }> = [];
let existingDoc: Record<string, unknown> | undefined;

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({ __db: true }),
  doc: (_db: unknown, ...segments: string[]) => ({ __path: segments.join('/') }),
  collection: (_db: unknown, ...segments: string[]) => ({ __path: segments.join('/') }),
  serverTimestamp: () => SERVER_TS,
  increment: (by: number) => ({ __sentinel: 'increment', by }),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
  runTransaction: async (_db: unknown, body: (t: unknown) => Promise<void>) => {
    const transaction = {
      get: async (ref: { __path: string }) => ({
        exists: () => existingDoc !== undefined,
        data: () => existingDoc,
        __path: ref.__path,
      }),
      set: (ref: { __path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
        captured.push({ op: 'set', path: ref.__path, data, merge: options?.merge === true });
      },
    };
    await body(transaction);
  },
}));

vi.mock('../src/lib/firebaseClient', () => ({
  getDb: () => ({ __db: true }),
  getAuthClient: () => ({ currentUser: { uid: 'ambient-uid' } }),
}));

const { firestoreBackend } = await import('../src/lib/progressBackend');

const USER = { uid: 'user-a', displayName: 'Anusha', email: 'anusha@example.com' };

describe('ensureUserDocument', () => {
  beforeEach(() => {
    captured.length = 0;
    existingDoc = undefined;
  });

  it('creates the document with the app’s exact field set', async () => {
    const created = await firestoreBackend()!.ensureUserDocument(USER);
    expect(created).toBe(true);
    expect(captured).toHaveLength(1);
    expect(captured[0]!.path).toBe('users/user-a');
    expect(captured[0]!.data).toEqual({
      uid: 'user-a',
      displayName: 'Anusha',
      email: 'anusha@example.com',
      createdAt: SERVER_TS,
      isPaid: false,
      freeMockConsumed: false,
    });
  });

  it('stores empty strings, never null, for a missing display name or email', async () => {
    // A Google account with no display name set: the app writes '', and a null
    // here would be a different Firestore value for the identical sign-in.
    await firestoreBackend()!.ensureUserDocument({ uid: 'user-b', displayName: null, email: null });
    expect(captured[0]!.data.displayName).toBe('');
    expect(captured[0]!.data.email).toBe('');
  });

  it('prefers a supplied profile display name over the auth one', async () => {
    await firestoreBackend()!.ensureUserDocument(USER, { displayName: 'Preferred Name' });
    expect(captured[0]!.data.displayName).toBe('Preferred Name');
  });

  it('carries newsletterOptIn onto a created document', async () => {
    await firestoreBackend()!.ensureUserDocument(USER, { newsletterOptIn: true });
    expect(captured[0]!.data.newsletterOptIn).toBe(true);
  });

  it('never overwrites an existing document, and reports it did not create one', async () => {
    existingDoc = { uid: 'user-a', isPaid: true, freeMockConsumed: true };
    const created = await firestoreBackend()!.ensureUserDocument(USER);
    expect(created).toBe(false);
    // No profile fields supplied → nothing written at all.
    expect(captured).toEqual([]);
  });

  it('merges whitelisted profile fields onto an existing document', async () => {
    existingDoc = { uid: 'user-a', isPaid: true };
    await firestoreBackend()!.ensureUserDocument(USER, {
      displayName: 'Renamed',
      newsletterOptIn: false,
    });
    expect(captured).toHaveLength(1);
    expect(captured[0]!.merge).toBe(true);
    // Only the whitelist — crucially NOT uid/email/createdAt, and never isPaid.
    expect(captured[0]!.data).toEqual({ displayName: 'Renamed', newsletterOptIn: false });
  });

  describe('isPaid can never be raised through the profile argument', () => {
    it.each([
      ['on create', undefined],
      ['on merge', { uid: 'user-a', isPaid: false }],
    ])('%s', async (_label, existing) => {
      existingDoc = existing as Record<string, unknown> | undefined;
      await firestoreBackend()!.ensureUserDocument(USER, {
        displayName: 'Attacker',
        // Everything below is outside the whitelist and must be dropped.
        isPaid: true,
        freeMockConsumed: true,
        uid: 'someone-else',
      } as never);

      for (const write of captured) {
        expect(write.data.isPaid).not.toBe(true);
        expect(write.data.uid).not.toBe('someone-else');
      }
      // The merge path must carry the whitelist only.
      if (existing) expect(captured[0]!.data).toEqual({ displayName: 'Attacker' });
      else expect(captured[0]!.data.isPaid).toBe(false);
    });
  });

  it('ignores profile fields of the wrong type, as the app does', async () => {
    await firestoreBackend()!.ensureUserDocument(USER, {
      displayName: 42,
      newsletterOptIn: 'yes',
    } as never);
    // Falls back to the auth display name; the non-boolean opt-in is dropped.
    expect(captured[0]!.data.displayName).toBe('Anusha');
    expect(captured[0]!.data).not.toHaveProperty('newsletterOptIn');
  });

  it('writes nothing when there is no uid', async () => {
    const created = await firestoreBackend()!.ensureUserDocument({ uid: '' });
    expect(created).toBe(false);
    expect(captured).toEqual([]);
  });

  it('targets the PASSED user, not ambient auth state', async () => {
    // The mocked auth client reports 'ambient-uid'. A fast account switch must
    // not redirect the write, so the document path follows the argument.
    await firestoreBackend()!.ensureUserDocument({ uid: 'explicit-uid', displayName: 'X', email: 'x@y.z' });
    expect(captured[0]!.path).toBe('users/explicit-uid');
    expect(captured[0]!.data.uid).toBe('explicit-uid');
  });
});
