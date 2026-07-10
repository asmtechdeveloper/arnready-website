/**
 * Parity fixtures for the LOCKED engine rules. quizEngine.ts is a verbatim
 * copy of the app's services/quizEngine.ts — these tests pin the locked
 * behaviours so any drift between the copies is caught here.
 */
import { describe, expect, it } from 'vitest';
import {
  assembleMock,
  computeExamScorePct,
  computePracticePct,
  drawExamSet,
  gateBeforeQuestion,
  orderPracticeSet,
  shuffle,
  tallyWeakChapters,
  tallyWeakSubtopics,
  type Question,
} from '../quizEngine';

/** Deterministic rng (mulberry32) so draw tests are reproducible. */
function seededRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function q(partial: Partial<Question> & { id: string }): Question {
  return {
    chapter: 1,
    question: 'q',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 0,
    ...partial,
  } as Question;
}

describe('scoring (LOCKED — the honesty core)', () => {
  it('free score uses max(10, attempted) floor', () => {
    // Bail at the first ad gate having got 5/5 — floor stops inflation: 50%.
    expect(computeExamScorePct({ isPaid: false, correct: 5, attempted: 5, served: 20 })).toBe(50);
    // Past the floor, attempted is the denominator.
    expect(computeExamScorePct({ isPaid: false, correct: 5, attempted: 12, served: 20 })).toBe(42);
    expect(computeExamScorePct({ isPaid: false, correct: 10, attempted: 10, served: 20 })).toBe(100);
  });

  it('paid score divides by questions SERVED — ending early lowers it', () => {
    expect(computeExamScorePct({ isPaid: true, correct: 20, attempted: 20, served: 30 })).toBe(67);
    expect(computeExamScorePct({ isPaid: true, correct: 20, attempted: 30, served: 30 })).toBe(67);
  });

  it('practice pct is plain accuracy, zero-safe', () => {
    expect(computePracticePct(3, 4)).toBe(75);
    expect(computePracticePct(0, 0)).toBe(0);
  });
});

describe('freemium gates (LOCKED order: 10 free → ad → 15 → ad → 20)', () => {
  it('gate 1 stands before Q11 (index 10) with no ads watched', () => {
    expect(gateBeforeQuestion(10, { isPaid: false, adsWatched: 0 })).toBe('ad');
    expect(gateBeforeQuestion(10, { isPaid: false, adsWatched: 1 })).toBeNull();
  });
  it('gate 2 stands before Q16 (index 15) after exactly one ad', () => {
    expect(gateBeforeQuestion(15, { isPaid: false, adsWatched: 1 })).toBe('ad');
    expect(gateBeforeQuestion(15, { isPaid: false, adsWatched: 0 })).toBeNull();
    expect(gateBeforeQuestion(15, { isPaid: false, adsWatched: 2 })).toBeNull();
  });
  it('paid users never see a gate', () => {
    expect(gateBeforeQuestion(10, { isPaid: true, adsWatched: 0 })).toBeNull();
    expect(gateBeforeQuestion(15, { isPaid: true, adsWatched: 0 })).toBeNull();
  });
});

