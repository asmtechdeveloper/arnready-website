/**
 * Web mistakes deck — same documents as the app's mistakesService:
 * users/{uid}/mistakes/{questionId}. Collection happens once per COMPLETED
 * run; retire at correctStreak 2 (locked). Free users' mistakes only ever
 * reference questions they were served, so reads stay inside the rules.
 */
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { CONFIG } from './config';
import { getDb, getFirebaseAuth } from './firebase';
import type { Question } from './quizEngine';

function uid(): string | null {
  return getFirebaseAuth()?.currentUser?.uid ?? null;
}

export interface MistakeEntry {
  questionId: string;
  chapter: number | null;
  subtopic: string;
  correctStreak: number;
}

export async function updateMistakesFromRun({
  questions = [],
  answers = [],
}: {
  questions?: readonly Question[];
  answers?: readonly (number | null | undefined)[];
}): Promise<void> {
  const db = getDb();
  const u = uid();
  if (!db || !u || questions.length === 0) return;

  const active = new Map<string, number>();
  const snap = await getDocs(
    query(collection(db, 'users', u, 'mistakes'), where('retired', '==', false)),
  );
  snap.forEach((d) => active.set(d.id, d.data()?.correctStreak ?? 0));

  const batch = writeBatch(db);
  let writes = 0;

  questions.forEach((q, i) => {
    const picked = answers[i];
    if (picked == null || !q?.id) return;

    if (picked !== q.correctIndex) {
      batch.set(
        doc(db, 'users', u, 'mistakes', q.id),
        {
          questionId: q.id,
          chapter: q.chapter ?? null,
          subtopic: q.subtopic ?? 'General',
          correctStreak: 0,
          retired: false,
          addedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      writes += 1;
    } else if (active.has(q.id)) {
      const streak = (active.get(q.id) ?? 0) + 1;
      batch.set(
        doc(db, 'users', u, 'mistakes', q.id),
        {
          correctStreak: streak,
          retired: streak >= CONFIG.MISTAKE_RETIRE_STREAK,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      writes += 1;
    }
  });

  if (writes > 0) await batch.commit();
}

export async function getActiveMistakes(chapterNumber: number | null = null): Promise<MistakeEntry[]> {
  const db = getDb();
  const u = uid();
  if (!db || !u) return [];
  try {
    const clauses = [where('retired', '==', false)];
    if (chapterNumber != null) clauses.push(where('chapter', '==', chapterNumber));
    const snap = await getDocs(query(collection(db, 'users', u, 'mistakes'), ...clauses));
    const out: MistakeEntry[] = [];
    snap.forEach((d) => {
      const data = d.data();
      out.push({
        questionId: d.id,
        chapter: data.chapter ?? null,
        subtopic: data.subtopic ?? 'General',
        correctStreak: data.correctStreak ?? 0,
      });
    });
    return out;
  } catch (err) {
    console.warn('[mistakesService] read failed:', (err as Error)?.message);
    return [];
  }
}

/**
 * Full question docs for a chapter's active mistakes, shuffled. Each carries
 * `_streak` so the player can show the retire moment. `in` caps at 10 ids.
 */
export async function loadMistakeQuestions(
  chapterNumber: number,
): Promise<Array<Question & { _streak: number }>> {
  const db = getDb();
  if (!db) return [];
  const mistakes = await getActiveMistakes(chapterNumber);
  if (mistakes.length === 0) return [];

  const streaks = new Map(mistakes.map((m) => [m.questionId, m.correctStreak]));
  const ids = [...streaks.keys()];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

  const snaps = await Promise.all(
    chunks.map((chunk) => getDocs(query(collection(db, 'questions'), where('id', 'in', chunk)))),
  );

  const docs: Array<Question & { _streak: number }> = [];
  snaps.forEach((snap) =>
    snap.forEach((d) => {
      const q = d.data() as Question;
      docs.push({ ...q, _streak: streaks.get(q.id) ?? 0 });
    }),
  );

  for (let i = docs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [docs[i], docs[j]] = [docs[j], docs[i]];
  }
  return docs;
}
