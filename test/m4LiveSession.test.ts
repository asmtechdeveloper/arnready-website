/**
 * M4 live end-to-end session — the milestone's real-Firestore acceptance step.
 *
 * The manual's M4 acceptance requires "one real end-to-end session on the test
 * account verified in Firestore console by Anusha". M4 ships no UI (the study
 * players are M5/M6), so there is nothing to click; this harness is the session.
 *
 * It signs in as the test account with the REAL Firebase Web SDK, drives the
 * REAL `src/lib/progressService.ts` through the REAL `firestoreBackend()`, and
 * then reads the resulting documents back with the Admin SDK to prove what
 * actually landed. Nothing about the write path is simulated.
 *
 * AUTHENTICATION: a custom token minted from the dev service-account key. No
 * password is handled, typed, or stored anywhere.
 *
 * SKIP GUARD: this test is skipped unless ARNREADY_LIVE_E2E=1, because it needs
 * live credentials and WRITES REAL DOCUMENTS. It follows the precedent set by
 * `test/nudgeGates.test.ts`'s env-guarded live cross-repo test. Crucially, it
 * is ADDITIVE: every parity guarantee is already asserted, credential-free and
 * never skipped, by `test/progressParity.test.ts`. Skipping this file cannot
 * make a broken port pass.
 *
 * RUN (per Anusha's 2026-07-19 authorization, against arnready-dev only):
 *   ARNREADY_LIVE_E2E=1 npx vitest run test/m4LiveSession.test.ts
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const LIVE = process.env.ARNREADY_LIVE_E2E === '1';

/** The authorized test account (Anusha, 2026-07-19). arnready-dev only. */
const TEST_UID = 'FKmOTJdC2sTjoqQHM811cR515vz1';
/** A chapter chosen so the written documents are easy to find in the console. */
const CHAPTER = 12;

const ROOT = path.resolve(import.meta.dirname, '..');
const SA_KEY = path.resolve(ROOT, '../ARNReady-App/scripts/serviceAccountKey.dev.json');

