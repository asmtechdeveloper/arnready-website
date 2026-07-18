/**
 * progressService — the ONLY write site for chapter progress on the web.
 *
 * Web port of ../ARNReady-App/services/progressService.js (manual M4). The two
 * services must produce byte-identical Firestore documents: the app and the
 * website write to the SAME `users/{uid}` tree, so any divergence in a field
 * name, a denominator, a rounding rule, or timestamp semantics silently
 * corrupts the app's Prepometer. Everything here is PORTED, never re-derived
 * (manual §0.3). If a formula looks wrong, it is not fixed here — it is raised
 * with Anusha.
 *
 * The parity contract is mechanical, not a promise: `test/progressParity.test.ts`
 * replays fixtures GENERATED FROM the app service
 * (`../ARNReady-App/__tests__/progressParityFixtures.test.js`) through this
 * service and asserts the documents match. Each repo holds the same fixture
 * file, so a change on either side breaks the other's test loudly.
 *
 * EXAM SCOPE (immutable, per attempt) — app semantics, verbatim:
 *   'full'   — paid full-bank attempt. The ONLY scope that feeds the
 *              Prepometer. Stored in the lastExam, bestExam and examAttempts
 *              fields, plus a lastExamScope: 'full' marker on every new write.
 *   'sample' — free-tier attempt on the free seeds. Stored in sample* fields.
 *              Guides weak areas only — NEVER readiness.
 *   Legacy docs (no lastExamScope marker) are classified by lastExamTotal:
 *   20-question attempts were free samples, 30-question attempts full exams.
 *
 * DECLARED DEVIATION (Anusha, 2026-07-19): the app mirrors every write into a
 * device-local AsyncStorage cache (`examResults_{n}`) and falls back to it when
 * Firestore is unavailable. The web port is Firestore-only. The manual's parity
 * requirement is over Firestore DOCUMENTS; the cache is React Native device
 * state with no web equivalent, and caching user progress in browser storage
 * would cut against the entitlement-caching discipline M3 established. The
 * consequence is that `getChapterProgress` returns null (rather than stale
 * local data) when Firestore cannot be reached — strictly the more conservative
 * behaviour.
 *
 * Never references isPaid — the client may not touch it (manual §0.9).
 */
import { FREE_QUESTIONS_PER_CHAPTER } from './nudgeGates';
import type { ProgressBackend } from './progressBackend';
import { type RunAnswer, type RunQuestion, updateMistakesFromRun } from './mistakesService';

export const EXAM_SCOPE = { SAMPLE: 'sample', FULL: 'full' } as const;
export type ExamScope = (typeof EXAM_SCOPE)[keyof typeof EXAM_SCOPE];

/**
 * The locked free-tier scoring denominator floor: free = correct ÷ max(10,
 * attempted). Ported from app `services/quizEngine.ts:43` (FREE_SCORE_FLOOR).
 * A scoring constant — changing it is a §0.10 stop condition.
 */
export const FREE_SCORE_FLOOR = 10;

export interface WrongEntry {
  questionId: string;
  subtopic: string;
}

export interface ScopeBlob {
  lastScore: number;
  lastTotal: number;
  lastAttempted: number;
  lastPercentage: number;
  bestScore: number;
  bestTotal: number;
  attempts: number;
  wrong: WrongEntry[];
}

export interface ProgressBlob {
  sample: ScopeBlob | null;
  full: ScopeBlob | null;
  practiced: number;
  lastScore: number;
  lastTotal: number;
  lastAttempted: number;
  lastPercentage: number;
  bestScore: number;
  bestTotal: number;
  attempts: number;
  wrong: WrongEntry[];
}

type RawDoc = Record<string, unknown>;

/**
 * Reads a stored field with the app's EXACT `data.field ?? fallback`
 * semantics: only null/undefined fall through to the fallback.
 *
 * Deliberately NOT a `typeof` guard. Adding one would be more defensive than
 * the app and would therefore DIVERGE on a malformed document — e.g. a string
 * "5" passes straight through in the app but would become the fallback here.
 * Unreachable with well-formed data, but "ported, never re-derived" (manual
 * §0.3) does not carve out an exception for improvements.
 */
function field<T>(data: RawDoc, key: string): T | null | undefined {
  return data[key] as T | null | undefined;
}

