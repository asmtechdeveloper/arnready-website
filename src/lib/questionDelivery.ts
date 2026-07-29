/**
 * questionDelivery — browser-only, signed-in-only runtime delivery of quiz
 * questions and flashcard decks (M5 plan D3).
 *
 * QUERIES ARE PORTED VERBATIM from ../ARNReady-App/screens/QuizScreen.js and
 * ../ARNReady-App/services/flashcardDeck.js — the collection, the filters,
 * and their values match exactly; only the CALL STYLE differs, because the
 * app uses the React Native namespaced Firestore API
 * (`firestore().collection(...).where(...).get()`) and the web uses the
 * modular Web SDK (`collection`, `query`, `where`, `getDocs`):
 *
 *   - practice, free:  chapter == N, isSeed == true, isFree == true
 *                      (QuizScreen.js:153-157,162) then
 *                      capFreeQuestionSet(docs, FREE_QUESTIONS_PER_CHAPTER)
 *                      → orderPracticeSet(_, {isPaid:false})
 *   - practice, paid:  chapter == N, isSeed == true (QuizScreen.js:153-156)
 *                      then orderPracticeSet(docs, {isPaid:true})
 *   - exam, free:      chapter == N, isSeed == true, isFree == true
 *                      (QuizScreen.js:219-226) then
 *                      capFreeQuestionSet(docs, FREE_QUESTIONS_PER_CHAPTER)
 *                      → drawExamSet(_, {isPaid:false, examSize:30})
 *   - exam, paid:      chapter == N (QuizScreen.js:212-217) then
 *                      drawExamSet(docs, {isPaid:true, examSize:30})
 *   - flashcards:      flashcards where chapter == N
 *                      (../ARNReady-App/services/flashcardDeck.js:104-107)
 *                      then buildCanonicalDeck(rawDocs, N)
 *
 * `capFreeQuestionSet` / `orderPracticeSet` / `drawExamSet` are imported from
 * `./quizEngine` (S1) and `FREE_QUESTIONS_PER_CHAPTER` from `./nudgeGates`
 * (M2) — NO constant is redefined here. `EXAM_SIZE` below is the app's
 * `CONFIG.EXAM_QUESTIONS` (30), passed explicitly at each exam call site
 * exactly as the plan requires (manual §0.10, M5 plan D3/D4): it is a literal
 * call-site argument, not a second definition of a locked constant.
 *
 * NO IMPORT FROM `content/` (no `content/questions`, no `content/flashcards`)
 * anywhere in this module. The build-time static export must never reach a
 * client bundle carrying question text (manual §0.5/§0.6, M5 plan D3/D12) —
 * question text in `out/` is a milestone-failing leak. This module is how the
 * signed-in browser fetches question/flashcard content LIVE from Firestore
 * instead, behind the deployed rules that gate `isFree == true` reads for
 * unpaid users and full-bank reads behind `isPaid == true`.
 *
 * `isPaid` IS A REQUIRED PARAMETER, supplied by the caller from the M3
 * entitlement store (`useEntitlement`, `./entitlementStore`). This module
 * does not import that store, does not read the Firestore `isPaid` field on
 * any document, and does not default, derive, guess, or fall back to a value
 * for it on any branch (manual §0.9) — every function below only asks "given
 * the caller's isPaid, which query / cap / order / draw applies".
 *
 * A FAILED READ IS AN ERROR, NEVER AN EMPTY SET — ported from QuizScreen.js's
 * `loadFailed` policy (QuizScreen.js:139-141,164-167,235-238: "a failed load
 * is an ERROR, never an empty set"). Modelled here as a discriminated result
 * (`{status:'ok', ...} | {status:'error', reason}`) rather than a thrown
 * exception: this repo's `src/lib` modules already favour explicit
 * fail-closed return values over throwing (`firebaseClient.ts` returns
 * `null` when unavailable, `progressBackend.ts` returns `undefined` for a
 * missing document), and a discriminated union makes the two states the plan
 * requires be kept apart — "the read failed" vs. "this chapter genuinely has
 * no questions" — impossible to confuse at the type level: callers must
 * branch on `status` before touching `questions`/`deck`, so an `ok` result
 * with an empty array can only mean a real empty chapter, never a swallowed
 * failure.
 *
 * Browser-safe: no `node:` imports, no `fs`, no `process`.
 */
