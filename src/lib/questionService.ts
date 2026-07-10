/**
 * Signed-in question loading. The unsigned free tier NEVER calls this — it
 * runs on build-time content passed as props. Paid reads are enforced
 * server-side by the deployed Firestore rules (isFree OR isPaid).
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDb } from './firebase';
import type { Question } from './quizEngine';

/** Paid practice pool: every SEED in a chapter. */
export async function loadChapterSeeds(chapter: number): Promise<Question[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(
    query(
      collection(db, 'questions'),
      where('chapter', '==', chapter),
      where('isSeed', '==', true),
    ),
  );
  const out: Question[] = [];
  snap.forEach((d) => out.push(d.data() as Question));
  return out;
}

/** Paid exam/mock pool: seeds + variations for a chapter. */
export async function loadChapterPool(chapter: number): Promise<Question[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, 'questions'), where('chapter', '==', chapter)),
  );
  const out: Question[] = [];
  snap.forEach((d) => out.push(d.data() as Question));
  return out;
}

/** Paid full-bank pool for the mock (all chapters, seeds + variations). */
export async function loadFullPool(): Promise<Question[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, 'questions'));
  const out: Question[] = [];
  snap.forEach((d) => out.push(d.data() as Question));
  return out;
}
