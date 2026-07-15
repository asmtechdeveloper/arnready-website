import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  PRACTICE_GATE_INDEX,
  FREE_QUESTIONS_PER_CHAPTER,
  FLASHCARD_GATE_EVERY,
  FLASHCARD_GATE_MAX,
  practiceNudgeBeforeQuestion,
  practiceWallBeforeQuestion,
  examNudgeBeforeStart,
  flashcardNudgeAfterReveal,
  countDistinctReveals,
} from '@/lib/nudgeGates';
import golden from './fixtures/nudgeGates.golden.json';

/**
 * Pins src/lib/nudgeGates.ts to the committed golden fixture
 * (test/fixtures/nudgeGates.golden.json, produced by
 * scripts/gen-nudge-golden.mjs) across the exhaustive matrix required by
 * the M2 plan §4 step S1. This test NEVER skips — it is the guaranteed
 * oracle (the M1-B10 lesson: no skipIf on core coverage).
 */

describe('practiceNudgeBeforeQuestion matches the golden (full matrix)', () => {
  for (const row of golden.practice) {
    it(`nextIndex=${row.nextIndex} isPaid=${row.isPaid} nudgesShownThisRun=${row.nudgesShownThisRun} -> ${row.expected}`, () => {
      expect(
        practiceNudgeBeforeQuestion(row.nextIndex, {
          isPaid: row.isPaid,
          nudgesShownThisRun: row.nudgesShownThisRun,
        }),
      ).toBe(row.expected);
    });
  }
});

describe('practiceWallBeforeQuestion matches the golden (full matrix)', () => {
  for (const row of golden.wall) {
    it(`nextIndex=${row.nextIndex} isPaid=${row.isPaid} -> ${row.expected}`, () => {
      expect(practiceWallBeforeQuestion(row.nextIndex, { isPaid: row.isPaid })).toBe(
        row.expected,
      );
    });
  }
});

describe('examNudgeBeforeStart matches the golden (full matrix)', () => {
  for (const row of golden.exam) {
    it(`isPaid=${row.isPaid} nudgeShown=${row.nudgeShown} -> ${row.expected}`, () => {
      expect(examNudgeBeforeStart({ isPaid: row.isPaid, nudgeShown: row.nudgeShown })).toBe(
        row.expected,
      );
    });
  }
});

describe('flashcardNudgeAfterReveal matches the golden (full matrix)', () => {
  for (const row of golden.flashcard) {
    it(`distinctReveals=${row.distinctReveals} isPaid=${row.isPaid} gatesShownThisRun=${row.gatesShownThisRun} -> ${row.expected}`, () => {
      expect(
        flashcardNudgeAfterReveal(row.distinctReveals, {
          isPaid: row.isPaid,
          gatesShownThisRun: row.gatesShownThisRun,
        }),
      ).toBe(row.expected);
    });
  }
});

describe('run simulations', () => {
  it('flashcard: exactly three nudges fire, at distinct reveals 15/30/45, over a 60-distinct-reveal run', () => {
    let gatesShownThisRun = 0;
    const firedAt: number[] = [];
    for (let distinctReveals = 1; distinctReveals <= 60; distinctReveals += 1) {
      const result = flashcardNudgeAfterReveal(distinctReveals, {
        isPaid: false,
        gatesShownThisRun,
      });
      if (result === 'nudge') {
        firedAt.push(distinctReveals);
        gatesShownThisRun += 1;
      }
    }
    expect(firedAt).toEqual([15, 30, 45]);
    expect(gatesShownThisRun).toBe(FLASHCARD_GATE_MAX);
  });

  it('practice: the nudge fires once at Q11 (index 10) and never again for the rest of the run', () => {
    let nudgesShownThisRun = 0;
    const firedAt: number[] = [];
    for (let nextIndex = 0; nextIndex <= 25; nextIndex += 1) {
      const result = practiceNudgeBeforeQuestion(nextIndex, {
        isPaid: false,
        nudgesShownThisRun,
      });
      if (result === 'nudge') {
        firedAt.push(nextIndex);
        nudgesShownThisRun += 1;
      }
    }
    expect(firedAt).toEqual([PRACTICE_GATE_INDEX]);
    expect(nudgesShownThisRun).toBe(1);
  });
});