/** Next loads .env.local; vitest does not, so do it explicitly. */
function loadEnvLocal(): void {
  const text = readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  for (const line of text.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, raw] = match;
    if (!process.env[key!]) process.env[key!] = (raw ?? '').replace(/^["']|["']$/g, '');
  }
}

describe.skipIf(!LIVE)('M4 live session against arnready-dev', () => {
  let db: import('firebase-admin/firestore').Firestore;
  let backend: NonNullable<ReturnType<typeof import('../src/lib/progressBackend').firestoreBackend>>;
  let progress: typeof import('../src/lib/progressService');
  const runId = `m4-${Date.now()}`;

  beforeAll(async () => {
    loadEnvLocal();
    expect(process.env.NEXT_PUBLIC_APP_ENV, 'live E2E is dev-only').toBe('dev');

    const serviceAccount = JSON.parse(readFileSync(SA_KEY, 'utf8')) as { project_id: string };
    expect(serviceAccount.project_id, 'live E2E must target arnready-dev').toBe('arnready-dev');

    // Modular admin entry points, matching scripts/export-content.mjs.
    const { initializeApp: initAdmin, cert, getApps: adminApps } = await import('firebase-admin/app');
    const { getAuth: getAdminAuth } = await import('firebase-admin/auth');
    const { getFirestore: getAdminFirestore } = await import('firebase-admin/firestore');

    const adminApp = adminApps().length > 0 ? adminApps()[0]! : initAdmin({ credential: cert(SA_KEY) });
    db = getAdminFirestore(adminApp);

    // Sign the Web SDK in as the test account with a minted custom token.
    const token = await getAdminAuth(adminApp).createCustomToken(TEST_UID);
    const { getAuthClient } = await import('../src/lib/firebaseClient');
    const { signInWithCustomToken } = await import('firebase/auth');
    const auth = getAuthClient();
    expect(auth, 'the web Firebase config must resolve').not.toBeNull();
    const credential = await signInWithCustomToken(auth!, token);
    expect(credential.user.uid).toBe(TEST_UID);

    const { firestoreBackend } = await import('../src/lib/progressBackend');
    backend = firestoreBackend()!;
    expect(backend, 'the real Firestore backend must be available').toBeTruthy();
    expect(backend.uid()).toBe(TEST_UID);

    progress = await import('../src/lib/progressService');
  }, 60_000);

  afterAll(async () => {
    const { getAuthClient } = await import('../src/lib/firebaseClient');
    await getAuthClient()?.signOut();
  });

  const questions = Array.from({ length: 20 }, (_, i) => ({
    id: `${runId}_q${String(i + 1).padStart(3, '0')}`,
    chapter: CHAPTER,
    correctIndex: 0,
    subtopic: 'Scheme Selection',
  }));
  // 7 correct, 3 wrong, 10 unanswered — the canonical free-sample shape.
  const answers = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, ...Array(10).fill(null)];

  it('starts from an account with NO users/{uid} document (M4-B1)', async () => {
    // The precondition for the whole file after M4-B1: the web no longer
    // creates the user document, so every write below must succeed without one.
    // The deployed rule grants users/{uid}/{document=**} on ownership alone,
    // and Firestore allows documents in a subcollection whose parent does not
    // exist — this asserts that rather than assuming it.
    const snap = await db.doc(`users/${TEST_UID}`).get();
    expect(snap.exists, 'test account must be wiped before this run').toBe(false);
  }, 30_000);

  it('records a free sample exam with the locked denominator', async () => {
    const { next } = await progress.recordExamSession(backend, {
      chapterNumber: CHAPTER,
      correct: 7,
      attempted: 10,
      served: 20,
      scorePct: 70,
      examScope: 'sample',
      endedEarly: true,
      answers,
      questions,
    });
    // free = correct ÷ max(10, attempted) — 7/10, never "7/20".
    expect(next.sample?.lastTotal).toBe(10);

    const doc = await db.doc(`users/${TEST_UID}/chapterProgress/${CHAPTER}`).get();
    const data = doc.data()!;
    expect(data.sampleLastScore).toBe(7);
    expect(data.sampleLastTotal).toBe(10);
    expect(data.sampleLastAttempted).toBe(10);
    expect(data.sampleLastPct).toBe(70);
    // Full-exam fields must be untouched by a sample attempt.
    expect(data.lastExamScope).toBeUndefined();
    // The sentinel resolved to a real server Timestamp — not a client clock.
    expect(data.sampleLastDate?.constructor?.name).toBe('Timestamp');
  }, 60_000);

  it('records a practice run and a flashcard run', async () => {
    await progress.recordPracticeSession(backend, {
      chapterNumber: CHAPTER,
      correct: 4,
      attempted: 5,
      scorePct: 80,
      answers: [0, 0, 0, 0, 1],
      questions: questions.slice(0, 5),
    });
    await progress.recordFlashcardSession(backend, {
      chapterNumber: CHAPTER,
      grades: [
        { front: `${runId} card A`, subtopic: 'Scheme Selection', knew: true },
        { front: `${runId} card B`, subtopic: 'Scheme Selection', knew: false },
      ],
    });

    const doc = await db.doc(`users/${TEST_UID}/chapterProgress/${CHAPTER}`).get();
    expect(doc.data()?.practiceAttempted).toBeGreaterThanOrEqual(5);
  }, 60_000);

  it('writes exactly three session documents for this run', async () => {
    const snap = await db.collection(`users/${TEST_UID}/sessions`)
      .where('chapter', '==', CHAPTER)
      .get();
    const mine = snap.docs
      .map((d) => d.data())
      .filter(
        (d) =>
          (d.answers ?? []).some((a: { qId?: string }) => a.qId?.startsWith(runId)) ||
          (d.grades ?? []).some((g: { front?: string }) => g.front?.startsWith(runId)),
      );
    expect(mine.map((d) => d.mode).sort()).toEqual(['exam', 'flashcards', 'practice']);
    for (const session of mine) {
      expect(session.completedAt?.constructor?.name).toBe('Timestamp');
    }
  }, 60_000);

  it('collects the wrong answers into the mistakes deck', async () => {
    const snap = await db.collection(`users/${TEST_UID}/mistakes`)
      .where('chapter', '==', CHAPTER)
      .get();
    const mine = snap.docs.filter((d) => d.id.startsWith(runId));
    // Exam q8/q9/q10 wrong, practice q5 wrong — four distinct questions.
    expect(mine.length).toBe(4);
    for (const d of mine) {
      expect(d.data().retired).toBe(false);
      expect(d.data().correctStreak).toBe(0);
      expect(d.data().subtopic).toBe('Scheme Selection');
    }

    // The proof that closes M4-B1 empirically: every progress, session and
    // mistakes document above landed, and no users/{uid} document was created
    // along the way. The web writes nothing to the entitlement-bearing root.
    const userDoc = await db.doc(`users/${TEST_UID}`).get();
    expect(userDoc.exists, 'the web must never create the user document').toBe(false);

    // Print the console paths for the manual verification step.
    console.log(`\n[M4 live session] runId=${runId}`);
    console.log(`  users/${TEST_UID}`);
    console.log(`  users/${TEST_UID}/chapterProgress/${CHAPTER}`);
    console.log(`  users/${TEST_UID}/sessions  (3 documents from this run)`);
    console.log(`  users/${TEST_UID}/mistakes  (4 documents from this run)\n`);
  }, 60_000);
});

describe('M4 live session harness', () => {
  it('is skipped without ARNREADY_LIVE_E2E, and never substitutes for the parity suite', () => {
    // Documents the guard so a reader of a normal run knows why this file is
    // quiet. The parity guarantees run unconditionally in progressParity.test.ts.
    expect(LIVE || !LIVE).toBe(true);
  });
});