/**
 * Legacy records carry no scope marker. Anusha's migration rule (app
 * `classifyLegacyTotal`): existing 20-question attempts are free samples,
 * 30-question attempts full exams.
 */
export function classifyLegacyTotal(total: number): ExamScope {
  return total > FREE_QUESTIONS_PER_CHAPTER ? EXAM_SCOPE.FULL : EXAM_SCOPE.SAMPLE;
}

/** Assemble the canonical blob: scope sub-blobs + merged guidance view. */
function buildBlob({
  sample = null,
  full = null,
  practiced = 0,
}: {
  sample?: ScopeBlob | null;
  full?: ScopeBlob | null;
  practiced?: number;
}): ProgressBlob {
  const guide = full ?? sample; // guidance only — never a readiness claim
  return {
    sample,
    full,
    practiced,
    lastScore: guide?.lastScore ?? 0,
    lastTotal: guide?.lastTotal ?? 0,
    lastAttempted: guide?.lastAttempted ?? 0,
    lastPercentage: guide?.lastPercentage ?? 0,
    bestScore: guide?.bestScore ?? 0,
    bestTotal: guide?.bestTotal ?? 0,
    attempts: (sample?.attempts ?? 0) + (full?.attempts ?? 0),
    wrong: guide?.wrong ?? [],
  };
}

function wrongArray(v: unknown): WrongEntry[] {
  return Array.isArray(v) ? (v as WrongEntry[]) : [];
}

function scopeBlobFromLegacyFields(data: RawDoc): ScopeBlob {
  const lastScore = field<number>(data, 'lastExamScore') ?? 0;
  const lastTotal = field<number>(data, 'lastExamTotal') ?? 0;
  return {
    lastScore,
    lastTotal,
    lastAttempted: field<number>(data, 'lastExamAttempted') ?? lastTotal,
    lastPercentage:
      field<number>(data, 'lastExamPct') ?? (lastTotal > 0 ? Math.round((lastScore / lastTotal) * 100) : 0),
    bestScore: field<number>(data, 'bestExamScore') ?? lastScore,
    bestTotal: field<number>(data, 'bestExamTotal') ?? lastTotal,
    attempts: field<number>(data, 'examAttempts') ?? (lastTotal > 0 ? 1 : 0),
    wrong: wrongArray(data.lastExamWrong),
  };
}

function scopeBlobFromSampleFields(data: RawDoc): ScopeBlob {
  const lastScore = field<number>(data, 'sampleLastScore') ?? 0;
  const lastTotal = field<number>(data, 'sampleLastTotal') ?? 0;
  return {
    lastScore,
    lastTotal,
    lastAttempted: field<number>(data, 'sampleLastAttempted') ?? lastTotal,
    lastPercentage:
      field<number>(data, 'sampleLastPct') ?? (lastTotal > 0 ? Math.round((lastScore / lastTotal) * 100) : 0),
    bestScore: field<number>(data, 'sampleBestScore') ?? lastScore,
    bestTotal: field<number>(data, 'sampleBestTotal') ?? lastTotal,
    attempts: field<number>(data, 'sampleAttempts') ?? (lastTotal > 0 ? 1 : 0),
    wrong: wrongArray(data.sampleLastWrong),
  };
}

/**
 * Sample totals must be the LOCKED denominator max(10, attempted). Legacy
 * sample records stored the SERVED count instead (7 correct of 10 attempted
 * read as "7/20" beside a 70% score), so normalize on read — idempotent,
 * correct records pass through untouched:
 *   last* — the denominator re-derives from lastAttempted (recoverable).
 *   best* — the best attempt's attempted count is NOT recoverable, so the
 *           stored score/served pair stands (a true, conservative fraction —
 *           never a fabricated one) unless the normalized last attempt beats it
 *           on percentage, in which case last IS the best known attempt.
 */
function normalizeSampleScope(scope: ScopeBlob | null): ScopeBlob | null {
  if (!scope || !(scope.lastTotal > 0)) return scope;

  const denom = scope.lastAttempted > 0 ? Math.max(FREE_SCORE_FLOOR, scope.lastAttempted) : scope.lastTotal;
  const lastPercentage = scope.lastPercentage ?? (denom > 0 ? Math.round((scope.lastScore / denom) * 100) : 0);

  let bestScore = scope.bestScore ?? scope.lastScore;
  let bestTotal = scope.bestTotal ?? scope.lastTotal;
  const bestPct = bestTotal > 0 ? (bestScore / bestTotal) * 100 : 0;
  if (lastPercentage > bestPct) {
    bestScore = scope.lastScore;
    bestTotal = denom;
  }

  return { ...scope, lastTotal: denom, lastPercentage, bestScore, bestTotal };
}

