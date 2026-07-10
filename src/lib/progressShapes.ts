/**
 * Pure builders for every Firestore document shape the web writes — kept
 * separate from the firebase writers so fixture tests can assert BYTE-LEVEL
 * parity with the app's progressService/mockService/mistakesService shapes.
 *
 * This is the sanctioned interim fallback (#2) of the single-write-site
 * strategy in CLAUDE.md: copied shapes + shared fixture tests. The preferred
 * shared-core extraction remains a dedicated flagged session.
 *
 * Sentinel fields (serverTimestamp / increment / ISO date) are represented by
 * the SENTINEL placeholders below; the writers substitute real FieldValues.
 */
import type { Question } from './quizEngine';

export const SERVER_TIMESTAMP = '__SERVER_TIMESTAMP__' as const;
export const INCREMENT = '__INCREMENT__' as const;

export interface WrongEntry {
  questionId: string;
  subtopic: string;
}

export interface ProgressBlob {
  lastScore: number;
  lastTotal: number;
  lastAttempted: number;
  lastPercentage: number;
  bestScore: number;
  bestTotal: number;
  attempts: number;
  practiced: number;
  wrong: WrongEntry[];
}

export function buildWrongList(
  questions: readonly Question[],
  answers: readonly (number | null | undefined)[],
): WrongEntry[] {
  return questions
    .filter((q, i) => answers[i] != null && answers[i] !== q.correctIndex)
    .map((q) => ({ questionId: q.id, subtopic: q.subtopic ?? 'General' }));
}

/** Session-log answer detail — mirrors app writeSessionLog exactly. */
export function buildSessionDetail(
  questions: readonly Question[],
  answers: readonly (number | null | undefined)[],
) {
  return questions.map((q, i) => ({
    qId: q.id ?? null,
    picked: answers[i] ?? null,
    correct: answers[i] != null && answers[i] === q.correctIndex,
  }));
}

export function buildSessionDoc(opts: {
  mode: 'exam' | 'practice' | 'mock' | 'flashcards';
  chapter: number | null;
  correct: number;
  attempted: number;
  served: number;
  scorePct: number;
  endedEarly?: boolean;
  timeTaken?: number | null;
  answers?: readonly (number | null | undefined)[];
  questions?: readonly Question[];
  source?: string | null;
}) {
  const {
    mode, chapter, correct, attempted, served, scorePct,
    endedEarly = false, timeTaken = null, answers = [], questions = [],
    source = null,
  } = opts;
  return {
    mode,
    source,
    chapter: chapter ?? null,
    completedAt: SERVER_TIMESTAMP,
    correct,
    attempted,
    served,
    scorePct,
    endedEarly,
    timeTaken,
    answers: buildSessionDetail(questions, answers),
  };
}

/** chapterProgress aggregate for a completed EXAM — mirrors recordExamSession. */
export function buildExamAggregate(
  prev: ProgressBlob | null,
  opts: {
    correct: number;
    attempted: number;
    served: number;
    scorePct: number;
    wrong: WrongEntry[];
  },
) {
  const { correct, attempted, served, scorePct, wrong } = opts;
  return {
    lastExamScore: correct,
    lastExamTotal: served,
    lastExamAttempted: attempted,
    lastExamPct: scorePct,
    lastExamDate: SERVER_TIMESTAMP,
    lastExamWrong: wrong,
    previousExamScore: prev?.lastScore ?? null,
    previousExamTotal: prev?.lastTotal ?? null,
    bestExamScore: prev ? Math.max(prev.bestScore ?? 0, correct) : correct,
    bestExamTotal: served,
    examAttempts: (prev?.attempts ?? 0) + 1,
  };
}

/** The blob shape screens consume — mirrors app recordExamSession `next`. */
export function buildNextBlob(
  prev: ProgressBlob | null,
  opts: {
    correct: number;
    attempted: number;
    served: number;
    scorePct: number;
    wrong: WrongEntry[];
  },
): ProgressBlob {
  const { correct, attempted, served, scorePct, wrong } = opts;
  return {
    lastScore: correct,
    lastTotal: served,
    lastAttempted: attempted,
    lastPercentage: scorePct,
    bestScore: prev ? Math.max(prev.bestScore ?? 0, correct) : correct,
    bestTotal: served,
    attempts: (prev?.attempts ?? 0) + 1,
    practiced: prev?.practiced ?? 0,
    wrong,
  };
}

/** chapterProgress doc read → blob — mirrors app docToBlob exactly. */
export function docToBlob(data: Record<string, unknown> | undefined | null): ProgressBlob | null {
  if (!data) return null;
  const d = data as Record<string, any>;
  const lastScore = d.lastExamScore ?? 0;
  const lastTotal = d.lastExamTotal ?? 0;
  return {
    lastScore,
    lastTotal,
    lastAttempted: d.lastExamAttempted ?? lastTotal,
    lastPercentage:
      d.lastExamPct ?? (lastTotal > 0 ? Math.round((lastScore / lastTotal) * 100) : 0),
    bestScore: d.bestExamScore ?? lastScore,
    bestTotal: d.bestExamTotal ?? lastTotal,
    attempts: d.examAttempts ?? (lastTotal > 0 ? 1 : 0),
    practiced: d.practiceAttempted ?? 0,
    wrong: Array.isArray(d.lastExamWrong) ? d.lastExamWrong : [],
  };
}

/** mockHistory entry — mirrors app mockService.recordMockAttempt. */
export function buildMockRecord(opts: {
  date: string; // ISO — serverTimestamp is not allowed inside arrayUnion
  score: number;
  total: number;
  percentage: number;
  timeTaken: number | null;
  weakChapters: number[];
}) {
  const { date, score, total, percentage, timeTaken, weakChapters } = opts;
  return { date, score, total, percentage, timeTaken, weakChapters };
}

/** New/reset mistake doc — mirrors app mistakesService.updateMistakesFromRun. */
export function buildMistakeJoin(q: Question) {
  return {
    questionId: q.id,
    chapter: q.chapter ?? null,
    subtopic: q.subtopic ?? 'General',
    correctStreak: 0,
    retired: false,
    addedAt: SERVER_TIMESTAMP,
    updatedAt: SERVER_TIMESTAMP,
  };
}

/** Streak-advance mistake update — mirrors the app exactly. */
export function buildMistakeAdvance(streak: number, retireStreak: number) {
  return {
    correctStreak: streak,
    retired: streak >= retireStreak,
    updatedAt: SERVER_TIMESTAMP,
  };
}
