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
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { canon, fieldFingerprints } from './lib/canon.mjs';
import { computePublicBlobs, partitionFreeFieldFps } from './lib/freeManifestExclusion.mjs';
import { computeSamplerManifest } from './lib/samplerManifest.mjs';
import { EXPORT_BASENAME, stageGeneration, validateStagedGeneration, publishGeneration } from './lib/atomicExport.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const KEY_PATH =
  process.env.ARNREADY_SA_KEY ??
  path.resolve(ROOT, '../ARNReady-App/scripts/serviceAccountKey.json');

// M1-S6 (re-review hardening): both the content/ SSG source and the
// .leakcheck/ manifests are published UNDER ONE generation directory and made
// live by switching a single .export/current pointer atomically, so the two
// reader trees can never end up from different generations or be left missing
// on a crash — see scripts/lib/atomicExport.mjs.
const EXPORT_DIR = path.join(ROOT, EXPORT_BASENAME);

async function main() {
  const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
  initializeApp({ credential: cert(key) });
  const db = getFirestore();

  // Build into the inactive generation slot; the live generation is untouched
  // until the single atomic publish at the end succeeds.
  const stage = stageGeneration(EXPORT_DIR);
  const CONTENT_STAGE = stage.contentDir;
  const LEAK_STAGE = stage.leakDir;

  // ── Questions ──────────────────────────────────────────────────────────
  const qSnap = await db.collection('questions').get();
  const freeByChapter = new Map();
  const stats = new Map(); // chapter -> counters
  const paidManifest = []; // { id, fps: [...field-level fingerprints] } — never committed, never bundled

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
      paidManifest.push({ id: q.id, fps: fieldFingerprints(q) });
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
      path.join(CONTENT_STAGE, 'questions', `ch${String(ch).padStart(2, '0')}.free.json`),
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
      path.join(CONTENT_STAGE, 'flashcards', `ch${String(ch).padStart(2, '0')}.raw.json`),
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
    path.join(CONTENT_STAGE, 'chapter-stats.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), chapters: chapterStats }, null, 1),
  );

  // Approved teaching text + the canonical first-SAMPLER_SIZE sampler ONLY —
  // the actual "genuinely public" surface (see freeManifestExclusion.mjs's
  // doc). Used below to scope the paid-fingerprint exclusion for the out/
  // scan (Blocker 6) and, further down, for the free-question manifest.
  const publicBlobs = computePublicBlobs(rawByChapter);

  // Paid FIELD fingerprints are scanned against content/ and out/ with
  // DIFFERENT exclusion rules (Blocker 6) — using one shared exclusion for
  // both scopes let a paid fingerprint matching card 11+ (legitimately in
  // content/flashcards' full 732-card raw export, but NEVER in the public
  // out/ build, which only ever renders the first-10 sampler) get excluded
  // from the out/ scan too, hiding a real leak of non-public card text.
  //   - content/ legitimately contains the FULL raw flashcard deck and all
  //     free questions — a paid fp matching ANY of that is expected, not a
  //     leak, so its exclusion blob is broad (every exported free artefact).
  //   - out/ only ever renders approved teaching text and the canonical
  //     first-10 sampler — its exclusion blob is the narrow `publicBlobs`
  //     above, the same one the free-question manifest uses.
  const freeBlobs = [];
  for (const sub of ['questions', 'flashcards']) {
    const dir = path.join(CONTENT_STAGE, sub);
    for (const f of readdirSync(dir)) {
      freeBlobs.push(canon(readFileSync(path.join(dir, f), 'utf8')));
    }
  }
  const paidFieldFps = paidManifest.flatMap((m) => m.fps);
  const contentScannablePaidFps = paidFieldFps.filter((fp) => !freeBlobs.some((b) => b.includes(fp)));
  const publicScannablePaidFps = paidFieldFps.filter((fp) => !publicBlobs.some((b) => b.includes(fp)));
  const excludedFieldCountContent = paidFieldFps.length - contentScannablePaidFps.length;
  const excludedFieldCountPublic = paidFieldFps.length - publicScannablePaidFps.length;

  // ALL paid ids stay in the manifest; only indistinguishable field fps drop
  // out, per scope. check-paid-leak.mjs scans content/ with `contentFps` and
  // out/ with `publicFps`.
  writeFileSync(
    path.join(LEAK_STAGE, 'paid-manifest.json'),
    JSON.stringify({
      ids: paidManifest.map((m) => m.id).filter(Boolean),
      contentFps: contentScannablePaidFps,
      publicFps: publicScannablePaidFps,
    }),
  );

  // Free-question manifest: manual §0.6 requires ZERO question text — free
  // or paid — in the public/static export (the free 20 are delivered only
  // to signed-in clients, never SSG'd). check-paid-leak.mjs scans out/ for
  // these ids/fingerprints exactly as it does for the paid manifest, and
  // fails closed if this manifest is missing, empty, or malformed (Blocker
  // 3). Exclusion logic (approved teaching + first-SAMPLER_SIZE sampler
  // only — see that module's doc for why content/questions and the full
  // raw flashcard deck are both excluded from the comparison) lives in
  // scripts/lib/freeManifestExclusion.mjs so it is unit-testable without a
  // live Firestore credential.
  const freeManifestIds = [...freeByChapter.values()].flatMap((list) => list.map((q) => q.id));
  const { scannable: scannableFreeFps, excludedCount: excludedFreeFieldCount } = partitionFreeFieldFps(
    freeByChapter,
    publicBlobs,
  );

  writeFileSync(
    path.join(LEAK_STAGE, 'free-question-manifest.json'),
    JSON.stringify({ ids: freeManifestIds.filter(Boolean), fps: scannableFreeFps }),
  );

  // Canonical sampler manifest: the EXACT first-10-canonical-order card ids
  // each chapter's hub is allowed to render — check-paid-leak.mjs asserts
  // exact hub equality against this (not just a ≤10 count), so a regression
  // that renders the WRONG 10 cards (e.g. slice(10, 20)) is still caught.
  const samplerManifest = computeSamplerManifest(rawByChapter);
  writeFileSync(path.join(LEAK_STAGE, 'sampler-manifest.json'), JSON.stringify(samplerManifest));

  // M1-S6: the staged generation is complete — validate it, then publish it
  // with a SINGLE atomic pointer switch (both content/ and .leakcheck/ go live
  // together, or not at all). A half-written generation throws here and leaves
  // the previous export fully live; a published generation replaces it
  // wholesale, so a chapter dropped from Firestore cannot leave a stale
  // approved .raw.json (and its stale public route) behind.
  validateStagedGeneration(stage.contentDir, stage.leakDir);
  publishGeneration(ROOT, EXPORT_DIR, stage.slot);

  const freeTotal = [...freeByChapter.values()].reduce((n, l) => n + l.length, 0);
  console.log(
    `Exported ${freeTotal} free questions across ${freeByChapter.size} chapters, ` +
      `${[...flashcardTotals.values()].reduce((a, b) => a + b, 0)} flashcards, ` +
      `paid manifest: ${contentScannablePaidFps.length} content-scope + ${publicScannablePaidFps.length} public-scope field-level text fingerprints (gitignored)` +
      (excludedFieldCountContent > 0 || excludedFieldCountPublic > 0
        ? `; ${excludedFieldCountContent} paid field fingerprint(s) indistinguishable from full free content (content/ scope), ${excludedFieldCountPublic} indistinguishable from genuinely public teaching/sampler content (out/ scope) — both covered by the ID check only`
        : '') +
      `; free-question manifest: ${scannableFreeFps.length} field-level text fingerprints (gitignored)` +
      (excludedFreeFieldCount > 0
        ? `; ${excludedFreeFieldCount} free field fingerprint(s) textually indistinguishable from approved teaching/sampler content — covered by the ID check only.`
        : '.'),
  );
}

main().catch((err) => {
  console.error('export-content failed:', err.message);
  process.exit(1);
});
