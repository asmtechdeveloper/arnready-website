/**
 * check-paid-leak — the validation gate required by the approved 10 Jul
 * constraints: PROVE that no paid question can enter generated HTML, JSON,
 * or client bundles.
 *
 * Three independent checks, all must pass:
 *   1. Structural: every record in content/questions/*.json has isFree===true.
 *   2. Paid IDs:   no paid question ID (from the gitignored manifest written
 *                  by export-content) appears in content/ or out/.
 *   3. Paid text:  no canonicalised paid-question fingerprint appears in any
 *                  build artefact — catches copies that dropped the ID, and
 *                  survives HTML entity-escaping/minification.
 *
 * Runs as part of `npm run build`. A missing manifest fails the gate — the
 * gate must never silently pass because the export step was skipped.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, '.leakcheck', 'paid-manifest.json');
const SCAN_DIRS = ['content', 'out'].map((d) => path.join(ROOT, d));
const SCAN_EXT = new Set(['.html', '.json', '.js', '.txt', '.xml', '.css', '.map']);

const canon = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

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

if (offences.length > 0) fail(offences.slice(0, 20).join('\n'));

console.log(
  `Paid-content leak gate PASSED — ${scanned} artefact(s) scanned against ` +
    `${paidIds.length} paid ids + ${paidFps.length} text fingerprints; ` +
    'exported question files structurally free-only.',
);
