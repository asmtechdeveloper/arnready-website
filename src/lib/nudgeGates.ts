/**
 * nudgeGates.ts — pure freemium nudge/gate decision layer (M2, plan §2 D1–D5).
 *
 * No React, no side effects, fully deterministic. Every function here is
 * TOTAL: it never throws. Malformed / "poison" inputs (NaN, undefined,
 * non-boolean `isPaid`, etc.) resolve to the non-blocking answer (`null`,
 * or `0` for `countDistinctReveals`) rather than throwing — a broken caller
 * must never be able to crash the app OR silently gate a learner who should
 * be free to proceed.
 *
 * This module intentionally exports gate entry points ONLY for practice,
 * exam, and flashcard, plus the wall predicate — there is no mock gate and
 * no mistakes gate (../ARNReady-App/documents/adgate-logic.md:18-20:
 * "Mistakes deck… Mock… carry zero ads"). Their absence IS the guarantee
 * (M2 plan D10b).
 */

// ─── Pinned constants (M2 plan §2 D1, D2, D4) ────────────────────────────
export const PRACTICE_GATE_INDEX = 10; // Q11, 0-based (app CONFIG.AD_GATE_1)
export const FREE_QUESTIONS_PER_CHAPTER = 20; // wall boundary (Q21+) — app CONFIG.FREE_QUESTIONS_PER_CHAPTER
export const FLASHCARD_GATE_EVERY = 15;
export const FLASHCARD_GATE_MAX = 3;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * D1 — Practice nudge gate. Ported from the app's `gateBeforeQuestion`
 * (../ARNReady-App/services/quizEngine.ts:100-108), verbatim:
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
 * Web mapping (LOCKED, M2 plan D1): the web has no ads, so `'ad'` maps to
 * `'nudge'`, and the app's "an ad was already watched this run" state
 * (`adsWatched > 0` suppresses the gate) maps to the web's "this nudge
 * already fired this run" state (`nudgesShownThisRun`) — same one-shot
 * semantics, same index (Q11).
 */
export function practiceNudgeBeforeQuestion(
  nextIndex: number,
  opts: { isPaid: boolean; nudgesShownThisRun: number; gateIndex?: number },
): 'nudge' | null {
  if (opts == null || typeof opts.isPaid !== 'boolean') return null;
  if (opts.isPaid) return null;
  if (!isFiniteNumber(nextIndex)) return null;
  if (!isFiniteNumber(opts.nudgesShownThisRun)) return null;
  const gateIndex = isFiniteNumber(opts.gateIndex) ? opts.gateIndex : PRACTICE_GATE_INDEX;
  if (nextIndex === gateIndex && opts.nudgesShownThisRun === 0) return 'nudge';
  return null;
}

/**
 * D2 — Free cap / wall boundary. Free practice = 20 questions = 0-based
 * indices 0…19 (Q1…Q20). The wall stands before index ≥ 20 (Q21+) for free
 * users. Constant mirrors app `CONFIG.FREE_QUESTIONS_PER_CHAPTER`
 * (../ARNReady-App/documents/adgate-logic.md:51). Hard boundary, not a
 * nudge — it is allowed to block.
 */
export function practiceWallBeforeQuestion(
  nextIndex: number,
  opts: { isPaid: boolean; freeCap?: number },
): 'wall' | null {
  if (opts == null || typeof opts.isPaid !== 'boolean') return null;
  if (opts.isPaid) return null;
  if (!isFiniteNumber(nextIndex)) return null;
  const freeCap = isFiniteNumber(opts.freeCap) ? opts.freeCap : FREE_QUESTIONS_PER_CHAPTER;
  if (nextIndex >= freeCap) return 'wall';
  return null;
}

/**
 * D3 — Exam: one pre-start nudge, never mid-run. There is deliberately no
 * exam per-question gate function in this module — its absence is the
 * guarantee that the exam is never interrupted
 * (../ARNReady-App/documents/adgate-logic.md:80-82: "Exam mode never
 * consults `gateBeforeQuestion`").
 */
export function examNudgeBeforeStart(
  opts: { isPaid: boolean; nudgeShown: boolean },
): 'nudge' | null {
  if (opts == null || typeof opts.isPaid !== 'boolean') return null;
  if (opts.isPaid) return null;
  if (typeof opts.nudgeShown !== 'boolean') return null;
  if (!opts.nudgeShown) return 'nudge';
  return null;
}

/**
 * D4 — Flashcard nudge is SYNTHESIZED (declared deviation from "PORT" —
 * no atomic app function exists to port; the app's reveal gate is smeared
 * across `FlashcardScreen` state). Only the constants are canonical:
 * `FLASHCARD_GATE_EVERY = 15`, `FLASHCARD_GATE_MAX = 3`
 * (../ARNReady-App/documents/adgate-logic.md:89). Web rule, per manual §1
 * ("after the 15th, 30th, 45th distinct reveal, max 3 per run"), run-scoped
 * (NOT the app's per-subtopic reset — intentionally does not port): fires
 * at 15/30/45 distinct reveals and never again (gatesShownThisRun reaches
 * max=3 by then).
 */
export function flashcardNudgeAfterReveal(
  distinctReveals: number,
  opts: { isPaid: boolean; gatesShownThisRun: number; every?: number; max?: number },
): 'nudge' | null {
  if (opts == null || typeof opts.isPaid !== 'boolean') return null;
  if (opts.isPaid) return null;
  if (!isFiniteNumber(distinctReveals)) return null;
  if (!isFiniteNumber(opts.gatesShownThisRun)) return null;
  const every = isFiniteNumber(opts.every) ? opts.every : FLASHCARD_GATE_EVERY;
  const max = isFiniteNumber(opts.max) ? opts.max : FLASHCARD_GATE_MAX;
  if (every <= 0) return null;
  if (
    opts.gatesShownThisRun < max &&
    distinctReveals > 0 &&
    distinctReveals % every === 0
  ) {
    return 'nudge';
  }
  return null;
}

/**
 * D5 — "Distinct reveals" means unique card ids. Revisiting a card already
 * revealed does not increment the count. The caller (a future player)
 * tracks the set of revealed card ids; this helper reduces it to the count
 * the gate takes. Total: any non-iterable / null input returns 0 rather
 * than throwing.
 */
export function countDistinctReveals(revealedCardIds: Iterable<string>): number {
  if (revealedCardIds == null) return 0;
  try {
    return new Set(revealedCardIds).size;
  } catch {
    return 0;
  }
}
