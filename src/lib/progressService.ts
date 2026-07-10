/**
 * Web progressService — writes the SAME Firestore documents as the app's
 * services/progressService.js (the single write site). Shapes come from
 * progressShapes.ts, which is pinned to the app by fixture tests; this file
 * only substitutes real FieldValues for the sentinels and talks to the SDK.
 * Never references isPaid — rules forbid the client touching it.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getDb, getFirebaseAuth } from './firebase';
import type { Question } from './quizEngine';
import {
  buildExamAggregate,
  buildNextBlob,
  buildSessionDoc,
  buildWrongList,
  docToBlob,
  SERVER_TIMESTAMP,
  type ProgressBlob,
} from './progressShapes';
import { updateMistakesFromRun } from './mistakesService';

function uid(): string | null {
  return getFirebaseAuth()?.currentUser?.uid ?? null;
}

// Cache keys are UID-scoped so one account's data can never surface for —
// or be written back as — another account on a shared machine. Unsigned
// visitors get no cache at all (locked access model: nothing persisted).
const cacheKey = (n: number) => {
  const u = uid();
  return u ? `arnready_examResults_${u}_${n}` : null;
};

/** Replace shape sentinels with real Firestore FieldValues. */
function materialise<T extends Record<string, unknown>>(shape: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(shape)) {
    out[k] = v === SERVER_TIMESTAMP ? serverTimestamp() : v;
  }
  return out;
}

function readCache(n: number): ProgressBlob | null {
  try {
    const key = cacheKey(n);
    if (!key) return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(n: number, blob: ProgressBlob): void {
  try {
    const key = cacheKey(n);
    if (key) localStorage.setItem(key, JSON.stringify(blob));
  } catch {}
}

export async function writeSessionLog(opts: Parameters<typeof buildSessionDoc>[0]): Promise<void> {
  const db = getDb();
  const u = uid();
  if (!db || !u) return;
  await addDoc(collection(db, 'users', u, 'sessions'), materialise(buildSessionDoc(opts)));
}

export async function recordExamSession(opts: {
  chapterNumber: number;
  correct: number;
  attempted: number;
  served: number;
  scorePct: number;
  endedEarly?: boolean;
  answers?: (number | null)[];
  questions?: Question[];
}): Promise<{ prev: ProgressBlob | null; next: ProgressBlob }> {
  const {
    chapterNumber, correct, attempted, served, scorePct,
    endedEarly = false, answers = [], questions = [],
  } = opts;

  const prev = await getChapterProgress(chapterNumber);
  const wrong = buildWrongList(questions, answers);
  const next = buildNextBlob(prev, { correct, attempted, served, scorePct, wrong });
  writeCache(chapterNumber, next);

  const db = getDb();
  const u = uid();
  if (db && u) {
    const aggregateWrite = setDoc(
      doc(db, 'users', u, 'chapterProgress', String(chapterNumber)),
      materialise(buildExamAggregate(prev, { correct, attempted, served, scorePct, wrong })),
      { merge: true },
    );
    const sessionWrite = writeSessionLog({
      mode: 'exam', chapter: chapterNumber,
      correct, attempted, served, scorePct, endedEarly, answers, questions,
    });
    // Fire-and-forget mirror of the app: a deck failure never blocks progress.
    const mistakesWrite = updateMistakesFromRun({ questions, answers }).catch((err) =>
      console.warn('[progressService] mistakes update failed:', err?.message),
    );
    await Promise.all([aggregateWrite, sessionWrite, mistakesWrite]).catch((err) => {
      console.warn('[progressService] exam write failed:', err?.message);
    });
  }

  return { prev, next };
}

export async function recordPracticeSession(opts: {
  chapterNumber: number;
  correct: number;
  attempted: number;
  scorePct: number;
  answers?: (number | null)[];
  questions?: Question[];
  source?: string | null;
}): Promise<void> {
  const {
    chapterNumber, correct, attempted, scorePct,
    answers = [], questions = [], source = null,
  } = opts;

  const prev = await getChapterProgress(chapterNumber);
  const next: ProgressBlob = {
    lastScore: prev?.lastScore ?? 0,
    lastTotal: prev?.lastTotal ?? 0,
    lastAttempted: prev?.lastAttempted ?? 0,
    lastPercentage: prev?.lastPercentage ?? 0,
    bestScore: prev?.bestScore ?? 0,
    bestTotal: prev?.bestTotal ?? 0,
    attempts: prev?.attempts ?? 0,
    practiced: (prev?.practiced ?? 0) + attempted,
    wrong: prev?.wrong ?? [],
  };
  writeCache(chapterNumber, next);

  const db = getDb();
  const u = uid();
  if (db && u) {
    const aggregateWrite = setDoc(
      doc(db, 'users', u, 'chapterProgress', String(chapterNumber)),
      { practiceAttempted: increment(attempted) },
      { merge: true },
    );
    const sessionWrite = writeSessionLog({
      mode: 'practice', chapter: chapterNumber,
      correct, attempted, served: attempted, scorePct, answers, questions, source,
    });
    const mistakesWrite = updateMistakesFromRun({ questions, answers }).catch((err) =>
      console.warn('[progressService] mistakes update failed:', err?.message),
    );
    await Promise.all([aggregateWrite, sessionWrite, mistakesWrite]).catch((err) => {
      console.warn('[progressService] practice write failed:', err?.message);
    });
  }
}

export async function recordFlashcardSession(opts: {
  chapterNumber: number;
  grades: Array<{ front: string; subtopic: string; knew: boolean }>;
}): Promise<void> {
  const { chapterNumber, grades } = opts;
  const db = getDb();
  const u = uid();
  if (!db || !u || grades.length === 0) return;

  const knew = grades.filter((g) => g.knew).length;
  await addDoc(collection(db, 'users', u, 'sessions'), {
    mode: 'flashcards',
    source: null,
    chapter: chapterNumber ?? null,
    completedAt: serverTimestamp(),
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
  }).catch((err) =>
    console.warn('[progressService] flashcard session write failed:', err?.message),
  );
}

export async function getChapterProgress(n: number): Promise<ProgressBlob | null> {
  const db = getDb();
  const u = uid();
  if (db && u) {
    try {
      const snap = await getDoc(doc(db, 'users', u, 'chapterProgress', String(n)));
      if (snap.exists()) {
        const blob = docToBlob(snap.data());
        if (blob) {
          writeCache(n, blob);
          return blob;
        }
      }
    } catch (err) {
      console.warn('[progressService] read failed, using cache:', (err as Error)?.message);
    }
  }
  return readCache(n);
}

export async function getAllChapterProgress(
  chapterNumbers: number[],
): Promise<Record<number, ProgressBlob>> {
  const result: Record<number, ProgressBlob> = {};
  for (const n of chapterNumbers) {
    const cached = readCache(n);
    if (cached) result[n] = cached;
  }
  const db = getDb();
  const u = uid();
  if (db && u) {
    try {
      const snap = await getDocs(collection(db, 'users', u, 'chapterProgress'));
      snap.forEach((d) => {
        const n = Number(d.id);
        const blob = docToBlob(d.data());
        if (Number.isFinite(n) && blob) result[n] = blob;
      });
    } catch (err) {
      console.warn('[progressService] bulk read failed, using cache:', (err as Error)?.message);
    }
  }
  return result;
}
