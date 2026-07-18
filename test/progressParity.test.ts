/**
 * Progress parity — the WEB side of the M4 cross-repo contract.
 *
 * Replays fixtures GENERATED FROM the app's real services
 * (../ARNReady-App/__tests__/progressParityFixtures.test.js) through the real
 * web services, and asserts the Firestore documents are identical.
 *
 * The fixture file is byte-identical in both repos. The app repo asserts its
 * service still produces these documents; this repo asserts the port does too.
 * Change either service and one of the two suites fails — the "breaks loudly"
 * guarantee the execution manual's M4 method requires.
 *
 * WHAT IS UNDER TEST: the shipping `src/lib/progressService.ts` and
 * `src/lib/mistakesService.ts`, exercised through the same `ProgressBackend`
 * seam the browser uses. Only Firestore itself is doubled — no service logic is
 * restated here. The double encodes sentinels exactly as the app's generator
 * does, so a client `Date` where the app writes `serverTimestamp()` fails.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import fixtures from './fixtures/progressParity.fixtures.json';
// `import type` is erased at compile time, so pulling the interface in here
// never drags the Firebase SDK into the test environment.
import type { ActiveMistake, MistakeWrite, ProgressBackend } from '../src/lib/progressBackend';
import {
  recordExamSession,
  recordFlashcardSession,
  recordPracticeSession,
} from '../src/lib/progressService';

const SERVER_TS = { __sentinel: 'serverTimestamp' } as const;

interface Captured {
  chapterProgress: Array<{ docId: string; merge: boolean; data: Record<string, unknown> }>;
  sessions: Array<Record<string, unknown>>;
  mistakes: MistakeWrite[];
  returned: unknown;
}

interface Prior {
  chapterProgress?: Record<string, unknown>;
  activeMistakes?: ActiveMistake[];
}

/**
 * The recording backend. Mirrors the app generator's Firestore double exactly,
 * including its sentinel encoding — that symmetry is what makes the two sides
 * comparable at all.
 */
function recordingBackend(prior: Prior) {
  const captured: Captured = { chapterProgress: [], sessions: [], mistakes: [], returned: null };

  const backend: ProgressBackend = {
    uid: () => 'parity-uid',
    serverTimestamp: () => ({ ...SERVER_TS }),
    increment: (by: number) => ({ __sentinel: 'increment', by }),
    readChapterProgress: async () => prior.chapterProgress,
    writeChapterProgress: async (docId, data, merge) => {
      captured.chapterProgress.push({ docId, merge, data });
    },
    addSession: async (payload) => {
      captured.sessions.push(payload);
    },
    readActiveMistakes: async () => prior.activeMistakes ?? [],
    commitMistakes: async (writes) => {
      captured.mistakes.push(...writes);
    },
  };

  return { backend, captured };
}

type FixtureCase = {
  id: string;
  description: string;
  call: string;
  prior: Prior;
  input: Record<string, unknown>;
  expected: Captured;
};

const cases = (fixtures as { cases: FixtureCase[] }).cases;

async function runCase(testCase: FixtureCase): Promise<Captured> {
  const { backend, captured } = recordingBackend(testCase.prior ?? {});

  if (testCase.call === 'recordExamSession') {
    captured.returned = await recordExamSession(backend, testCase.input as never);
  } else if (testCase.call === 'recordPracticeSession') {
    await recordPracticeSession(backend, testCase.input as never);
  } else if (testCase.call === 'recordFlashcardSession') {
    await recordFlashcardSession(backend, testCase.input as never);
  } else {
    throw new Error(`Unknown call: ${testCase.call}`);
  }

  // Round-trips through JSON so an undefined field cannot pass for an absent
  // one — Firestore treats those very differently.
  return JSON.parse(JSON.stringify(captured)) as Captured;
}

describe('progress parity with the app service', () => {
  it('the fixture file declares its provenance as generated from the app service', () => {
    const meta = (fixtures as { meta: { provenance: string; generatedBy: string; caseCount: number } }).meta;
    expect(meta.generatedBy).toContain('ARNReady-App');
    expect(meta.provenance).toContain('never hand-written');
    expect(meta.caseCount).toBe(cases.length);
  });

  it('covers exam, practice and flashcard write sites', () => {
    const calls = new Set(cases.map((c) => c.call));
    expect(calls).toEqual(
      new Set(['recordExamSession', 'recordPracticeSession', 'recordFlashcardSession']),
    );
  });

  describe.each(cases.map((c) => [c.id, c] as const))('%s', (_id, testCase) => {
    it(testCase.description, async () => {
      expect(await runCase(testCase)).toEqual(testCase.expected);
    });
  });
});

describe('exam scope validation matches the app', () => {
  let backend: ProgressBackend;

  beforeEach(() => {
    backend = recordingBackend({}).backend;
  });

  it.each(['bogus', '', 'FULL', null, undefined])('rejects examScope %o', async (scope) => {
    await expect(
      recordExamSession(backend, {
        chapterNumber: 1,
        correct: 0,
        attempted: 0,
        served: 0,
        scorePct: 0,
        examScope: scope as never,
      }),
    ).rejects.toThrow('recordExamSession: invalid examScope');
  });
});

describe('signed-out safety', () => {
  const signedOut = (): ProgressBackend => ({
    ...recordingBackend({}).backend,
    uid: () => null,
  });

  it('writes nothing for a signed-out exam attempt', async () => {
    const { backend, captured } = recordingBackend({});
    const out = await recordExamSession(
      { ...backend, uid: () => null },
      {
        chapterNumber: 1,
        correct: 5,
        attempted: 10,
        served: 20,
        scorePct: 50,
        examScope: 'sample',
        answers: [0],
        questions: [{ id: 'q1', correctIndex: 1, chapter: 1 }],
      },
    );
    expect(captured.chapterProgress).toEqual([]);
    expect(captured.sessions).toEqual([]);
    expect(captured.mistakes).toEqual([]);
    // The blob is still computed so a signed-out surface can render locally.
    expect(out.next.sample?.lastScore).toBe(5);
  });

  it('writes nothing for a signed-out practice or flashcard run', async () => {
    const { backend, captured } = recordingBackend({});
    const out = { ...backend, uid: () => null };
    await recordPracticeSession(out, { chapterNumber: 1, correct: 1, attempted: 1, scorePct: 100 });
    await recordFlashcardSession(out, { chapterNumber: 1, grades: [{ front: 'a', knew: true }] });
    expect(captured.chapterProgress).toEqual([]);
    expect(captured.sessions).toEqual([]);
    expect(signedOut().uid()).toBeNull();
  });
});