import {
  collection,
  type Firestore,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { type CanonicalDeck, buildCanonicalDeck, type RawSectionDoc } from './flashcardDeck';
import { getDb } from './firebaseClient';
import { FREE_QUESTIONS_PER_CHAPTER } from './nudgeGates';
import {
  capFreeQuestionSet,
  drawExamSet,
  orderPracticeSet,
  type Question,
} from './quizEngine';

/** App `CONFIG.EXAM_QUESTIONS` (QuizScreen.js:234) — passed explicitly, never redefined (D3). */
const EXAM_SIZE = 30;

export type QuestionsResult =
  | { status: 'ok'; questions: Question[] }
  | { status: 'error'; reason: string };

export type DeckResult =
  | { status: 'ok'; deck: CanonicalDeck }
  | { status: 'error'; reason: string };

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'unknown-error';
}

/** The free-tier query shape shared by practice and exam: QuizScreen.js:220-225. */
function freeConstraints(chapter: number) {
  return [
    where('chapter', '==', chapter),
    where('isSeed', '==', true),
    where('isFree', '==', true),
  ] as const;
}

async function readQuestions(
  db: Firestore,
  constraints: readonly ReturnType<typeof where>[],
): Promise<Question[]> {
  const snap = await getDocs(query(collection(db, 'questions'), ...constraints));
  return snap.docs.map((d) => d.data() as Question);
}

/**
 * Practice Mode question set. Ported query shapes: QuizScreen.js:153-163.
 */
export async function fetchPracticeQuestions(
  chapter: number,
  isPaid: boolean,
): Promise<QuestionsResult> {
  const db = getDb();
  if (!db) return { status: 'error', reason: 'firestore-unavailable' };
  try {
    const constraints = isPaid
      ? ([where('chapter', '==', chapter), where('isSeed', '==', true)] as const)
      : freeConstraints(chapter);
    const docs = await readQuestions(db, constraints);
    const accessible = isPaid ? docs : capFreeQuestionSet(docs, FREE_QUESTIONS_PER_CHAPTER);
    const questions = orderPracticeSet(accessible, { isPaid });
    return { status: 'ok', questions };
  } catch (error) {
    return { status: 'error', reason: describeError(error) };
  }
}

/**
 * Exam Mode question set. Ported query shapes: QuizScreen.js:210-234.
 */
export async function fetchExamQuestions(
  chapter: number,
  isPaid: boolean,
): Promise<QuestionsResult> {
  const db = getDb();
  if (!db) return { status: 'error', reason: 'firestore-unavailable' };
  try {
    const constraints = isPaid ? ([where('chapter', '==', chapter)] as const) : freeConstraints(chapter);
    const docs = await readQuestions(db, constraints);
    const accessible = isPaid ? docs : capFreeQuestionSet(docs, FREE_QUESTIONS_PER_CHAPTER);
    const questions = drawExamSet(accessible, { isPaid, examSize: EXAM_SIZE });
    return { status: 'ok', questions };
  } catch (error) {
    return { status: 'error', reason: describeError(error) };
  }
}

/**
 * Flashcard deck for a chapter, both tiers. Ported query shape:
 * ../ARNReady-App/services/flashcardDeck.js:104-107. The canonical
 * ordering/entitlement-exclusion logic is `buildCanonicalDeck` (imported from
 * `./flashcardDeck`, itself a thin typed re-export of
 * `scripts/lib/canonicalDeck.mjs`) — never re-implemented here.
 */
export async function fetchFlashcardDeck(chapter: number): Promise<DeckResult> {
  const db = getDb();
  if (!db) return { status: 'error', reason: 'firestore-unavailable' };
  try {
    const snap = await getDocs(query(collection(db, 'flashcards'), where('chapter', '==', chapter)));
    const rawDocs = snap.docs.map((d) => d.data() as RawSectionDoc);
    const deck = buildCanonicalDeck(rawDocs, chapter);
    return { status: 'ok', deck };
  } catch (error) {
    return { status: 'error', reason: describeError(error) };
  }
}
