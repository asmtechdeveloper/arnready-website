/**
 * quizEngine port parity (M5 plan D4/D5, manual M5 step 2).
 *
 * The manual requires practice/exam ordering and draw to be PORTED from the
 * app's `quizEngine` "with fixture tests pinning them to app values. Never
 * re-derive." This file is that pin.
 *
 * PROVENANCE — the point of the whole exercise. Every `expected` value in
 * `test/fixtures/quizEngine.golden.json` was produced by CALLING the app's
 * real `../ARNReady-App/services/quizEngine.ts` (see
 * `scripts/gen-quizengine-golden.mjs`, which imports it directly). Nothing was
 * hand-computed to match the web port. The review protocol's M4 lesson applies
 * here verbatim: fixtures written by hand to agree with the port prove only
 * that the port agrees with itself.
 *
 * NEVER SKIPPED, and never needs the app repo present: the golden suite below
 * reads only committed JSON. That is finding M1-B10's lesson in this repo's
 * review log — core coverage must not sit behind a `skipIf`. The optional
 * live cross-repo block at the bottom is strictly ADDITIVE: skipping it can
 * never make a broken port pass.
 *
 * Randomness is shared, not re-implemented: both the generator and this file
 * import `makeSeededRng` from `scripts/lib/seededRng.mjs`, so the two sides
 * cannot drift apart in their random source.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  capFreeQuestionSet,
  computeExamScorePct,
  computePracticePct,
  drawExamSet,
  orderPracticeSet,
  type Question,
} from '@/lib/quizEngine';
import { makeSeededRng } from '../scripts/lib/seededRng.mjs';
import golden from './fixtures/quizEngine.golden.json';

type GoldenCase = {
  id: string;
  fn: string;
  description: string;
  seed?: number;
  input: Record<string, unknown>;
  expected: unknown;
};

const cases = golden.cases as GoldenCase[];

/**
 * Replays one recorded case through the WEB port. A case carrying a `seed`
 * gets a freshly seeded rng, so the port consumes the identical random
 * sequence the app consumed when the fixture was recorded.
 */
function runPort(testCase: GoldenCase): unknown {
  const { fn, input, seed } = testCase;
  const rng = seed === undefined ? undefined : makeSeededRng(seed);

  switch (fn) {
    case 'capFreeQuestionSet':
      return capFreeQuestionSet(
        input.questions as Question[],
        input.limit as number,
      );
    case 'orderPracticeSet':
      return orderPracticeSet(input.questions as Question[], {
        ...(input.opts as { isPaid: boolean }),
        ...(rng ? { rng } : {}),
      });
    case 'drawExamSet':
      return drawExamSet(input.questions as Question[], {
        ...(input.opts as { isPaid: boolean; examSize?: number }),
        ...(rng ? { rng } : {}),
      });
    case 'computeExamScorePct':
      return computeExamScorePct(
        input as { isPaid: boolean; correct: number; attempted: number; served: number },
      );
    case 'computePracticePct':
      return computePracticePct(input.correct as number, input.attempted as number);
    default:
      throw new Error(
        `Unknown fixture fn "${fn}" in case "${testCase.id}". A new function was ` +
          `added to the generator without a replay branch here — that would ` +
          `silently record app values nothing ever checks.`,
      );
  }
}

describe('quizEngine web port matches app-generated golden fixtures', () => {
  it('records its provenance as a live app import, not a re-statement', () => {
    expect(golden.generatedFrom).toContain('ARNReady-App/services/quizEngine.ts');
  });

  it('covers every ported function', () => {
    // Guards the silent-shrink failure: a regenerated fixture that lost a
    // function would otherwise still pass every remaining case.
    expect(new Set(cases.map((c) => c.fn))).toEqual(
      new Set([
        'capFreeQuestionSet',
        'orderPracticeSet',
        'drawExamSet',
        'computeExamScorePct',
        'computePracticePct',
      ]),
    );
    expect(cases.length).toBeGreaterThanOrEqual(19);
  });

  it.each(cases.map((c) => [c.id, c] as const))('%s', (_id, testCase) => {
    expect(runPort(testCase)).toEqual(testCase.expected);
  });
});

// ── Optional live cross-repo check (additive; see file header) ──────────────
// Mirrors the pattern already established in test/nudgeGates.test.ts.
const appQuizEnginePath = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'ARNReady-App',
  'services',
  'quizEngine.ts',
);
const appRepoPresent = existsSync(appQuizEnginePath);

describe.skipIf(!appRepoPresent)('LIVE cross-repo parity: app quizEngine vs web port', () => {
  it('produces identical results for the recorded cases, called side by side', async () => {
    const app = (await import(/* @vite-ignore */ appQuizEnginePath)) as {
      capFreeQuestionSet: typeof capFreeQuestionSet;
      orderPracticeSet: typeof orderPracticeSet;
      drawExamSet: typeof drawExamSet;
      computeExamScorePct: typeof computeExamScorePct;
      computePracticePct: typeof computePracticePct;
    };

    for (const testCase of cases) {
      const { fn, input, seed } = testCase;
      const appRng = seed === undefined ? undefined : makeSeededRng(seed);
      let appResult: unknown;

      switch (fn) {
        case 'capFreeQuestionSet':
          appResult = app.capFreeQuestionSet(input.questions as Question[], input.limit as number);
          break;
        case 'orderPracticeSet':
          appResult = app.orderPracticeSet(input.questions as Question[], {
            ...(input.opts as { isPaid: boolean }),
            ...(appRng ? { rng: appRng } : {}),
          });
          break;
        case 'drawExamSet':
          appResult = app.drawExamSet(input.questions as Question[], {
            ...(input.opts as { isPaid: boolean; examSize?: number }),
            ...(appRng ? { rng: appRng } : {}),
          });
          break;
        case 'computeExamScorePct':
          appResult = app.computeExamScorePct(
            input as { isPaid: boolean; correct: number; attempted: number; served: number },
          );
          break;
        case 'computePracticePct':
          appResult = app.computePracticePct(input.correct as number, input.attempted as number);
          break;
        default:
          throw new Error(`Unknown fixture fn "${fn}"`);
      }

      expect(runPort(testCase), `${testCase.id} (live)`).toEqual(appResult);
    }
  });
});
