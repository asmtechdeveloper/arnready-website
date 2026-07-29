#!/usr/bin/env node
/**
 * gen-quizengine-golden.mjs — generates the committed golden fixture
 * (test/fixtures/quizEngine.golden.json) that pins src/lib/quizEngine.ts
 * against the APP's real quizEngine.ts (M5 plan §2 D5).
 *
 * PROVENANCE: unlike scripts/gen-nudge-golden.mjs (which had to re-state the
 * app rules by citation because a cross-repo TS import was judged too
 * fragile at the time), this generator DOES `import()` the app's real
 * ../ARNReady-App/services/quizEngine.ts at runtime and calls its actual
 * exported functions to produce every "expected" value below. Node in this
 * environment (v24, native TypeScript type-stripping) loads that file
 * directly with no transpiler step — verified working ahead of writing this
 * script. That gives the fixture genuine provenance: nothing here is
 * hand-computed or re-derived, only recorded.
 *
 * Every case that consumes randomness is driven by a small seeded LCG
 * (mulberry32-style) defined below — never `Math.random`. The seed is
 * recorded alongside each such case so `test/quizEnginePort.test.ts` can
 * re-instantiate an identical rng and replay the exact same call sequence
 * through the WEB port (src/lib/quizEngine.ts), which must produce the
 * bit-identical output recorded here.
 *
 * Run as `node scripts/gen-quizengine-golden.mjs` from the repo root.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { makeSeededRng } from './lib/seededRng.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_PATH = path.resolve(ROOT, 'test/fixtures/quizEngine.golden.json');
const APP_QUIZ_ENGINE_PATH = path.resolve(
  ROOT,
  '..',
  'ARNReady-App',
  'services',
  'quizEngine.ts',
);

// The seeded rng is deliberately NOT defined here: `test/quizEnginePort.test.ts`
// imports the SAME module, so the generator and the test cannot drift apart in
// their random source. See scripts/lib/seededRng.mjs.

function q(overrides) {
  return {
    id: 'q1',
    chapter: 1,
    subtopic: 'General',
    question: 'stub question text',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 0,
    difficulty: 'medium',
    isFree: true,
    isSeed: true,
    ...overrides,
  };
}

async function main() {
  const app = await import(pathToFileURL(APP_QUIZ_ENGINE_PATH).href);
  const {
    capFreeQuestionSet,
    orderPracticeSet,
    drawExamSet,
    computeExamScorePct,
    computePracticePct,
  } = app;

  const cases = [];

  // ─── capFreeQuestionSet ────────────────────────────────────────────────
  const capPool = [
    q({ id: 'q10' }),
    q({ id: 'q2' }),
    q({ id: 'q1' }),
    q({ id: undefined }),
    q({ id: 'q20' }),
    q({ id: 'abc' }),
    q({ id: 'ABC2' }),
  ];

  cases.push({
    id: 'capFreeQuestionSet-limit-zero',
    fn: 'capFreeQuestionSet',
    description: 'limit <= 0 (zero) returns an empty array regardless of pool size',
    input: { questions: capPool, limit: 0 },
    expected: capFreeQuestionSet(capPool, 0),
  });

  cases.push({
    id: 'capFreeQuestionSet-limit-negative',
    fn: 'capFreeQuestionSet',
    description: 'limit <= 0 (negative) returns an empty array',
    input: { questions: capPool, limit: -5 },
    expected: capFreeQuestionSet(capPool, -5),
  });

  cases.push({
    id: 'capFreeQuestionSet-limit-exceeds-length',
    fn: 'capFreeQuestionSet',
    description:
      'limit > pool length returns the full pool, sorted by id (numeric localeCompare), ' +
      'missing/undefined ids sort as empty string',
    input: { questions: capPool, limit: 100 },
    expected: capFreeQuestionSet(capPool, 100),
  });

  cases.push({
    id: 'capFreeQuestionSet-mixed-ids-truncated',
    fn: 'capFreeQuestionSet',
    description:
      'non-numeric and missing ids sorted then truncated to limit — pins the numeric ' +
      'localeCompare sort exactly',
    input: { questions: capPool, limit: 4 },
    expected: capFreeQuestionSet(capPool, 4),
  });

  // ─── orderPracticeSet ──────────────────────────────────────────────────
  const practicePool = [
    q({ id: 'p1', difficulty: 'hard' }),
    q({ id: 'p2', difficulty: 'easy' }),
    q({ id: 'p3', difficulty: undefined }), // missing -> defaults to 'medium'
    q({ id: 'p4', difficulty: 'medium' }),
    q({ id: 'p5', difficulty: 'legendary' }), // unknown -> falls back to medium bucket
    q({ id: 'p6', difficulty: 'easy' }),
  ];

  cases.push({
    id: 'orderPracticeSet-free-difficulty-sort',
    fn: 'orderPracticeSet',
    description:
      'free: sorted easy -> medium -> hard; missing difficulty defaults to medium, ' +
      'unknown difficulty string also falls into the medium bucket',
    input: { questions: practicePool, opts: { isPaid: false } },
    expected: orderPracticeSet(practicePool, { isPaid: false }),
  });

  {
    const seed = 42;
    cases.push({
      id: 'orderPracticeSet-paid-seeded-shuffle',
      fn: 'orderPracticeSet',
      description: 'paid: fresh seeded shuffle of the same pool',
      input: { questions: practicePool, opts: { isPaid: true } },
      seed,
      expected: orderPracticeSet(practicePool, { isPaid: true, rng: makeSeededRng(seed) }),
    });
  }

  // ─── drawExamSet ───────────────────────────────────────────────────────
  const examFreePool = Array.from({ length: 20 }, (_, i) =>
    q({ id: `f${String(i + 1).padStart(2, '0')}`, isFree: true, isSeed: true, seedId: `f${i + 1}` }),
  );

  {
    const seed = 7;
    cases.push({
      id: 'drawExamSet-free-seeded-shuffle-whole-set',
      fn: 'drawExamSet',
      description: 'free: served = all provided (free) seeds, shuffled — no capping logic applies',
      input: { questions: examFreePool, opts: { isPaid: false } },
      seed,
      expected: drawExamSet(examFreePool, { isPaid: false, rng: makeSeededRng(seed) }),
    });
  }

  // Paid, wide chapter: 8 seed groups (2 variations each = 16 questions),
  // examSize default 30 is irrelevant here — cap to a small explicit
  // examSize (5) to exercise "capped below the seed-group count" too.
  const wideSeedGroups = Array.from({ length: 8 }, (_, g) => g + 1);
  const examPaidWidePool = wideSeedGroups.flatMap(g => [
    q({ id: `w${g}a`, seedId: `w${g}`, isFree: g <= 3 }),
    q({ id: `w${g}b`, seedId: `w${g}`, isFree: g <= 3 }),
  ]);

  {
    const seed = 99;
    cases.push({
      id: 'drawExamSet-paid-capped-at-examSize',
      fn: 'drawExamSet',
      description:
        'paid: one pick per seedId (8 groups), shuffled, capped at examSize=5 ' +
        '(min(examSize, seedGroups) = 5)',
      input: { questions: examPaidWidePool, opts: { isPaid: true, examSize: 5 } },
      seed,
      expected: drawExamSet(examPaidWidePool, {
        isPaid: true,
        examSize: 5,
        rng: makeSeededRng(seed),
      }),
    });
  }

  // Narrow-chapter case: only 3 seed groups, default examSize (30) — result
  // capped at the seed-group count (3), never padded or repeated.
  const narrowSeedGroups = [1, 2, 3];
  const examPaidNarrowPool = narrowSeedGroups.flatMap(g => [
    q({ id: `n${g}a`, seedId: `n${g}` }),
    q({ id: `n${g}b`, seedId: `n${g}` }),
    q({ id: `n${g}c`, seedId: `n${g}` }),
  ]);

  {
    const seed = 123;
    cases.push({
      id: 'drawExamSet-paid-narrow-chapter-fewer-seed-groups-than-examSize',
      fn: 'drawExamSet',
      description:
        'paid, narrow chapter: 3 seed groups < default examSize (30) -> result length 3, ' +
        'no forced repetition',
      input: { questions: examPaidNarrowPool, opts: { isPaid: true } },
      seed,
      expected: drawExamSet(examPaidNarrowPool, { isPaid: true, rng: makeSeededRng(seed) }),
    });
  }

  // ─── computeExamScorePct ───────────────────────────────────────────────
  const examScoreCases = [
    {
      id: 'computeExamScorePct-free-attempted-below-floor',
      description: 'free, attempted (5) below the floor (10): denominator is the floor, not attempted',
      input: { isPaid: false, correct: 3, attempted: 5, served: 20 },
    },
    {
      id: 'computeExamScorePct-free-attempted-at-floor',
      description: 'free, attempted exactly at the floor (10)',
      input: { isPaid: false, correct: 7, attempted: 10, served: 20 },
    },
    {
      id: 'computeExamScorePct-free-attempted-above-floor',
      description: 'free, attempted (15) above the floor: denominator is attempted',
      input: { isPaid: false, correct: 12, attempted: 15, served: 20 },
    },
    {
      id: 'computeExamScorePct-free-zero-attempted',
      description: 'free, attempted = 0: denominator floors to 10, never divides by zero',
      input: { isPaid: false, correct: 0, attempted: 0, served: 20 },
    },
    {
      id: 'computeExamScorePct-paid-normal',
      description: 'paid: denominator is served, not attempted',
      input: { isPaid: true, correct: 25, attempted: 25, served: 30 },
    },
    {
      id: 'computeExamScorePct-paid-zero-served-zero-denominator',
      description: 'paid, served = 0: the only true zero-denominator path -> returns 0',
      input: { isPaid: true, correct: 0, attempted: 0, served: 0 },
    },
  ];
  for (const c of examScoreCases) {
    cases.push({
      id: c.id,
      fn: 'computeExamScorePct',
      description: c.description,
      input: c.input,
      expected: computeExamScorePct(c.input),
    });
  }

  // ─── computePracticePct ────────────────────────────────────────────────
  const practicePctCases = [
    {
      id: 'computePracticePct-zero-attempted',
      description: 'attempted = 0 -> 0, never divides by zero',
      input: { correct: 0, attempted: 0 },
    },
    {
      id: 'computePracticePct-partial',
      description: 'ordinary partial accuracy',
      input: { correct: 7, attempted: 10 },
    },
    {
      id: 'computePracticePct-all-wrong',
      description: 'correct = 0 with attempted > 0',
      input: { correct: 0, attempted: 5 },
    },
    {
      id: 'computePracticePct-all-correct',
      description: 'correct = attempted -> 100',
      input: { correct: 8, attempted: 8 },
    },
  ];
  for (const c of practicePctCases) {
    cases.push({
      id: c.id,
      fn: 'computePracticePct',
      description: c.description,
      input: c.input,
      expected: computePracticePct(c.input.correct, c.input.attempted),
    });
  }

  const golden = {
    generatedFrom: '../ARNReady-App/services/quizEngine.ts (live cross-repo import)',
    cases,
  };

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(golden, null, 2)}\n`);

  console.log(`Wrote ${OUT_PATH}`);
  console.log(`cases=${cases.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
