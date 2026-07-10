/**
 * Web mockService — mirrors the app's mockService.js exactly.
 * users/{uid}.mockHistory is the cross-platform free-mock-ever counter:
 * a free account with ANY history (app or web) cannot take another mock.
 * Attempts are recorded on SUBMIT only; incomplete attempts are discarded.
 */
import { arrayUnion, doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb, getFirebaseAuth } from './firebase';
import { buildMockRecord } from './progressShapes';
import { writeSessionLog } from './progressService';
import type { Question } from './quizEngine';

function uid(): string | null {
  return getFirebaseAuth()?.currentUser?.uid ?? null;
}

export interface MockHistoryEntry {
  date: string;
  score: number;
  total: number;
  percentage: number;
  timeTaken: number | null;
  weakChapters: number[];
}

export async function getMockHistory(): Promise<MockHistoryEntry[]> {
  const db = getDb();
  const u = uid();
  if (!db || !u) return [];
  try {
    const snap = await getDoc(doc(db, 'users', u));
    return snap.data()?.mockHistory ?? [];
  } catch (err) {
    console.warn('[mockService] history read failed:', (err as Error)?.message);
    return [];
  }
}

/** LOCKED: paid users unlimited; free users only if they have NEVER attempted. */
export async function canTakeMock(isPaid: boolean): Promise<boolean> {
  if (isPaid) return true;
  const history = await getMockHistory();
  return history.length === 0;
}

export async function recordMockAttempt(opts: {
  score: number;
  total: number;
  percentage: number;
  timeTaken: number | null;
  weakChapters: number[];
  answers?: (number | null)[];
  questions?: Question[];
}): Promise<void> {
  const db = getDb();
  const u = uid();
  if (!db || !u) return;

  const { answers = [], questions = [], ...entry } = opts;
  const record = buildMockRecord({ date: new Date().toISOString(), ...entry });

  try {
    await setDoc(doc(db, 'users', u), { mockHistory: arrayUnion(record) }, { merge: true });
  } catch (err) {
    console.warn('[mockService] attempt write failed:', (err as Error)?.message);
  }

  writeSessionLog({
    mode: 'mock',
    chapter: null,
    correct: entry.score,
    attempted: answers.filter((a) => a != null).length,
    served: entry.total,
    scorePct: entry.percentage,
    timeTaken: entry.timeTaken ?? null,
    answers,
    questions,
  }).catch((err) => console.warn('[mockService] session log failed:', (err as Error)?.message));
}