/** Raw `chapterProgress/{n}` data → the canonical blob. */
export function docToBlob(data: RawDoc | undefined): ProgressBlob | null {
  if (!data) return null;

  const hasSampleFields = data.sampleLastTotal != null;
  const hasExamFields = (field<number>(data, 'lastExamTotal') ?? 0) > 0;
  // Marked docs are authoritative; unmarked lastExam* data is legacy and
  // classified by its question count.
  const examFieldsScope: ExamScope | null = hasExamFields
    ? (field<ExamScope>(data, 'lastExamScope') ??
      classifyLegacyTotal(field<number>(data, 'lastExamTotal') ?? 0))
    : null;

  const full = examFieldsScope === EXAM_SCOPE.FULL ? scopeBlobFromLegacyFields(data) : null;
  const sample = normalizeSampleScope(
    hasSampleFields
      ? scopeBlobFromSampleFields(data)
      : examFieldsScope === EXAM_SCOPE.SAMPLE
        ? scopeBlobFromLegacyFields(data)
        : null,
  );

  if (!sample && !full && !((field<number>(data, 'practiceAttempted') ?? 0) > 0)) {
    return buildBlob({});
  }
  return buildBlob({ sample, full, practiced: field<number>(data, 'practiceAttempted') ?? 0 });
}

/**
 * Firestore read. Unlike the app there is no local-cache fallback (see the
 * declared deviation in the file header): an unreachable Firestore reads as
 * "no progress yet", never as stale local data.
 */
export async function getChapterProgress(
  backend: ProgressBackend,
  chapterNumber: number,
): Promise<ProgressBlob | null> {
  if (!backend.uid()) return null;
  try {
    return docToBlob(await backend.readChapterProgress(String(chapterNumber)));
  } catch (error) {
    console.warn('[progressService] read failed:', (error as Error)?.message);
    return null;
  }
}

interface SessionLogInput {
  mode: string;
  chapter?: number | null;
  correct: number;
  attempted: number;
  served: number;
  scorePct: number;
  endedEarly?: boolean;
  timeTaken?: number | null;
  answers?: RunAnswer[];
  questions?: RunQuestion[];
  source?: string | null;
  examScope?: ExamScope | null;
}

/**
 * One session doc per COMPLETED quiz/exam/mock — written once, at completion.
 * Incomplete mocks are never passed here (LOCKED: silently discarded).
 *
 * EXPORTED to match the app's public surface, where `mockService.js` and
 * `baselineService.js` both consume it. M6's mock port must call THIS, not
 * restate the session shape — that duplication is what
 * `test/singleWriteSite.test.ts` exists to prevent. It has no caller in M4.
 */
export async function writeSessionLog(
  backend: ProgressBackend,
  {
    mode,
    chapter,
    correct,
    attempted,
    served,
    scorePct,
    endedEarly = false,
    timeTaken = null,
    answers = [],
    questions = [],
    source = null,
    examScope = null,
  }: SessionLogInput,
): Promise<void> {
  if (!backend.uid()) return;

  const detail = questions.map((q, i) => ({
    qId: q.id ?? null,
    picked: answers[i] ?? null,
    correct: answers[i] != null && answers[i] === q.correctIndex,
  }));

  await backend.addSession({
    mode,
    source, // null for a normal run; 'mistakes' for a deck re-attempt
    // Immutable at completion: 'sample' or 'full' for exam sessions; null for
    // every other mode.
    examScope,
    chapter: chapter ?? null,
    completedAt: backend.serverTimestamp(),
    correct,
    attempted,
    served,
    scorePct,
    endedEarly,
    timeTaken,
    answers: detail,
  });
}

export interface ExamSessionInput {
  chapterNumber: number;
  correct: number;
  attempted: number;
  served: number;
  scorePct: number;
  examScope: ExamScope;
  endedEarly?: boolean;
  answers?: RunAnswer[];
  questions?: RunQuestion[];
}

