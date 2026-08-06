/**
 * mistakesService — web port of ../ARNReady-App/services/mistakesService.js.
 *
 * PORTED, NEVER RE-DERIVED (manual §0.3). Every rule below is the app's:
 *   - collection happens once per COMPLETED run, never per question
 *   - wrong answers join the deck (streak reset to 0 if already present)
 *   - correct answers on ACTIVE deck questions advance the streak; reaching
 *     MISTAKE_RETIRE_STREAK retires the question
 *   - unanswered questions are untouched
 *   - never touches chapterProgress, the Prepometer, free caps, or scoring
 *
 * Storage: users/{uid}/mistakes/{questionId}, owner-writable under the already
 * deployed `users/{uid}/{document=**}` rule. M4 needs NO firestore.rules change.
 *
 * `test/progressParity.test.ts` pins these write shapes to fixtures generated
 * from the app service. Changing a field name here fails that test.
 */
import type { MistakeWrite, ProgressBackend } from './progressBackend';
import { type Question, type Rng, shuffle } from './quizEngine';

/**
 * Answer a collected mistake correctly in this many SEPARATE sessions and it
 * retires. Ported from app `CONFIG.MISTAKE_RETIRE_STREAK` (config.js) — a
 * locked constant, not a tunable (manual §0.10).
 */
export const MISTAKE_RETIRE_STREAK = 2;

export interface RunQuestion {
  id?: string | null;
  chapter?: number | null;
  correctIndex?: number | null;
  subtopic?: string | null;
}

/** `null`/`undefined` means the question was never answered. */
export type RunAnswer = number | null | undefined;

export interface RunInput {
  questions?: RunQuestion[];
  answers?: RunAnswer[];
}

/**
 * Called once per completed run with the served questions and the parallel
 * answers array. Mirrors the app's `updateMistakesFromRun` exactly, including
 * its early return on an empty question list and its "commit only if there is
 * something to write" behaviour.
 */
export async function updateMistakesFromRun(
  backend: ProgressBackend,
  { questions = [], answers = [] }: RunInput,
): Promise<void> {
  if (!backend.uid() || questions.length === 0) return;

  const active = new Map<string, number>();
  for (const m of await backend.readActiveMistakes()) {
    active.set(m.id, m.correctStreak);
  }

  const writes: MistakeWrite[] = [];

  questions.forEach((q, i) => {
    const picked = answers[i];
    if (picked == null || !q?.id) return;

    if (picked !== q.correctIndex) {
      writes.push({
        docId: q.id,
        merge: true,
        data: {
          questionId: q.id,
          chapter: q.chapter ?? null,
          subtopic: q.subtopic ?? 'General',
          correctStreak: 0,
          retired: false,
          addedAt: backend.serverTimestamp(),
          updatedAt: backend.serverTimestamp(),
        },
      });
    } else if (active.has(q.id)) {
      const streak = (active.get(q.id) as number) + 1;
      writes.push({
        docId: q.id,
        merge: true,
        data: {
          correctStreak: streak,
          retired: streak >= MISTAKE_RETIRE_STREAK,
          updatedAt: backend.serverTimestamp(),
        },
      });
    }
  });

  if (writes.length > 0) await backend.commitMistakes(writes);
}

/** One active deck entry, in the app's `getActiveMistakes` return shape. */
export interface MistakeEntry {
  questionId: string;
  chapter: number | null;
  subtopic: string;
  correctStreak: number;
}

/** A deck question carrying its current correct streak, so the run can show
 * the retire moment (app `loadMistakeQuestions`'s `_streak`). */
export interface MistakeQuestion extends Question {
  _streak: number;
}

/**
 * Active (non-retired) mistakes, optionally scoped to one chapter. Ported
 * from the app's `getActiveMistakes` — returns [] when signed out or on a
 * failed read (the app's "surfaces degrade quietly" catch), never throws.
 *
 * QUERY-SHAPE NOTE: the app issues one of two Firestore queries (retired ==
 * false, with or without a `chapter ==` clause). The web's seam exposes ONE
 * read — `readActiveMistakes()`, the unscoped retired == false query — so the
 * chapter scope is applied in memory here instead. The result sets are
 * identical: both are "the active mistakes whose chapter equals N".
 */
export async function getActiveMistakes(
  backend: ProgressBackend,
  chapterNumber: number | null = null,
): Promise<MistakeEntry[]> {
  if (!backend.uid()) return [];
  try {
    const all = (await backend.readActiveMistakes()).map((m) => ({
      questionId: m.id,
      chapter: m.chapter ?? null,
      subtopic: m.subtopic ?? 'General',
      correctStreak: m.correctStreak ?? 0,
    }));
    return chapterNumber != null ? all.filter((m) => m.chapter === chapterNumber) : all;
  } catch (err) {
    console.warn('[mistakesService] read failed:', (err as Error)?.message);
    return [];
  }
}

/**
 * Loads the full question docs for a chapter's active mistakes, shuffled for
 * retrieval practice. Each question carries `_streak` (current correct streak)
 * so the run can show the retire moment. Ported from the app's
 * `loadMistakeQuestions` with this module's seam discipline applied:
 *
 *   - `fetchById` is INJECTED (the surface passes `fetchQuestionById` from
 *     `./questionDelivery`) so this module stays SDK-free. The per-document
 *     gets rule — a Firestore RULES constraint, not style — is documented on
 *     `fetchQuestionById` itself, which is where the `questions` reads live.
 *   - each fetch resolves `null` on ANY failure (independently caught, as in
 *     the app): one unreadable question drops that card, never the deck.
 *   - the shuffle is the ported `quizEngine.shuffle` — the same Fisher–Yates
 *     the app inlines here, already ported once (manual §0.10: no second
 *     definition). `rng` is the engine's standard injectable seam for tests;
 *     callers never pass it.
 */
export async function loadMistakeQuestions(
  backend: ProgressBackend,
  fetchById: (id: string) => Promise<Question | null>,
  chapterNumber: number | null = null,
  rng: Rng = Math.random,
): Promise<MistakeQuestion[]> {
  const mistakes = await getActiveMistakes(backend, chapterNumber);
  if (mistakes.length === 0) return [];

  const streaks = new Map(mistakes.map((m) => [m.questionId, m.correctStreak]));
  const ids = [...streaks.keys()];

  const results = await Promise.all(ids.map((id) => fetchById(id)));

  const docs: MistakeQuestion[] = [];
  results.forEach((q, i) => {
    if (!q) return; // unreadable or missing — skip this card, keep the deck
    docs.push({ ...q, _streak: streaks.get(q.id ?? ids[i] ?? '') ?? 0 });
  });

  return shuffle(docs, rng);
}
