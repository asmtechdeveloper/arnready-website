/**
 * CROSS-REPO parity gate: imports the APP's quizEngine from
 * ../ARNReady-App/services/quizEngine.ts and runs it against the web copy
 * with identical fixtures and seeded rng, asserting identical outputs.
 * This is the interim option-2 guarantee (web CLAUDE.md, single-write-site
 * strategy) until the shared-core package extraction.
 *
 * Skips (loudly) when the app repo is not checked out as a sibling —
 * a skip is NOT a pass; treat it as "parity unproven on this machine".
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as web from '../quizEngine';

const APP_ENGINE = resolve(__dirname, '../../../../ARNReady-App/services/quizEngine.ts');
const appAvailable = existsSync(APP_ENGINE);

if (!appAvailable) {
  console.warn(
    `[engineParity] SKIPPED — app repo not found at ${APP_ENGINE}. Parity is unproven in this run.`,
  );
}

/** Deterministic LCG rng — same seed ⇒ same sequence in both engines. */
const makeRng = (seed: number): web.Rng => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
};

const SUBTOPICS = ['NAV', 'TER', 'SIP', 'KYC', 'Riskometer'];
const DIFFS: web.Difficulty[] = ['easy', 'medium', 'hard'];

/** 8 seed groups × (1 seed + 2 variations) per chapter 1–12 = 288 questions. */
function buildPool(): web.Question[] {
  const pool: web.Question[] = [];
  for (let ch = 1; ch <= 12; ch++) {
    for (let g = 0; g < 8; g++) {
      const seedId = `c${ch}s${g}`;
      for (let v = 0; v < 3; v++) {
        pool.push({
          id: `${seedId}v${v}`,
          chapter: ch,
          subtopic: SUBTOPICS[(g + v) % SUBTOPICS.length],
          question: `Q ${seedId}v${v}`,
          options: ['A', 'B', 'C', 'D'],
          correctIndex: (g + v) % 4,
          difficulty: DIFFS[(g + v) % 3],
          isFree: g < 3,
          isSeed: v === 0,
          seedId,
        });
      }
    }
  }
  return pool;
}

const WEIGHTS: Record<number, number> = {
  1: 8, 2: 6, 3: 4, 4: 10, 5: 10, 6: 6, 7: 8, 8: 4, 9: 15, 10: 7, 11: 7, 12: 15,
};

describe.skipIf(!appAvailable)('cross-repo engine parity (web vs app)', async () => {
  const app: typeof web = appAvailable ? await import(APP_ENGINE) : (undefined as never);
  const pool = buildPool();

  it('sources are byte-identical (mirror-edit discipline)', () => {
    const webSrc = readFileSync(resolve(__dirname, '../quizEngine.ts'), 'utf8');
    const appSrc = readFileSync(APP_ENGINE, 'utf8');
    expect(webSrc).toBe(appSrc);
  });

  it('shuffle: identical permutations for identical seeds', () => {
    for (const seed of [1, 42, 999, 123456]) {
      expect(web.shuffle(pool, makeRng(seed)).map((q) => q.id)).toEqual(
        app.shuffle(pool, makeRng(seed)).map((q) => q.id),
      );
    }
  });

  it('computeExamScorePct: identical across the free-floor and paid-served grid', () => {
    for (const isPaid of [false, true]) {
      for (const served of [10, 20, 30]) {
        for (let attempted = 0; attempted <= served; attempted += 3) {
          for (let correct = 0; correct <= attempted; correct += 2) {
            const opts = { isPaid, correct, attempted, served };
            expect(web.computeExamScorePct(opts)).toBe(app.computeExamScorePct(opts));
          }
        }
      }
    }
    // The honesty core, pinned: 4/4 free is 40%, not 100%.
    expect(web.computeExamScorePct({ isPaid: false, correct: 4, attempted: 4, served: 20 })).toBe(40);
    expect(app.computeExamScorePct({ isPaid: false, correct: 4, attempted: 4, served: 20 })).toBe(40);
  });

  it('computePracticePct: identical', () => {
    for (const [c, a] of [[0, 0], [3, 4], [7, 10], [10, 10], [1, 3]] as const) {
      expect(web.computePracticePct(c, a)).toBe(app.computePracticePct(c, a));
    }
  });

  it('gateBeforeQuestion: identical gate decisions across q1–q25', () => {
    for (const isPaid of [false, true]) {
      for (let adsWatched = 0; adsWatched <= 2; adsWatched++) {
        for (let i = 0; i < 25; i++) {
          expect(web.gateBeforeQuestion(i, { isPaid, adsWatched })).toBe(
            app.gateBeforeQuestion(i, { isPaid, adsWatched }),
          );
        }
      }
    }
  });

  it('orderPracticeSet: identical for free (deterministic) and paid (seeded)', () => {
    const set = pool.filter((q) => q.chapter === 5);
    expect(web.orderPracticeSet(set, { isPaid: false }).map((q) => q.id)).toEqual(
      app.orderPracticeSet(set, { isPaid: false }).map((q) => q.id),
    );
    for (const seed of [7, 77]) {
      expect(web.orderPracticeSet(set, { isPaid: true, rng: makeRng(seed) }).map((q) => q.id)).toEqual(
        app.orderPracticeSet(set, { isPaid: true, rng: makeRng(seed) }).map((q) => q.id),
      );
    }
  });

  it('drawExamSet: identical draws, seed-group exclusivity in both', () => {
    const chapterPool = pool.filter((q) => q.chapter === 9);
    for (const seed of [3, 31, 314]) {
      const w = web.drawExamSet(chapterPool, { isPaid: true, examSize: 30, rng: makeRng(seed) });
      const a = app.drawExamSet(chapterPool, { isPaid: true, examSize: 30, rng: makeRng(seed) });
      expect(w.map((q) => q.id)).toEqual(a.map((q) => q.id));
      const seeds = w.map((q) => q.seedId);
      expect(new Set(seeds).size).toBe(seeds.length);
    }
    const freeSet = chapterPool.filter((q) => q.isFree && q.isSeed);
    for (const seed of [5, 55]) {
      expect(web.drawExamSet(freeSet, { isPaid: false, rng: makeRng(seed) }).map((q) => q.id)).toEqual(
        app.drawExamSet(freeSet, { isPaid: false, rng: makeRng(seed) }).map((q) => q.id),
      );
    }
  });

  it('assembleMock: identical papers for identical seeds', () => {
    for (const seed of [11, 1111, 20260710]) {
      const w = web.assembleMock(pool, WEIGHTS, makeRng(seed));
      const a = app.assembleMock(pool, WEIGHTS, makeRng(seed));
      expect(w.map((q) => q.id)).toEqual(a.map((q) => q.id));
    }
  });

  it('tallyWeakSubtopics / tallyWeakChapters: identical', () => {
    const qs = web.assembleMock(pool, WEIGHTS, makeRng(99));
    const answers = qs.map((q, i) =>
      i % 4 === 0 ? null : i % 3 === 0 ? q.correctIndex : (q.correctIndex + 1) % 4,
    );
    expect(web.tallyWeakSubtopics(qs, answers)).toEqual(app.tallyWeakSubtopics(qs, answers));
    expect(web.tallyWeakChapters(qs, answers)).toEqual(app.tallyWeakChapters(qs, answers));
  });
});