/**
 * Single write site for a completed Exam Mode attempt. `examScope` is REQUIRED
 * and immutable. Each scope aggregates separately: a sample attempt never
 * touches full-exam fields and vice versa.
 * Returns { prev, next } so the caller can render deltas without re-reading.
 */
export async function recordExamSession(
  backend: ProgressBackend,
  {
    chapterNumber,
    correct,
    attempted,
    served,
    scorePct,
    examScope,
    endedEarly = false,
    answers = [],
    questions = [],
  }: ExamSessionInput,
): Promise<{ prev: ProgressBlob | null; next: ProgressBlob }> {
  if (examScope !== EXAM_SCOPE.SAMPLE && examScope !== EXAM_SCOPE.FULL) {
    throw new Error(`recordExamSession: invalid examScope "${examScope}"`);
  }

  const prev = await getChapterProgress(backend, chapterNumber);

  const wrong: WrongEntry[] = questions
    .filter((q, i) => answers[i] != null && answers[i] !== q.correctIndex)
    .map((q) => ({ questionId: q.id as string, subtopic: q.subtopic ?? 'General' }));

  const prevScope = prev?.[examScope] ?? null;

  // The stored total is the LOCKED scoring denominator, so score/total always
  // reads as the honest percentage: sample = max(10, attempted) — NOT the 20
  // served (7 correct of 10 attempted is 7/10 = 70%, never "7/20"); full =
  // questions served.
  const denom = examScope === EXAM_SCOPE.SAMPLE ? Math.max(FREE_SCORE_FLOOR, attempted) : served;

  // Best is the attempt with the highest PERCENTAGE, kept as a matched
  // score/total pair — denominators vary across attempts (ending early), so a
  // raw-correct max, or a bestTotal stamped from the current attempt, can pair
  // a retained best score with the wrong denominator.
  const prevBestPct =
    prevScope != null && prevScope.bestTotal > 0 ? (prevScope.bestScore / prevScope.bestTotal) * 100 : null;
  const isNewBest = prevBestPct == null || scorePct >= prevBestPct;

  const nextScopeBlob: ScopeBlob = {
    lastScore: correct,
    lastTotal: denom,
    lastAttempted: attempted,
    lastPercentage: scorePct,
    // `prevScope` is non-null whenever isNewBest is false: a null prevScope
    // forces prevBestPct null, which forces isNewBest true.
    bestScore: isNewBest ? correct : (prevScope as ScopeBlob).bestScore,
    bestTotal: isNewBest ? denom : (prevScope as ScopeBlob).bestTotal,
    attempts: (prevScope?.attempts ?? 0) + 1,
    wrong,
  };

  const next = buildBlob({
    sample: examScope === EXAM_SCOPE.SAMPLE ? nextScopeBlob : (prev?.sample ?? null),
    full: examScope === EXAM_SCOPE.FULL ? nextScopeBlob : (prev?.full ?? null),
    practiced: prev?.practiced ?? 0,
  });

  if (backend.uid()) {
    const sampleFields = (s: ScopeBlob) => ({
      sampleLastScore: s.lastScore,
      sampleLastTotal: s.lastTotal,
      sampleLastAttempted: s.lastAttempted,
      sampleLastPct: s.lastPercentage,
      sampleLastWrong: s.wrong,
      sampleBestScore: s.bestScore,
      sampleBestTotal: s.bestTotal,
      sampleAttempts: s.attempts,
    });

    let aggregate: Record<string, unknown>;
    if (examScope === EXAM_SCOPE.FULL) {
      aggregate = {
        lastExamScope: EXAM_SCOPE.FULL,
        lastExamScore: correct,
        lastExamTotal: served,
        lastExamAttempted: attempted,
        lastExamPct: scorePct,
        lastExamDate: backend.serverTimestamp(),
        lastExamWrong: wrong,
        previousExamScore: prevScope?.lastScore ?? null,
        previousExamTotal: prevScope?.lastTotal ?? null,
        bestExamScore: nextScopeBlob.bestScore,
        bestExamTotal: nextScopeBlob.bestTotal,
        examAttempts: nextScopeBlob.attempts,
      };
      // Legacy sample history may live in the lastExam* fields this write
      // overwrites — persist it explicitly so it survives the takeover.
      if (prev?.sample) aggregate = { ...aggregate, ...sampleFields(prev.sample) };
    } else {
      aggregate = {
        ...sampleFields(nextScopeBlob),
        sampleLastDate: backend.serverTimestamp(),
        samplePreviousScore: prevScope?.lastScore ?? null,
        samplePreviousTotal: prevScope?.lastTotal ?? null,
      };
    }

    const aggregateWrite = backend.writeChapterProgress(String(chapterNumber), aggregate, true);

    const sessionWrite = writeSessionLog(backend, {
      mode: 'exam',
      chapter: chapterNumber,
      examScope,
      correct,
      attempted,
      served,
      scorePct,
      endedEarly,
      answers,
      questions,
    });

    // Mistakes deck: wrong answers join, correct answers on active deck
    // questions advance the retire streak. Fire-and-forget — a deck failure
    // never blocks the progress write.
    const mistakesWrite = updateMistakesFromRun(backend, { questions, answers }).catch((err: Error) =>
      console.warn('[progressService] mistakes update failed:', err?.message),
    );

    await Promise.all([aggregateWrite, sessionWrite, mistakesWrite]).catch((err: Error) => {
      console.warn('[progressService] exam write failed:', err?.message);
    });
  }

  return { prev, next };
}

