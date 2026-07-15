#!/usr/bin/env node
/**
 * gen-nudge-golden.mjs — generates the committed golden fixture
 * (test/fixtures/nudgeGates.golden.json) that pins src/lib/nudgeGates.ts's
 * four gate functions across an exhaustive input matrix (M2 plan §2 D7).
 *
 * PROVENANCE NOTE (robustness deviation from D7's literal "import the real
 * app function" wording, per the S1 execution prompt): this generator does
 * NOT `node`-import the app's ../ARNReady-App/services/quizEngine.ts at
 * runtime — a cross-repo TypeScript import from a plain .mjs script (no
 * transpiler here, possible fs sandboxing) is fragile and would make golden
 * generation itself flaky. Instead, each rule below is RE-STATED verbatim
 * from its pinned source, with an explicit line citation, so provenance is
 * established by citation rather than by live import. The JSON this writes
 * is committed and is what test/nudgeGates.test.ts asserts against — CI
 * never needs the app repo present to run the golden test (D7's "CI
 * self-contained" requirement).
 *
 * ── PRACTICE ──────────────────────────────────────────────────────────
 * Verbatim source, ../ARNReady-App/services/quizEngine.ts:100-108:
 *
 *   export function gateBeforeQuestion(
 *     nextIndex: number,
 *     opts: { isPaid: boolean; adsWatched: number; gate1?: number },
 *   ): 'ad' | null {
 *     const { isPaid, adsWatched, gate1 = 10 } = opts;
 *     if (isPaid) return null;
 *     if (nextIndex === gate1 && adsWatched === 0) return 'ad';
 *     return null;
 *   }
 *
 * Web mapping (M2 plan D1, LOCKED): 'ad' -> 'nudge'; adsWatched ->
 * nudgesShownThisRun; gate1 -> gateIndex (default PRACTICE_GATE_INDEX=10).
 *
 * ── WALL ──────────────────────────────────────────────────────────────
 * ../ARNReady-App/documents/adgate-logic.md:51 — "Q21+ paid only (free cap:
 * CONFIG.FREE_QUESTIONS_PER_CHAPTER = 20…)". M2 plan D2: the wall stands for
 * free users at nextIndex >= freeCap (20) — a hard boundary, not a nudge.
 *
 * ── EXAM ──────────────────────────────────────────────────────────────
 * ../ARNReady-App/documents/adgate-logic.md:71-73 — "ONE pre-start rewarded
 * gate before Q1 … After Q1: zero interruptions. Exam mode never consults
 * gateBeforeQuestion." M2 plan D3: 'nudge' iff !isPaid && !nudgeShown, else
 * null. Deliberately no mid-run exam gate function exists anywhere.
 *
 * ── FLASHCARD ─────────────────────────────────────────────────────────
 * ../ARNReady-App/documents/adgate-logic.md:89-94 — "Distinct-reveal gates:
 * one rewarded gate every FLASHCARD_GATE_EVERY (15) distinct card reveals,
 * at most FLASHCARD_GATE_MAX (3) per run." M2 plan D4 (SYNTHESIZED —
 * declared deviation from "PORT"; no atomic app function exists to port,
 * the app's reveal gate is smeared across FlashcardScreen state; only the
 * constants are canonical): 'nudge' iff !isPaid && gatesShownThisRun < max
 * && distinctReveals > 0 && distinctReveals % every === 0. Run-scoped, NOT
 * the app's per-subtopic reset (manual §1: "after the 15th, 30th, 45th
 * distinct reveal, max 3 per run").
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_PATH = path.resolve(ROOT, 'test/fixtures/nudgeGates.golden.json');

const PRACTICE_GATE_INDEX = 10;
const FREE_QUESTIONS_PER_CHAPTER = 20;
const FLASHCARD_GATE_EVERY = 15;
const FLASHCARD_GATE_MAX = 3;

// Re-statement of quizEngine.ts:100-108's gateBeforeQuestion, 'ad' -> 'nudge'.
function practiceGate(nextIndex, { isPaid, adsWatched, gate1 = PRACTICE_GATE_INDEX }) {
  if (isPaid) return null;
  if (nextIndex === gate1 && adsWatched === 0) return 'nudge';
  return null;
}

// adgate-logic.md:51 + M2 plan D2.
function wallGate(nextIndex, { isPaid, freeCap = FREE_QUESTIONS_PER_CHAPTER }) {
  if (isPaid) return null;
  if (nextIndex >= freeCap) return 'wall';
  return null;
}

// adgate-logic.md:71-73 + M2 plan D3.
function examGate({ isPaid, nudgeShown }) {
  if (isPaid) return null;
  if (!nudgeShown) return 'nudge';
  return null;
}

// adgate-logic.md:89-94 + M2 plan D4 (synthesized).
function flashcardGate(
  distinctReveals,
  { isPaid, gatesShownThisRun, every = FLASHCARD_GATE_EVERY, max = FLASHCARD_GATE_MAX },
) {
  if (isPaid) return null;
  if (gatesShownThisRun < max && distinctReveals > 0 && distinctReveals % every === 0) {
    return 'nudge';
  }
  return null;
}

const range = (n) => Array.from({ length: n }, (_, i) => i);

// practice: nextIndex 0..25 x isPaid{t,f} x nudgesShownThisRun{0,1,2}
const practice = [];
for (const nextIndex of range(26)) {
  for (const isPaid of [true, false]) {
    for (const nudgesShownThisRun of [0, 1, 2]) {
      practice.push({
        nextIndex,
        isPaid,
        nudgesShownThisRun,
        expected: practiceGate(nextIndex, { isPaid, adsWatched: nudgesShownThisRun }),
      });
    }
  }
}

// wall: nextIndex 0..25 x isPaid{t,f}
const wall = [];
for (const nextIndex of range(26)) {
  for (const isPaid of [true, false]) {
    wall.push({ nextIndex, isPaid, expected: wallGate(nextIndex, { isPaid }) });
  }
}

// exam: isPaid{t,f} x nudgeShown{t,f}
const exam = [];
for (const isPaid of [true, false]) {
  for (const nudgeShown of [true, false]) {
    exam.push({ isPaid, nudgeShown, expected: examGate({ isPaid, nudgeShown }) });
  }
}

// flashcard: distinctReveals 0..50 x isPaid{t,f} x gatesShownThisRun{0,1,2,3}
const flashcard = [];
for (const distinctReveals of range(51)) {
  for (const isPaid of [true, false]) {
    for (const gatesShownThisRun of [0, 1, 2, 3]) {
      flashcard.push({
        distinctReveals,
        isPaid,
        gatesShownThisRun,
        expected: flashcardGate(distinctReveals, { isPaid, gatesShownThisRun }),
      });
    }
  }
}

const golden = {
  meta: {
    generatedBy: 'scripts/gen-nudge-golden.mjs',
    provenance:
      'Practice rule re-stated verbatim from ../ARNReady-App/services/quizEngine.ts:100-108 ' +
      '(gateBeforeQuestion, ad->nudge mapping per M2 plan D1). Wall/exam/flashcard rules cite ' +
      '../ARNReady-App/documents/adgate-logic.md + M2 plan D2-D4. See file header comments for ' +
      'the full citations. Not a live cross-repo import — see header note.',
  },
  practice,
  wall,
  exam,
  flashcard,
};

mkdirSync(path.dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(golden, null, 2)}\n`);

console.log(`Wrote ${OUT_PATH}`);
console.log(
  `practice=${practice.length} wall=${wall.length} exam=${exam.length} flashcard=${flashcard.length}`,
);
