/**
 * ensureUserDocument client module (M6): the web's ONLY route to root-document
 * creation is asking the server. This suite pins the client-side contract —
 * memoisation per uid, in-flight coalescing, empty payload, and the outcomes
 * the mock pre-start gate relies on ('error' must surface, never a silent
 * eligible).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { httpsCallableMock, callableFn } = vi.hoisted(() => {
  const callableFn = vi.fn();
  return { httpsCallableMock: vi.fn(() => callableFn), callableFn };
});

vi.mock('firebase/functions', () => ({
  httpsCallable: httpsCallableMock,
}));

const { getAuthClientMock, getFunctionsClientMock } = vi.hoisted(() => ({
  getAuthClientMock: vi.fn(),
  getFunctionsClientMock: vi.fn(),
}));

vi.mock('@/lib/firebaseClient', () => ({
  getAuthClient: getAuthClientMock,
  getFunctionsClient: getFunctionsClientMock,
}));

import { ensureUserDocument, resetEnsureUserDocumentForTests } from '@/lib/ensureUserDocument';

function signedInAs(uid: string | null): void {
  getAuthClientMock.mockReturnValue(uid ? { currentUser: { uid } } : { currentUser: null });
}

beforeEach(() => {
  resetEnsureUserDocumentForTests();
  vi.clearAllMocks();
  getFunctionsClientMock.mockReturnValue({ __functions: true });
  callableFn.mockResolvedValue({ data: { created: true } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ensureUserDocument (client)', () => {
  it('signed out never invokes the callable', async () => {
    signedInAs(null);
    await expect(ensureUserDocument()).resolves.toBe('signed-out');
    expect(httpsCallableMock).not.toHaveBeenCalled();
  });

  it('unavailable Firebase resolves unavailable, no throw', async () => {
    signedInAs('uid-1');
    getFunctionsClientMock.mockReturnValue(null);
    await expect(ensureUserDocument()).resolves.toBe('unavailable');
  });

  it('invokes the named callable with an EMPTY payload and memoises per uid', async () => {
    signedInAs('uid-1');
    await expect(ensureUserDocument()).resolves.toBe('ensured');
    expect(httpsCallableMock).toHaveBeenCalledWith({ __functions: true }, 'ensureUserDocument');
    // The server takes identity from the verified token; nothing is sent.
    expect(callableFn).toHaveBeenCalledTimes(1);
    expect(callableFn).toHaveBeenCalledWith();

    await expect(ensureUserDocument()).resolves.toBe('ensured');
    expect(callableFn).toHaveBeenCalledTimes(1); // memoised — no second round trip
  });

  it('an account switch re-ensures for the new uid', async () => {
    signedInAs('uid-1');
    await ensureUserDocument();
    signedInAs('uid-2');
    await expect(ensureUserDocument()).resolves.toBe('ensured');
    expect(callableFn).toHaveBeenCalledTimes(2);
  });

  it('concurrent calls for one uid coalesce into a single invocation', async () => {
    signedInAs('uid-1');
    let release!: (v: { data: { created: boolean } }) => void;
    callableFn.mockReturnValue(new Promise((resolve) => (release = resolve)));

    const first = ensureUserDocument();
    const second = ensureUserDocument();
    release({ data: { created: false } });
    await expect(first).resolves.toBe('ensured');
    await expect(second).resolves.toBe('ensured');
    expect(callableFn).toHaveBeenCalledTimes(1);
  });

  it('a failed callable resolves error, does NOT memoise, and retries next call', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    signedInAs('uid-1');
    callableFn.mockRejectedValueOnce(new Error('internal'));
    await expect(ensureUserDocument()).resolves.toBe('error');

    callableFn.mockResolvedValueOnce({ data: { created: true } });
    await expect(ensureUserDocument()).resolves.toBe('ensured');
    expect(callableFn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
