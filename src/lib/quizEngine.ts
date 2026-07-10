/**
 * quizEngine — the LOCKED business rules of ARNReady as pure functions.
 *
 * Screens must not reimplement any logic found here. Everything is
 * deterministic given an injected rng, so every locked rule is unit-testable.
 * No imports from config.js — thresholds are passed in by callers.
 */

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
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── Scoring (LOCKED) ────────────────────────────────────────────────────────

export const FREE_SCORE_FLOOR = 10;

/**
 * Exam Mode score percentage.
 * LOCKED: free  = correct ÷ max(10, attempted) — the floor stops a tiny
 *                 sample (bail at an ad gate) from inflating readiness.
 *         paid  = correct ÷ questions served — served is what was actually
 *                 put in front of the user, never the full chapter bank.
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

// ─── Freemium gates (LOCKED) ─────────────────────────────────────────────────

/**
 * Whether an ad gate stands before the question at `nextIndex` (0-based).
 * Q11 gate fires at index 10 (gate1), Q16 gate at index 15 (gate2).
 * Ad unlocks are session-only; `adsWatched` is the session count.
 */
export function gateBeforeQuestion(
  nextIndex: number,
  opts: { isPaid: boolean; adsWatched: number; gate1?: number; gate2?: number },
): 'ad' | null {
  const { isPaid, adsWatched, gate1 = 10, gate2 = 15 } = opts;
  if (isPaid) return null;
  if (nextIndex === gate1 && adsWatched === 0) return 'ad';
  if (nextIndex === gate2 && adsWatched === 1) return 'ad';
  return null;
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
  return groupBySeed(questions).map(g => g[Math.floor(rng() * g.length)]);
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

// ─── Mock assembly (LOCKED) ──────────────────────────────────────────────────

/**
 * Weighted mock assembly. For each chapter: one pick per seedId, then that
 * chapter's weightage allocation from the picked pool (all of it if the
 * chapter is narrower than its weight). Result shuffled across chapters.
 * One concept per mock, max — never a seed and its variation together.
 */
export function assembleMock(
  questions: readonly Question[],
  weights: Record<number, number>,
  rng: Rng = Math.random,
): Question[] {
  const byChapter = new Map<number, Question[]>();
  for (const q of questions) {
    const list = byChapter.get(q.chapter);
    if (list) list.push(q);
    else byChapter.set(q.chapter, [q]);
  }

  const assembled: Question[] = [];
  for (const [chapterStr, weight] of Object.entries(weights)) {
    const chapter = Number(chapterStr);
    const pool = byChapter.get(chapter);
    if (!pool || weight <= 0) continue;
    const picks = shuffle(onePerSeedGroup(pool, rng), rng);
    assembled.push(...picks.slice(0, Math.min(weight, picks.length)));
  }
  return shuffle(assembled, rng);
}

// ─── Weak areas ──────────────────────────────────────────────────────────────

/**
 * Top weak subtopics from a completed run. `answers` is parallel to
 * `questions`; unanswered slots are undefined/null and never count as wrong.
 */
export function tallyWeakSubtopics(
  questions: readonly Question[],
  answers: readonly (number | null | undefined)[],
  limit = 3,
): string[] {
  const tally = new Map<string, number>();
  questions.forEach((q, i) => {
    const picked = answers[i];
    if (picked !== undefined && picked !== null && picked !== q.correctIndex) {
      const key = q.subtopic ?? 'General';
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
  });
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([sub]) => sub);
}

/** Top weak chapters from a completed mock. */
export function tallyWeakChapters(
  questions: readonly Question[],
  answers: readonly (number | null | undefined)[],
  limit = 3,
): number[] {
  const tally = new Map<number, number>();
  questions.forEach((q, i) => {
    const picked = answers[i];
    if (picked !== undefined && picked !== null && picked !== q.correctIndex) {
      if (q.chapter > 0) tally.set(q.chapter, (tally.get(q.chapter) ?? 0) + 1);
    }
  });
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([ch]) => ch);
}