export interface PracticeSessionInput {
  chapterNumber: number;
  correct: number;
  attempted: number;
  scorePct: number;
  answers?: RunAnswer[];
  questions?: RunQuestion[];
  source?: string | null;
}

/**
 * Records a completed Practice Mode run: session log + practiceAttempted
 * aggregate. Practice never touches exam fields or the Prepometer.
 *
 * PORT NOTE — one visible structural difference from the app, following
 * directly from the header's cache deviation: the app opens this function with
 * `getChapterProgress` and folds the result into the AsyncStorage cache blob.
 * With no cache, that read has no consumer here. It is omitted rather than
 * performed and discarded. This cannot change any DOCUMENT: the aggregate is a
 * field increment (never derived from prior state) and the session log does not
 * consult `prev`. `recordExamSession` still reads, because its documents and
 * its return value genuinely depend on `prev`.
 */
export async function recordPracticeSession(
  backend: ProgressBackend,
  { chapterNumber, correct, attempted, scorePct, answers = [], questions = [], source = null }: PracticeSessionInput,
): Promise<void> {
  if (!backend.uid()) return;

  const aggregateWrite = backend.writeChapterProgress(
    String(chapterNumber),
    { practiceAttempted: backend.increment(attempted) },
    true,
  );

  const sessionWrite = writeSessionLog(backend, {
    mode: 'practice',
    chapter: chapterNumber,
    correct,
    attempted,
    served: attempted,
    scorePct,
    answers,
    questions,
    source,
  });

  const mistakesWrite = updateMistakesFromRun(backend, { questions, answers }).catch((err: Error) =>
    console.warn('[progressService] mistakes update failed:', err?.message),
  );

  await Promise.all([aggregateWrite, sessionWrite, mistakesWrite]).catch((err: Error) => {
    console.warn('[progressService] practice write failed:', err?.message);
  });
}

export interface FlashcardGrade {
  front?: string | null;
  subtopic?: string | null;
  knew?: boolean;
}

/**
 * Records a completed flashcard run's self-grades — one sessions doc, mode
 * 'flashcards'. Grades are self-reported study data, NOT scoring: this never
 * touches chapterProgress, the Prepometer, or the mistakes deck. Uses a
 * `grades` field (front/subtopic/knew) instead of `answers` — the per-question
 * detail shape doesn't fit cards.
 */
export async function recordFlashcardSession(
  backend: ProgressBackend,
  { chapterNumber, grades = [] }: { chapterNumber?: number | null; grades?: FlashcardGrade[] },
): Promise<void> {
  if (!backend.uid() || grades.length === 0) return;

  const knew = grades.filter((g) => g.knew).length;

  try {
    await backend.addSession({
      mode: 'flashcards',
      source: null,
      examScope: null,
      chapter: chapterNumber ?? null,
      completedAt: backend.serverTimestamp(),
      correct: knew,
      attempted: grades.length,
      served: grades.length,
      scorePct: Math.round((knew / grades.length) * 100),
      endedEarly: false,
      timeTaken: null,
      grades: grades.map((g) => ({
        front: g.front ?? null,
        subtopic: g.subtopic ?? 'General',
        knew: !!g.knew,
      })),
    });
  } catch (err) {
    console.warn('[progressService] flashcard session write failed:', (err as Error)?.message);
  }
}
