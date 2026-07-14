/**
 * check-paid-leak — the validation gate required by the approved 10 Jul
 * constraints, extended per manual §0.6/M1 to enforce the FULL public-export
 * budget:
 *   1. Structural: every record in content/questions/*.json has isFree===true.
 *   2. Paid IDs:   no paid question ID (from the gitignored manifest written
 *                  by export-content) appears in content/ or out/.
 *   3. Paid text:  no canonicalised paid-question FIELD fingerprint (stem,
 *                  each option, explanation — never concatenated, since
 *                  realistic rendered HTML inserts markup between fields)
 *                  appears in any build artefact — catches copies that
 *                  dropped the ID, stem-only/explanation-only leaks, and
 *                  survives HTML entity-escaping/minification. content/ and
 *                  out/ are scanned with DIFFERENT fingerprint sets
 *                  (`contentFps` vs `publicFps`): content/ legitimately
 *                  contains the full 732-card raw flashcard deck, but out/
 *                  only ever renders the canonical first-10 sampler — a
 *                  paid fp matching card 11+ must still be caught in out/
 *                  even though it is expected in content/ (Blocker 6).
 *   4. Zero questions in the public export: no FREE question id or text
 *      fingerprint appears in out/ either — the free 20 are delivered only
 *      to signed-in clients, never SSG'd (manual §0.6, §2 M1).
 *   5. Flashcard sampler correctness: each chapter's hub page renders
 *      EXACTLY the canonical first-10-order sampler card ids (no missing,
 *      no extras) and every spoke page renders a SUBSET of that same set —
 *      not merely "≤10 distinct ids", which a `.slice(10, 20)` regression
 *      would still satisfy while shipping the wrong cards (manual §0.6, §2
 *      M1).
 *
 * Runs as part of `npm run build`. A missing manifest fails the gate — the
 * gate must never silently pass because the export step was skipped.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { canon } from './lib/canon.mjs';
import { buildScanner, findMatches } from './lib/multiScan.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, '.leakcheck', 'paid-manifest.json');
const FREE_QUESTION_MANIFEST = path.join(ROOT, '.leakcheck', 'free-question-manifest.json');
const SAMPLER_MANIFEST = path.join(ROOT, '.leakcheck', 'sampler-manifest.json');
const CONTENT_DIR = path.join(ROOT, 'content');
const PUBLIC_EXPORT_DIR = path.join(ROOT, 'out');
const SCAN_EXT = new Set(['.html', '.json', '.js', '.txt', '.xml', '.css', '.map']);
const HUB_PATH = /^chapters\/(\d+)\.html$/;
const SPOKE_PATH = /^chapters\/(\d+)\/[^/]+\.html$/;

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
// Manifest shape: { ids: [...all paid ids], contentFps: [...FIELD-level
// fingerprints scoped to content/'s broad "full free export" exclusion],
// publicFps: [...FIELD-level fingerprints scoped to out/'s narrow
// "genuinely public" exclusion] } — see export-content.mjs (Blocker 6) for
// why these two scopes use different exclusion rules. A field fingerprint
// excluded from one scope's list is still covered by the ID check.
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const paidIds = (manifest.ids ?? []).filter(Boolean);
const contentPaidFps = (manifest.contentFps ?? []).filter((fp) => fp && fp.length >= 24);
const publicPaidFps = (manifest.publicFps ?? []).filter((fp) => fp && fp.length >= 24);
if (paidIds.length === 0 || contentPaidFps.length === 0 || publicPaidFps.length === 0) {
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
// content/ and out/ use different fingerprint sets (see the manifest-shape
// comment above) — the ID check applies identically to both, since a paid
// question's ID string should never legitimately appear anywhere.
// A single Rabin–Karp scanner per pattern set finds every match in one
// O(textlen) pass per artefact, instead of an O(patterns) `includes` sweep —
// the O(artefacts × patterns × textlen) original took ~90s on a real export
// and could be killed by a CI timeout before reporting (see lib/multiScan.mjs).
const offences = [];
let scanned = 0;
const paidIdScanner = buildScanner(paidIds);
for (const [dir, fps] of [
  [CONTENT_DIR, contentPaidFps],
  [PUBLIC_EXPORT_DIR, publicPaidFps],
]) {
  if (!existsSync(dir)) continue;
  const fpScanner = buildScanner(fps);
  for (const file of walk(dir)) {
    scanned += 1;
    const raw = readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    for (const id of findMatches(paidIdScanner, raw)) offences.push(`${rel}: contains paid question id "${id}"`);
    for (const fp of findMatches(fpScanner, canon(raw))) {
      offences.push(`${rel}: contains paid question text (fingerprint ${fp.slice(0, 16)}…)`);
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
//
// This manifest fails closed exactly like the paid one (Blocker 3): a
// missing, empty, or malformed free-question manifest must never let the
// gate silently skip check 4 and pass.
if (!existsSync(FREE_QUESTION_MANIFEST)) {
  fail(
    `Missing ${path.relative(ROOT, FREE_QUESTION_MANIFEST)}.\n` +
      'Run `npm run export-content` first — the gate cannot pass without the free-question manifest.',
  );
}
const freeManifest = JSON.parse(readFileSync(FREE_QUESTION_MANIFEST, 'utf8'));
const freeIds = (freeManifest.ids ?? []).filter(Boolean);
const freeFps = (freeManifest.fps ?? []).filter((fp) => fp && fp.length >= 24);
if (freeIds.length === 0 || freeFps.length === 0) {
  fail('Free-question manifest is empty or malformed — re-run `npm run export-content`.');
}
if (existsSync(PUBLIC_EXPORT_DIR)) {
  const freeIdScanner = buildScanner(freeIds);
  const freeFpScanner = buildScanner(freeFps);
  for (const file of walk(PUBLIC_EXPORT_DIR)) {
    const raw = readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    for (const id of findMatches(freeIdScanner, raw)) {
      offences.push(`${rel}: contains free question id "${id}" — questions must never appear in the public export`);
    }
    for (const fp of findMatches(freeFpScanner, canon(raw))) {
      offences.push(`${rel}: contains free question text (fingerprint ${fp.slice(0, 16)}…) — questions must never appear in the public export`);
    }
    if (offences.length > 20) break;
  }
}

if (offences.length > 0) fail(offences.slice(0, 20).join('\n'));

// ── 5. Flashcard sampler correctness: exact hub match + valid spoke subsets
// Sampler cards render with a `data-card-id="{chapter}:{subtopicSlug}:
// {cardIndex}"` attribute (src/components/FlashcardSampler.tsx). This fails
// closed exactly like the paid/free manifests: a missing, empty, or
// malformed sampler manifest must never let the gate silently skip this
// check and pass.
if (!existsSync(SAMPLER_MANIFEST)) {
  fail(
    `Missing ${path.relative(ROOT, SAMPLER_MANIFEST)}.\n` +
      'Run `npm run export-content` first — the gate cannot pass without the sampler manifest.',
  );
}
const samplerManifest = JSON.parse(readFileSync(SAMPLER_MANIFEST, 'utf8'));
// An empty manifest (zero published chapters) is a legitimate partial-
// rollout state, not malformed — only a non-object/array value is rejected.
if (typeof samplerManifest !== 'object' || samplerManifest === null || Array.isArray(samplerManifest)) {
  fail('Sampler manifest is malformed — re-run `npm run export-content`.');
}

if (existsSync(PUBLIC_EXPORT_DIR)) {
  const sampleOffences = [];
  const hubIdsByChapter = new Map(); // chapter -> Set<id>, from EXACTLY the hub page

  for (const file of walk(PUBLIC_EXPORT_DIR)) {
    if (path.extname(file) !== '.html') continue;
    const rel = path.relative(PUBLIC_EXPORT_DIR, file).split(path.sep).join('/');
    const hubMatch = rel.match(HUB_PATH);
    const spokeMatch = rel.match(SPOKE_PATH);
    if (!hubMatch && !spokeMatch) continue;

    const chapter = (hubMatch ?? spokeMatch)[1];
    const raw = readFileSync(file, 'utf8');
    const ids = new Set([...raw.matchAll(/data-card-id="([^"]+)"/g)].map((m) => m[1]));

    if (hubMatch) {
      const existing = hubIdsByChapter.get(chapter) ?? new Set();
      for (const id of ids) existing.add(id);
      hubIdsByChapter.set(chapter, existing);
    } else {
      // Spoke: every rendered card id must be a MEMBER of that chapter's
      // canonical sampler — anything else is a card outside the public
      // budget (e.g. a card beyond the first 10, or from the wrong chapter).
      const expected = new Set(samplerManifest[chapter] ?? []);
      for (const id of ids) {
        if (!expected.has(id)) {
          sampleOffences.push(
            `${path.relative(ROOT, file)}: renders card "${id}" that is not in chapter ${chapter}'s canonical sampler`,
          );
        }
      }
    }
  }

  // The hub must match its chapter's canonical sampler EXACTLY: no missing
  // card (an incomplete sampler) and no extra/unexpected card (a regression
  // like `.slice(10, 20)`, which would still pass a count-only check).
  for (const [chapter, expectedIds] of Object.entries(samplerManifest)) {
    const expected = new Set(expectedIds);
    const actual = hubIdsByChapter.get(chapter) ?? new Set();
    const missing = expectedIds.filter((id) => !actual.has(id));
    const unexpected = [...actual].filter((id) => !expected.has(id));
    if (missing.length > 0) {
      sampleOffences.push(`chapter ${chapter} hub: missing canonical sampler card(s): ${missing.join(', ')}`);
    }
    if (unexpected.length > 0) {
      sampleOffences.push(`chapter ${chapter} hub: renders unexpected card(s) outside the canonical sampler: ${unexpected.join(', ')}`);
    }
  }
  // A hub rendering cards for a chapter with no manifest entry (no published
  // teaching, per computeSamplerManifest) is itself unexpected.
  for (const [chapter, ids] of hubIdsByChapter) {
    if (!(chapter in samplerManifest) && ids.size > 0) {
      sampleOffences.push(`chapter ${chapter} hub: renders sampler card(s) but has no sampler-manifest entry (no published teaching expected)`);
    }
  }

  if (sampleOffences.length > 0) fail(sampleOffences.join('\n'));
}

console.log(
  `Paid-content leak gate PASSED — ${scanned} artefact(s) scanned against ` +
    `${paidIds.length} paid ids + ${contentPaidFps.length} content-scope/${publicPaidFps.length} public-scope text fingerprints; ` +
    'exported question files structurally free-only; zero questions and an ' +
    'exact canonical flashcard sampler confirmed in the public export.',
);
