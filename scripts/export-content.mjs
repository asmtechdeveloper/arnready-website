/**
 * export-content — build-time content pull from Firestore (the single content
 * source, per locked rules). Exports ONLY material a signed-out visitor is
 * entitled to see:
 *   - questions where isFree == true (the free seeds)
 *   - flashcards (always free, rules-enforced)
 *   - derived chapter statistics (counts only — no paid text)
 *
 * Paid material NEVER enters content/. As a second line of defence this
 * script also writes .leakcheck/paid-manifest.json (gitignored) — paid IDs +
 * canonicalised text fingerprints — which scripts/check-paid-leak.mjs greps
 * against every build artefact. See that file for the gate.
 *
 * Credentials: the service account key stays OUTSIDE this repo (app repo's
 * scripts/ workspace). Override with ARNREADY_SA_KEY=/path/to/key.json.
 */
import { readFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { canon, fingerprint } from './lib/canon.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const KEY_PATH =
  process.env.ARNREADY_SA_KEY ??
  path.resolve(ROOT, '../ARNReady-App/scripts/serviceAccountKey.json');

const CONTENT_DIR = path.join(ROOT, 'content');
const LEAK_DIR = path.join(ROOT, '.leakcheck');

async function main() {
  const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
  initializeApp({ credential: cert(key) });
  const db = getFirestore();

  mkdirSync(path.join(CONTENT_DIR, 'questions'), { recursive: true });
  mkdirSync(path.join(CONTENT_DIR, 'flashcards'), { recursive: true });
  mkdirSync(LEAK_DIR, { recursive: true });

  // ── Questions ──────────────────────────────────────────────────────────
  const qSnap = await db.collection('questions').get();
  const freeByChapter = new Map();
  const stats = new Map(); // chapter -> counters
  const paidManifest = []; // { id, fp } — never committed, never bundled

  qSnap.forEach((doc) => {
    const q = doc.data();
    const ch = Number(q.chapter);
    if (!Number.isFinite(ch)) return;

    const st = stats.get(ch) ?? {
      totalQuestions: 0,
      seedCount: 0,
      freeCount: 0,
      subtopics: new Set(),
    };
    st.totalQuestions += 1;
    if (q.isSeed) st.seedCount += 1;
    if (q.subtopic) st.subtopics.add(q.subtopic);

    if (q.isFree === true) {
      st.freeCount += 1;
      const list = freeByChapter.get(ch) ?? [];
      list.push({
        id: q.id,
        seedId: q.seedId ?? q.id,
        chapter: ch,
        subtopic: q.subtopic ?? 'General',
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation ?? '',
        difficulty: q.difficulty ?? 'medium',
        type: q.type ?? 'exam_core',
        isFree: true,
        isSeed: q.isSeed === true,
      });
      freeByChapter.set(ch, list);
    } else {
      paidManifest.push({ id: q.id, fp: fingerprint(q) });
    }
    stats.set(ch, st);
  });

  for (const [ch, list] of freeByChapter) {
    // Belt and braces: refuse to write anything not explicitly free.
    const offenders = list.filter((q) => q.isFree !== true);
    if (offenders.length > 0) {
      throw new Error(`Refusing export: non-free questions in ch${ch}`);
    }
    list.sort((a, b) => a.id.localeCompare(b.id));
    writeFileSync(
      path.join(CONTENT_DIR, 'questions', `ch${String(ch).padStart(2, '0')}.free.json`),
      JSON.stringify(list, null, 1),
    );
  }

  // ── Flashcards + chapter/subtopic teaching (always free — rules-enforced,
  // and public per manual §1: chapter/subtopic teaching + a 10-card sampler
  // are allowed on the unsigned public site) ─────────────────────────────
  // The 'flashcards' collection carries TWO doc shapes sharing one chapter
  // query, mirroring the app's fetchChapterFlashcardDocs boundary exactly:
  //   - subtopic docs: { chapter, subtopic, cards: [...] }        (docType-less)
  //   - ONE teaching doc per chapter: { docType: 'chapterTeaching', ... }
  // We export the RAW per-chapter doc array unmodified — normalization
  // (src/lib/teaching.ts, src/lib/flashcardDeck.ts, ported from the app's
  // services/flashcardTeaching.js + flashcardDeck.js) runs at page-build
  // time from this raw array, so the website never re-derives or
  // hand-rolls what counts as "malformed" or "canonical order".
  const fSnap = await db.collection('flashcards').get();
  const rawByChapter = new Map();
  fSnap.forEach((doc) => {
    const d = doc.data();
    const ch = Number(d.chapter);
    if (!Number.isFinite(ch)) return;
    const list = rawByChapter.get(ch) ?? [];
    list.push(d);
    rawByChapter.set(ch, list);
  });

  const flashcardTotals = new Map();
  for (const [ch, rawDocs] of rawByChapter) {
    // Card count for chapter-stats excludes teaching-metadata docs — a
    // docType doc has no `cards` array and must never inflate the count.
    const cardCount = rawDocs
      .filter((d) => d.docType == null)
      .reduce((n, d) => n + (d.cards?.length ?? 0), 0);
    flashcardTotals.set(ch, cardCount);
    writeFileSync(
      path.join(CONTENT_DIR, 'flashcards', `ch${String(ch).padStart(2, '0')}.raw.json`),
      JSON.stringify(rawDocs, null, 1),
    );
  }

  // ── Chapter stats (counts only) ────────────────────────────────────────
  const chapterStats = [...stats.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ch, st]) => ({
      chapter: ch,
      totalQuestions: st.totalQuestions,
      seedCount: st.seedCount,
      freeCount: st.freeCount,
      flashcardCount: flashcardTotals.get(ch) ?? 0,
      subtopics: [...st.subtopics].sort(),
    }));
  writeFileSync(
    path.join(CONTENT_DIR, 'chapter-stats.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), chapters: chapterStats }, null, 1),
  );

  // A paid fingerprint that already occurs in the exported FREE artefacts is
  // textually indistinguishable from public content (e.g. a paid variation
  // sharing its opening with a free seed, or a flashcard quoting the same
  // rule text). Matching it proves nothing about a paid leak, so it is
  // excluded from the text scan — the unique-ID check still covers those
  // questions. Everything else must stay absent from every build artefact.
  const freeBlobs = [];
  for (const sub of ['questions', 'flashcards']) {
    const dir = path.join(CONTENT_DIR, sub);
    for (const f of readdirSync(dir)) {
      freeBlobs.push(canon(readFileSync(path.join(dir, f), 'utf8')));
    }
  }
  const scannable = paidManifest.filter((m) => !freeBlobs.some((b) => b.includes(m.fp)));
  const excluded = paidManifest.length - scannable.length;

  // ALL paid ids stay in the manifest; only indistinguishable fps drop out.
  writeFileSync(
    path.join(LEAK_DIR, 'paid-manifest.json'),
    JSON.stringify({
      ids: paidManifest.map((m) => m.id).filter(Boolean),
      fps: scannable.map((m) => m.fp),
    }),
  );

  // Free-question manifest: manual §0.6 requires ZERO question text — free
  // or paid — in the public/static export (the free 20 are delivered only
  // to signed-in clients, never SSG'd). check-paid-leak.mjs scans out/ for
  // these ids/fingerprints exactly as it does for the paid manifest.
  const freeManifestIds = [];
  const freeManifestFps = [];
  for (const list of freeByChapter.values()) {
    for (const q of list) {
      freeManifestIds.push(q.id);
      freeManifestFps.push(fingerprint(q));
    }
  }
  writeFileSync(
    path.join(LEAK_DIR, 'free-question-manifest.json'),
    JSON.stringify({ ids: freeManifestIds.filter(Boolean), fps: freeManifestFps }),
  );

  const freeTotal = [...freeByChapter.values()].reduce((n, l) => n + l.length, 0);
  console.log(
    `Exported ${freeTotal} free questions across ${freeByChapter.size} chapters, ` +
      `${[...flashcardTotals.values()].reduce((a, b) => a + b, 0)} flashcards, ` +
      `paid manifest: ${scannable.length} text fingerprints (gitignored)` +
      (excluded > 0
        ? `; ${excluded} paid question(s) textually indistinguishable from free content — covered by the ID check only.`
        : '.'),
  );
}

main().catch((err) => {
  console.error('export-content failed:', err.message);
  process.exit(1);
});
