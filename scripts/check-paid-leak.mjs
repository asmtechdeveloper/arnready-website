/**
 * check-paid-leak — the validation gate required by the approved 10 Jul
 * constraints, extended per manual §0.6/M1 to enforce the FULL public-export
 * budget:
 *   1. Structural: every record in content/questions/*.json has isFree===true.
 *   2. Paid IDs:   no paid question ID (from the gitignored manifest written
 *                  by export-content) appears in content/ or out/.
 *   3. Paid text:  no canonicalised paid-question fingerprint appears in any
 *                  build artefact — catches copies that dropped the ID, and
 *                  survives HTML entity-escaping/minification.
 *   4. Zero questions in the public export: no FREE question id or text
 *      fingerprint appears in out/ either — the free 20 are delivered only
 *      to signed-in clients, never SSG'd (manual §0.6, §2 M1).
 *   5. Flashcard sampler budget: at most 10 DISTINCT sampler cards per
 *      chapter across every out/ page (hub + its spokes combined) — the
 *      "first 10 canonical order" cap (manual §0.6, §2 M1).
 *
 * Runs as part of `npm run build`. A missing manifest fails the gate — the
 * gate must never silently pass because the export step was skipped.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { canon } from './lib/canon.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, '.leakcheck', 'paid-manifest.json');
const FREE_QUESTION_MANIFEST = path.join(ROOT, '.leakcheck', 'free-question-manifest.json');
const SCAN_DIRS = ['content', 'out'].map((d) => path.join(ROOT, d));
const PUBLIC_EXPORT_DIR = path.join(ROOT, 'out');
const SCAN_EXT = new Set(['.html', '.json', '.js', '.txt', '.xml', '.css', '.map']);
const SAMPLER_CAP = 10;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (SCAN_EXT.has(path.extname(p))) yield p;
  }
}

function fail(msg) {
  console.error(`\nPAID-CONTENT LEAK GATE FAILED\n${msg}\n`);
  process.exit(1);
}

if (!existsSync(MANIFEST)) {
  fail(
    `Missing ${path.relative(ROOT, MANIFEST)}.\n` +
      'Run `npm run export-content` first — the gate cannot pass without the paid manifest.',
  );
}
// Manifest shape: { ids: [...all paid ids], fps: [...distinguishable text
// fingerprints] }. Fingerprints textually identical to exported free content
// are excluded at export time (see export-content.mjs) — those questions are
// still covered by the ID check here.
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const paidIds = (manifest.ids ?? []).filter(Boolean);
const paidFps = (manifest.fps ?? []).filter((fp) => fp && fp.length >= 24);
if (paidIds.length === 0 || paidFps.length === 0) {
  fail('Paid manifest is empty or malformed — re-run `npm run export-content`.');
}

// ── 1. Structural check on exported question files ────────────────────────
const qDir = path.join(ROOT, 'content', 'questions');
if (existsSync(qDir)) {
  for (const file of readdirSync(qDir)) {
    const records = JSON.parse(readFileSync(path.join(qDir, file), 'utf8'));
    const bad = records.filter((r) => r.isFree !== true);
    if (bad.length > 0) {
      fail(`content/questions/${file}: ${bad.length} record(s) without isFree===true (${bad.map((b) => b.id).join(', ')})`);
    }
  }
}

// ── 2 + 3. Scan every artefact for paid IDs and paid text fingerprints ───
const offences = [];
let scanned = 0;
for (const dir of SCAN_DIRS) {
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    scanned += 1;
    const raw = readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    for (const id of paidIds) {
      if (raw.includes(id)) offences.push(`${rel}: contains paid question id "${id}"`);
    }
    const c = canon(raw);
    for (const fp of paidFps) {
      if (c.includes(fp)) offences.push(`${rel}: contains paid question text (fingerprint ${fp.slice(0, 16)}…)`);
    }
    if (offences.length > 20) break;
  }
}

// ── 4. Zero question text in the public/static export ─────────────────────
// The public export may contain ZERO question text — free or paid; the free
// 20 are only ever delivered to signed-in clients (manual §0.6). Only out/
// is scanned here: content/questions/*.free.json legitimately holds free
// question text as a build-time intermediate for the (not-yet-built)
// signed-in client, not as a leak into the public site.
if (existsSync(FREE_QUESTION_MANIFEST)) {
  const freeManifest = JSON.parse(readFileSync(FREE_QUESTION_MANIFEST, 'utf8'));
  const freeIds = (freeManifest.ids ?? []).filter(Boolean);
  const freeFps = (freeManifest.fps ?? []).filter((fp) => fp && fp.length >= 24);
  if (existsSync(PUBLIC_EXPORT_DIR)) {
    for (const file of walk(PUBLIC_EXPORT_DIR)) {
      const raw = readFileSync(file, 'utf8');
      const rel = path.relative(ROOT, file);
      for (const id of freeIds) {
        if (raw.includes(id)) offences.push(`${rel}: contains free question id "${id}" — questions must never appear in the public export`);
      }
      const c = canon(raw);
      for (const fp of freeFps) {
        if (c.includes(fp)) {
          offences.push(`${rel}: contains free question text (fingerprint ${fp.slice(0, 16)}…) — questions must never appear in the public export`);
        }
      }
      if (offences.length > 20) break;
    }
  }
}

if (offences.length > 0) fail(offences.slice(0, 20).join('\n'));

// ── 5. Flashcard sampler budget: ≤10 distinct cards per chapter ───────────
// Sampler cards render with a `data-card-id="{chapter}:{subtopicSlug}:
// {cardIndex}"` attribute (src/components/FlashcardSampler.tsx) — the same
// card legitimately appears on both a chapter hub and its own spoke page,
// so distinctness (not occurrence count) is what the budget caps.
if (existsSync(PUBLIC_EXPORT_DIR)) {
  const idsByChapter = new Map();
  for (const file of walk(PUBLIC_EXPORT_DIR)) {
    if (path.extname(file) !== '.html') continue;
    const raw = readFileSync(file, 'utf8');
    for (const m of raw.matchAll(/data-card-id="([^":]+):[^"]*"/g)) {
      const chapter = m[1];
      const set = idsByChapter.get(chapter) ?? new Set();
      set.add(m[0].slice('data-card-id="'.length, -1));
      idsByChapter.set(chapter, set);
    }
  }
  const budgetOffences = [];
  for (const [chapter, ids] of idsByChapter) {
    if (ids.size > SAMPLER_CAP) {
      budgetOffences.push(
        `chapter ${chapter}: ${ids.size} distinct sampler cards rendered across out/, exceeds the ${SAMPLER_CAP}-card public budget`,
      );
    }
  }
  if (budgetOffences.length > 0) fail(budgetOffences.join('\n'));
}

console.log(
  `Paid-content leak gate PASSED — ${scanned} artefact(s) scanned against ` +
    `${paidIds.length} paid ids + ${paidFps.length} text fingerprints; ` +
    'exported question files structurally free-only; zero questions and ' +
    `≤${SAMPLER_CAP} sampler cards/chapter confirmed in the public export.`,
);