describe('totality — poison inputs never throw, always resolve to the non-blocking answer', () => {
  it('practiceNudgeBeforeQuestion', () => {
    expect(() =>
      practiceNudgeBeforeQuestion(Number.NaN, { isPaid: false, nudgesShownThisRun: 0 }),
    ).not.toThrow();
    expect(
      practiceNudgeBeforeQuestion(Number.NaN, { isPaid: false, nudgesShownThisRun: 0 }),
    ).toBeNull();
    expect(
      practiceNudgeBeforeQuestion(10, {
        isPaid: false,
        nudgesShownThisRun: Number.NaN,
      }),
    ).toBeNull();
    // @ts-expect-error — deliberately poisoning at runtime to prove totality
    expect(practiceNudgeBeforeQuestion(undefined, { isPaid: false, nudgesShownThisRun: 0 })).toBeNull();
    // @ts-expect-error — deliberately poisoning at runtime to prove totality
    expect(() => practiceNudgeBeforeQuestion(10, undefined)).not.toThrow();
  });

  it('practiceWallBeforeQuestion', () => {
    expect(practiceWallBeforeQuestion(Number.NaN, { isPaid: false })).toBeNull();
    // @ts-expect-error — deliberately poisoning at runtime to prove totality
    expect(() => practiceWallBeforeQuestion(undefined, { isPaid: false })).not.toThrow();
  });

  it('examNudgeBeforeStart', () => {
    // @ts-expect-error — deliberately poisoning at runtime to prove totality
    expect(examNudgeBeforeStart({ isPaid: false, nudgeShown: undefined })).toBeNull();
    // @ts-expect-error — deliberately poisoning at runtime to prove totality
    expect(() => examNudgeBeforeStart(undefined)).not.toThrow();
  });

  it('flashcardNudgeAfterReveal', () => {
    expect(
      flashcardNudgeAfterReveal(Number.NaN, { isPaid: false, gatesShownThisRun: 0 }),
    ).toBeNull();
    expect(
      flashcardNudgeAfterReveal(15, { isPaid: false, gatesShownThisRun: Number.NaN }),
    ).toBeNull();
    // @ts-expect-error — deliberately poisoning at runtime to prove totality
    expect(() => flashcardNudgeAfterReveal(undefined, undefined)).not.toThrow();
  });

  it('countDistinctReveals', () => {
    // @ts-expect-error — deliberately poisoning at runtime to prove totality
    expect(countDistinctReveals(undefined)).toBe(0);
    // @ts-expect-error — deliberately poisoning at runtime to prove totality
    expect(countDistinctReveals(null)).toBe(0);
    expect(countDistinctReveals([])).toBe(0);
    expect(countDistinctReveals(['a', 'a', 'b'])).toBe(2);
  });

  it('every gate is a short-circuit no-op for isPaid:true, including on poison numeric input', () => {
    expect(
      practiceNudgeBeforeQuestion(Number.NaN, { isPaid: true, nudgesShownThisRun: 0 }),
    ).toBeNull();
    expect(practiceWallBeforeQuestion(Number.NaN, { isPaid: true })).toBeNull();
    expect(examNudgeBeforeStart({ isPaid: true, nudgeShown: false })).toBeNull();
    expect(
      flashcardNudgeAfterReveal(Number.NaN, { isPaid: true, gatesShownThisRun: 0 }),
    ).toBeNull();
  });
});

describe('sanity: pinned constants match the app values cited in the doc comments', () => {
  it('PRACTICE_GATE_INDEX is 10 (Q11, app CONFIG.AD_GATE_1)', () => {
    expect(PRACTICE_GATE_INDEX).toBe(10);
  });
  it('FREE_QUESTIONS_PER_CHAPTER is 20 (app CONFIG.FREE_QUESTIONS_PER_CHAPTER)', () => {
    expect(FREE_QUESTIONS_PER_CHAPTER).toBe(20);
  });
  it('FLASHCARD_GATE_EVERY is 15, FLASHCARD_GATE_MAX is 3', () => {
    expect(FLASHCARD_GATE_EVERY).toBe(15);
    expect(FLASHCARD_GATE_MAX).toBe(3);
  });
});

// ─── Optional live cross-repo parity test (D7) ────────────────────────────
// Additive only — never a replacement for the golden test above, which
// always runs. Imports the REAL app gateBeforeQuestion and asserts the web
// practice gate matches it 1:1 (with the 'ad'->'nudge' mapping). Skips
// loudly when the app repo isn't present beside this one (e.g. a clean
// website-only checkout / CI without the sibling repo).
const appQuizEnginePath = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'ARNReady-App',
  'services',
  'quizEngine.ts',
);
const appRepoPresent = existsSync(appQuizEnginePath);

if (!appRepoPresent) {
  console.warn(
    '[nudgeGates.test.ts] SKIPPING live cross-repo parity test — ' +
      `../ARNReady-App/services/quizEngine.ts not found at ${appQuizEnginePath}. ` +
      'The golden-fixture test above is unaffected and still ran in full.',
  );
}

describe.skipIf(!appRepoPresent)('LIVE cross-repo parity: app gateBeforeQuestion vs web practice gate', () => {
  it('practiceNudgeBeforeQuestion matches the real app gateBeforeQuestion across the full matrix', async () => {
    const appModule = await import(/* @vite-ignore */ appQuizEnginePath);
    const gateBeforeQuestion = appModule.gateBeforeQuestion as (
      nextIndex: number,
      opts: { isPaid: boolean; adsWatched: number; gate1?: number },
    ) => 'ad' | null;

    for (let nextIndex = 0; nextIndex <= 25; nextIndex += 1) {
      for (const isPaid of [true, false]) {
        for (const nudgesShownThisRun of [0, 1, 2]) {
          const appResult = gateBeforeQuestion(nextIndex, {
            isPaid,
            adsWatched: nudgesShownThisRun,
          });
          const expected = appResult === 'ad' ? 'nudge' : null;
          expect(
            practiceNudgeBeforeQuestion(nextIndex, { isPaid, nudgesShownThisRun }),
          ).toBe(expected);
        }
      }
    }
  });
});