describe('practice ordering (LOCKED)', () => {
  const set = [
    q({ id: 'a', difficulty: 'hard' }),
    q({ id: 'b', difficulty: 'easy' }),
    q({ id: 'c', difficulty: 'medium' }),
    q({ id: 'd', difficulty: 'easy' }),
  ];
  it('free: easy → medium → hard, stable, same order every run', () => {
    const one = orderPracticeSet(set, { isPaid: false });
    const two = orderPracticeSet(set, { isPaid: false });
    expect(one.map((x) => x.id)).toEqual(['b', 'd', 'c', 'a']);
    expect(two.map((x) => x.id)).toEqual(one.map((x) => x.id));
  });
  it('paid: fresh shuffle per session (deterministic under injected rng)', () => {
    const out = orderPracticeSet(set, { isPaid: true, rng: seededRng(7) });
    expect(out.map((x) => x.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('exam draw (LOCKED — never a seed AND its variation)', () => {
  const pool: Question[] = [];
  for (let s = 0; s < 40; s++) {
    pool.push(q({ id: `s${s}`, seedId: `s${s}`, isSeed: true }));
    pool.push(q({ id: `s${s}_v1`, seedId: `s${s}` }));
    pool.push(q({ id: `s${s}_v2`, seedId: `s${s}` }));
  }

  it('paid: one per seed group, capped at examSize', () => {
    const drawn = drawExamSet(pool, { isPaid: true, examSize: 30, rng: seededRng(1) });
    expect(drawn).toHaveLength(30);
    const seeds = drawn.map((x) => x.seedId);
    expect(new Set(seeds).size).toBe(30);
  });

  it('narrow chapter fallback: min(examSize, seedGroups)', () => {
    const narrow = pool.filter((x) => ['s0', 's1', 's2'].includes(x.seedId!));
    const drawn = drawExamSet(narrow, { isPaid: true, examSize: 30, rng: seededRng(2) });
    expect(drawn).toHaveLength(3);
  });

  it('free: serves the passed set, shuffled, complete', () => {
    const free = pool.filter((x) => x.isSeed).slice(0, 20);
    const drawn = drawExamSet(free, { isPaid: false, rng: seededRng(3) });
    expect(drawn).toHaveLength(20);
    expect(new Set(drawn.map((x) => x.id)).size).toBe(20);
  });
});

describe('mock assembly (LOCKED weights)', () => {
  const WEIGHTS: Record<number, number> = {
    1: 8, 2: 6, 3: 4, 4: 10, 5: 10, 6: 6, 7: 8, 8: 4, 9: 15, 10: 7, 11: 7, 12: 15,
  };

  it('weights sum to the 100-question mock', () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('draws exactly the weighted allocation per chapter, one per seedId', () => {
    const pool: Question[] = [];
    for (let ch = 1; ch <= 12; ch++) {
      for (let s = 0; s < 20; s++) {
        pool.push(q({ id: `c${ch}s${s}`, seedId: `c${ch}s${s}`, chapter: ch, isSeed: true }));
        pool.push(q({ id: `c${ch}s${s}v`, seedId: `c${ch}s${s}`, chapter: ch }));
      }
    }
    const mock = assembleMock(pool, WEIGHTS, seededRng(11));
    expect(mock).toHaveLength(100);
    for (let ch = 1; ch <= 12; ch++) {
      expect(mock.filter((x) => x.chapter === ch)).toHaveLength(WEIGHTS[ch]);
    }
    expect(new Set(mock.map((x) => x.seedId)).size).toBe(100);
  });

  it('narrow chapters degrade to their full picked pool', () => {
    const pool: Question[] = [
      q({ id: 'c9a', seedId: 'c9a', chapter: 9 }),
      q({ id: 'c9b', seedId: 'c9b', chapter: 9 }),
    ];
    const mock = assembleMock(pool, { 9: 15 }, seededRng(4));
    expect(mock).toHaveLength(2);
  });

  it('the free pool (20 free per chapter) fills a complete 100Q mock', () => {
    const freePool: Question[] = [];
    for (let ch = 1; ch <= 12; ch++) {
      for (let s = 0; s < 20; s++) {
        freePool.push(q({ id: `f${ch}_${s}`, seedId: `f${ch}_${s}`, chapter: ch, isFree: true }));
      }
    }
    expect(assembleMock(freePool, WEIGHTS, seededRng(5))).toHaveLength(100);
  });
});

describe('weak-area tallies', () => {
  it('unanswered never counts as wrong; top subtopics by wrong count', () => {
    const qs = [
      q({ id: '1', subtopic: 'NAV' }),
      q({ id: '2', subtopic: 'NAV' }),
      q({ id: '3', subtopic: 'TER' }),
      q({ id: '4', subtopic: 'SIP' }),
    ];
    const answers = [1, 2, 3, null]; // first three wrong, last unanswered
    expect(tallyWeakSubtopics(qs, answers)).toEqual(['NAV', 'TER']);
  });

  it('weak chapters sorted by wrong count', () => {
    const qs = [
      q({ id: '1', chapter: 9 }),
      q({ id: '2', chapter: 9 }),
      q({ id: '3', chapter: 12 }),
    ];
    expect(tallyWeakChapters(qs, [1, 1, 1])).toEqual([9, 12]);
  });
});

describe('shuffle', () => {
  it('is a permutation and deterministic under an injected rng', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = shuffle(arr, seededRng(9));
    const b = shuffle(arr, seededRng(9));
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(arr);
    expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
  });
});
