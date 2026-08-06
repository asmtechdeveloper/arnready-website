/**
 * mockService — mock-test attempt history, Firestore-backed.
 *
 * Web port of ../ARNReady-App/services/mockService.js (manual M6). Both
 * platforms read and write the SAME `users/{uid}` fields — `mockHistory` and
 * `freeMockConsumed` — so the one-free-mock-EVER rule is a single
 * cross-platform counter, not two. Everything here is PORTED, never
 * re-derived (manual §0.3); if a rule looks wrong it is raised with Anusha.
 *
 * LOCKED rules this service exists to enforce (app header, verbatim):
 *  - Free users get exactly ONE mock, ever — eligibility is checked against
 *    the persisted history, not device state.
 *  - Attempts are recorded on SUBMIT only; incomplete attempts are silently
 *    discarded (never call recordMockAttempt before submit).
 *
 * DECLARED DEVIATION (same rationale as the M4 header's cache deviation): the
 * app additionally mirrors the latest scores into HOME_* AsyncStorage keys
 * for its HomeScreen card. That mirror is React Native device state with no
 * web equivalent — the web home reads Firestore directly — so the port ends
 * at the Firestore writes. No document differs.
 *
 * `canTakeMock` takes `isPaid` as a caller-supplied parameter (from the
 * entitlement store), exactly like the app; this module never reads or
 * derives entitlement itself, and never touches Firestore except through the
 * injected `ProgressBackend` seam.
 */
import type { ProgressBackend } from './progressBackend';
import { writeSessionLog } from './progressService';
import type { RunAnswer, RunQuestion } from './mistakesService';

export interface MockHistoryEntry {
  date: string;
  score: number;
  total: number;
  percentage: number;
  timeTaken?: number | null;
  weakChapters?: number[];
}

export async function getMockHistory(backend: ProgressBackend): Promise<MockHistoryEntry[]> {
  if (!backend.uid()) return [];
  try {
    const data = await backend.readUserRoot();
    return (data?.mockHistory as MockHistoryEntry[] | undefined) ?? [];
  } catch (err) {
    console.warn('[mockService] history read failed:', (err as Error)?.message);
    return [];
  }
}

/**
 * LOCKED: paid users unlimited; free users only if they have never attempted.
 *
 * Deliberately NO catch here, mirroring the app: a failed eligibility read
 * must THROW to the caller, whose error surface is the only honest response —
 * never a silent "eligible" and never the used-mock paywall pitch
 * (app PreMockScreen, ScreenState policy §3).
 */
export async function canTakeMock(backend: ProgressBackend, isPaid: boolean): Promise<boolean> {
  if (isPaid) return true;
  if (!backend.uid()) return false;
  const data = (await backend.readUserRoot()) ?? {};
  // Legacy users may have history but no freeMockConsumed field yet.
  return (
    data.freeMockConsumed !== true &&
    ((data.mockHistory as unknown[] | undefined) ?? []).length === 0
  );
}

export interface MockAttemptInput {
  score: number;
  total: number;
  percentage: number;
  timeTaken?: number | null;
  weakChapters?: number[];
  answers?: RunAnswer[];
  questions?: RunQuestion[];
}

export async function recordMockAttempt(
  backend: ProgressBackend,
  { answers = [], questions = [], ...entry }: MockAttemptInput,
): Promise<void> {
  if (!backend.uid()) return;

  // serverTimestamp() is not allowed inside arrayUnion — ISO string by design.
  // answers/questions go to the session log only — mockHistory stays lean
  // (mocks are non-reviewable; the log is analytics ground truth, not UI).
  const record = { date: new Date().toISOString(), ...entry };

  try {
    await backend.appendMockAttempt(record);
  } catch (err) {
    console.warn('[mockService] attempt write failed:', (err as Error)?.message);
  }

  writeSessionLog(backend, {
    mode: 'mock',
    chapter: null,
    correct: entry.score,
    attempted: answers.filter((a) => a != null).length,
    served: entry.total,
    scorePct: entry.percentage,
    timeTaken: entry.timeTaken ?? null,
    answers,
    questions,
  }).catch((err: Error) => console.warn('[mockService] session log failed:', err?.message));
}
