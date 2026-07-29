/**
 * quizEngine — web port of ../ARNReady-App/services/quizEngine.ts.
 *
 * PORTED, NEVER RE-DERIVED (manual §0.3, M5 plan D4). This module carries
 * verbatim: `shuffle` (app:32-39), `capFreeQuestionSet` (app:76-88),
 * `orderPracticeSet` (app:119-130) plus its private helpers `groupBySeed`
 * (app:133-142) and `onePerSeedGroup` (app:145-147) and the `DIFFICULTY_ORDER`
 * map (app:112), `drawExamSet` (app:156-164), `computeExamScorePct`
 * (app:52-62) and `computePracticePct` (app:65-68), and the `Question`,
 * `Difficulty` and `Rng` types (app:9-27). If a formula here looks wrong, it
 * is raised with Anusha, never "fixed" in place.
 *
 * NO CONSTANT IS REDEFINED HERE. `FREE_SCORE_FLOOR` is imported from
 * `./progressService` (M4) and `FREE_QUESTIONS_PER_CHAPTER` is imported
 * (re-exported for convenience, not redefined) from `./nudgeGates` (M2) by
 * any caller that needs it — this file does not touch either constant. A
 * scoring or free-cap constant defined twice is exactly the drift the parity
 * discipline exists to prevent (manual §0.10); this file must never gain a
 * second definition of either.
 *
 * Deliberately NOT ported here: `gateBeforeQuestion` (owned by
 * `src/lib/nudgeGates.ts`, M2 D1 — a second gate definition anywhere in
 * `src/` is a review BLOCKER), `assembleMock`, `tallyWeakSubtopics`,
 * `tallyWeakChapters` (all M6 scope).
 *
 * Browser-safe: no `node:` imports, no `fs`, no `process`.
 */
import { FREE_SCORE_FLOOR } from './progressService';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  chapter: number;
  subtopic?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty?: Difficulty;
  type?: string;
  isFree?: boolean;
  isSeed?: boolean;
  seedId?: string;
}

/** Random source in [0, 1). Injectable for tests. */
export type Rng = () => number;

// ─── Shuffle ─────────────────────────────────────────────────────────────────

/** Unbiased Fisher-Yates shuffle. Returns a new array. */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

// ─── Scoring (LOCKED) ────────────────────────────────────────────────────────

/**
 * Exam Mode score percentage.
 * LOCKED: free  = correct ÷ max(10, attempted) — the floor stops a tiny
 *                 sample (bail at an ad gate) from inflating readiness.
 *         paid  = correct ÷ questions served — served is what was actually
 *                 put in front of the user, never the full chapter bank.
 *
 * `FREE_SCORE_FLOOR` is imported from `./progressService` (M4) rather than
 * redefined here — see file header.
 */
export function computeExamScorePct(opts: {
  isPaid: boolean;
  correct: number;
  attempted: number;
  served: number;
}): number {
  const { isPaid, correct, attempted, served } = opts;
  const denominator = isPaid ? served : Math.max(FREE_SCORE_FLOOR, attempted);
  if (denominator <= 0) return 0;
  return Math.round((correct / denominator) * 100);
}

/** Practice Mode is a simple accuracy readout — no floor, no readiness claim. */
export function computePracticePct(correct: number, attempted: number): number {
  if (attempted <= 0) return 0;
  return Math.round((correct / attempted) * 100);
}

/**
 * Defense-in-depth cap for free chapter content. Firestore's `isFree` flags
 * define the intended set, but a bad upload must never widen the free tier.
 * Sorting by stable question id makes overflow deterministic across Practice
 * and Exam; content validation still treats any overflow as an error.
 */
export function capFreeQuestionSet<T extends { id?: string }>(
  questions: readonly T[],
  limit: number,
): T[] {
  if (limit <= 0) return [];
  return [...questions]
    .sort((a, b) => String(a.id ?? '').localeCompare(
      String(b.id ?? ''),
      undefined,
      { numeric: true },
    ))
    .slice(0, limit);
}

// ─── Question draws (LOCKED) ─────────────────────────────────────────────────

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * Practice Mode ordering.
 * Free:  the same fixed set, sorted easy → medium → hard, same order every run.
 * Paid:  same set, fresh shuffle each session.
 */
export function orderPracticeSet(
  questions: readonly Question[],
  opts: { isPaid: boolean; rng?: Rng },
): Question[] {
  const { isPaid, rng = Math.random } = opts;
  if (isPaid) return shuffle(questions, rng);
  return [...questions].sort(
    (a, b) =>
      (DIFFICULTY_ORDER[a.difficulty ?? 'medium'] ?? 1) -
      (DIFFICULTY_ORDER[b.difficulty ?? 'medium'] ?? 1),
  );
}

/** Group a pool by seedId (a question with no seedId is its own group). */
function groupBySeed(questions: readonly Question[]): Question[][] {
  const groups = new Map<string, Question[]>();
  for (const q of questions) {
    const key = q.seedId ?? q.id;
    const g = groups.get(key);
    if (g) g.push(q);
    else groups.set(key, [q]);
  }
  return [...groups.values()];
}

/** Pick one member per seed group at random — never a seed AND its variation. */
function onePerSeedGroup(questions: readonly Question[], rng: Rng): Question[] {
  return groupBySeed(questions).map(g => g[Math.floor(rng() * g.length)] as Question);
}

/**
 * Exam Mode draw.
 * Free:  caller passes the isFree seeds; served = all of them, shuffled.
 * Paid:  caller passes seeds + variations; one pick per seedId, shuffled,
 *        capped at min(examSize, seed groups) — narrow-chapter fallback,
 *        no forced repetition.
 */
export function drawExamSet(
  questions: readonly Question[],
  opts: { isPaid: boolean; examSize?: number; rng?: Rng },
): Question[] {
  const { isPaid, examSize = 30, rng = Math.random } = opts;
  if (!isPaid) return shuffle(questions, rng);
  const pool = onePerSeedGroup(questions, rng);
  return shuffle(pool, rng).slice(0, Math.min(examSize, pool.length));
}
