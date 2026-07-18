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
