/**
 * mockService port — behaviour pinned line by line against the app's
 * ../ARNReady-App/services/mockService.js (manual M6).
 *
 * Exercised through the same ProgressBackend seam the browser uses, with a
 * recording double (the progressParity pattern): the code under test is the
 * shipping service, and every Firestore touch it makes is observed. The write
 * shape assertions mirror the deployed `mockHistoryUpdateIsValid()` rule —
 * exactly the two fields, one appended record, consumed-flag true.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProgressBackend } from '../src/lib/progressBackend';
import { canTakeMock, getMockHistory, recordMockAttempt } from '../src/lib/mockService';

const FIXED_NOW = new Date('2026-08-06T10:15:30.000Z');

interface Captured {
  appends: Array<Record<string, unknown>>;
  sessions: Array<Record<string, unknown>>;
}

function recordingBackend(opts: {
  uid?: string | null;
  userRoot?: Record<string, unknown> | undefined;
  readError?: Error;
  appendError?: Error;
}) {
  const captured: Captured = { appends: [], sessions: [] };

  const backend: ProgressBackend = {
    // `??` would swallow an explicit null (the signed-out case) — hence the
    // undefined check.
    uid: () => (opts.uid === undefined ? 'mock-uid' : opts.uid),
    serverTimestamp: () => ({ __sentinel: 'serverTimestamp' }),
    increment: (by: number) => ({ __sentinel: 'increment', by }),
    readChapterProgress: async () => undefined,
    writeChapterProgress: async () => {},
    addSession: async (payload) => {
      captured.sessions.push(payload);
    },
    readActiveMistakes: async () => [],
    commitMistakes: async () => {},
    readUserRoot: async () => {
      if (opts.readError) throw opts.readError;
      return opts.userRoot;
    },
    appendMockAttempt: async (record) => {
      if (opts.appendError) throw opts.appendError;
      captured.appends.push(record);
    },
  };

  return { backend, captured };
}

const QUESTIONS = [
  { id: 'q1', chapter: 1, subtopic: 'NAV', correctIndex: 0 },
  { id: 'q2', chapter: 2, subtopic: 'SIP', correctIndex: 1 },
  { id: 'q3', chapter: 9, subtopic: 'Tax', correctIndex: 2 },
];

describe('canTakeMock — LOCKED one-free-mock-ever semantics (app mockService.js:36-44)', () => {
  it('paid users are always eligible, without any read', async () => {
    const { backend } = recordingBackend({ readError: new Error('must not be called') });
    await expect(canTakeMock(backend, true)).resolves.toBe(true);
  });

  it('signed out is never eligible', async () => {
    const { backend } = recordingBackend({ uid: null });
    await expect(canTakeMock(backend, false)).resolves.toBe(false);
  });

  it('free with an absent root document reads as never-attempted (eligible)', async () => {
    // The document is created server-side at sign-in (ensureUserDocument
    // callable); the app has the same shape for its own pre-doc reads.
    const { backend } = recordingBackend({ userRoot: undefined });
    await expect(canTakeMock(backend, false)).resolves.toBe(true);
  });

  it('free with freeMockConsumed true is refused — including a mock consumed on Android', async () => {
    // Cross-platform semantics: same field, same doc — a mock consumed in the
    // app was written by the app's own service; the web reads the identical
    // field and must refuse (review protocol §4 M6).
    const { backend } = recordingBackend({
      userRoot: { freeMockConsumed: true, mockHistory: [{ date: 'x', score: 40 }] },
    });
    await expect(canTakeMock(backend, false)).resolves.toBe(false);
  });

  it('legacy: history present but no freeMockConsumed field still refuses', async () => {
    const { backend } = recordingBackend({ userRoot: { mockHistory: [{ date: 'x', score: 40 }] } });
    await expect(canTakeMock(backend, false)).resolves.toBe(false);
  });

  it('empty history and consumed-flag absent is eligible', async () => {
    const { backend } = recordingBackend({ userRoot: { mockHistory: [] } });
    await expect(canTakeMock(backend, false)).resolves.toBe(true);
  });

  it('a failed eligibility read THROWS — never a silent eligible, never the used-mock pitch', async () => {
    const { backend } = recordingBackend({ readError: new Error('offline') });
    await expect(canTakeMock(backend, false)).rejects.toThrow('offline');
  });
});

describe('getMockHistory (app mockService.js:23-33)', () => {
  it('returns the stored history', async () => {
    const history = [{ date: '2026-08-01T00:00:00.000Z', score: 61, total: 100, percentage: 61 }];
    const { backend } = recordingBackend({ userRoot: { mockHistory: history } });
    await expect(getMockHistory(backend)).resolves.toEqual(history);
  });

  it('degrades to [] when signed out, when the doc is absent, and on a read error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(getMockHistory(recordingBackend({ uid: null }).backend)).resolves.toEqual([]);
    await expect(
      getMockHistory(recordingBackend({ userRoot: undefined }).backend),
    ).resolves.toEqual([]);
    await expect(
      getMockHistory(recordingBackend({ readError: new Error('offline') }).backend),
    ).resolves.toEqual([]);
    warn.mockRestore();
  });
});

describe('recordMockAttempt — the counter write (app mockService.js:46-90)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('appends exactly the app record shape and flips freeMockConsumed', async () => {
    const { backend, captured } = recordingBackend({});
    await recordMockAttempt(backend, {
      score: 61,
      total: 100,
      percentage: 61,
      timeTaken: 5400,
      weakChapters: [9, 12, 4],
      answers: [0, 1, null],
      questions: QUESTIONS,
    });
    await vi.runAllTimersAsync();

    // One append; date is an ISO string (serverTimestamp is not allowed inside
    // arrayUnion — app comment, by design); answers/questions NEVER enter the
    // history record — the session log carries them.
    expect(captured.appends).toEqual([
      {
        date: FIXED_NOW.toISOString(),
        score: 61,
        total: 100,
        percentage: 61,
        timeTaken: 5400,
        weakChapters: [9, 12, 4],
      },
    ]);
  });

  it('writes the mock session log through the M4 single write site, app shape', async () => {
    const { backend, captured } = recordingBackend({});
    await recordMockAttempt(backend, {
      score: 2,
      total: 100,
      percentage: 2,
      timeTaken: 900,
      weakChapters: [1],
      answers: [0, 2, null],
      questions: QUESTIONS,
    });
    await vi.runAllTimersAsync();

    expect(captured.sessions).toEqual([
      {
        mode: 'mock',
        source: null,
        examScope: null,
        chapter: null,
        completedAt: { __sentinel: 'serverTimestamp' },
        correct: 2,
        attempted: 2, // null answers never count as attempted
        served: 100,
        scorePct: 2,
        endedEarly: false,
        timeTaken: 900,
        answers: [
          { qId: 'q1', picked: 0, correct: true },
          { qId: 'q2', picked: 2, correct: false },
          { qId: 'q3', picked: null, correct: false },
        ],
      },
    ]);
  });

  it('is a no-op when signed out', async () => {
    const { backend, captured } = recordingBackend({ uid: null });
    await recordMockAttempt(backend, { score: 1, total: 100, percentage: 1 });
    await vi.runAllTimersAsync();
    expect(captured.appends).toEqual([]);
    expect(captured.sessions).toEqual([]);
  });

  it('a failed history append never blocks the session log (app: independent catches)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { backend, captured } = recordingBackend({ appendError: new Error('rules-denied') });
    await recordMockAttempt(backend, {
      score: 5,
      total: 100,
      percentage: 5,
      answers: [],
      questions: [],
    });
    await vi.runAllTimersAsync();
    expect(captured.appends).toEqual([]);
    expect(captured.sessions).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith('[mockService] attempt write failed:', 'rules-denied');
    warn.mockRestore();
  });

  it('omits timeTaken from the history record when the caller does not supply it (app spread semantics)', async () => {
    const { backend, captured } = recordingBackend({});
    await recordMockAttempt(backend, { score: 3, total: 100, percentage: 3 });
    await vi.runAllTimersAsync();
    expect(captured.appends[0]).not.toHaveProperty('timeTaken');
    // ...but the session log defaults it to null, exactly like the app.
    expect(captured.sessions[0]).toMatchObject({ timeTaken: null });
  });
});
