import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fieldFingerprints } from '../scripts/lib/canon.mjs';

/**
 * check-paid-leak.mjs is a load-bearing script (kept as-is per the manual)
 * that always scans content/ + out/ + .leakcheck/paid-manifest.json
 * relative to its OWN file location (`import.meta.dirname`), not the
 * process cwd — it isn't parameterizable. These tests are intentionally
 * credential-independent: they exercise the gate's own logic against
 * synthetic fixtures rather than a live Firestore export, so they run the
 * same way whether or not a service-account key is configured. To do that
 * without touching this repo's real (gitignored) content/.leakcheck/out
 * directories — which a real build may be using concurrently — each test
 * copies the script into a fresh, unique temp directory (so the script's
 * own ROOT resolves there) and runs it from that isolated copy.
 */
const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPT_SRC = path.join(REPO_ROOT, 'scripts', 'check-paid-leak.mjs');
const LIB_SRC = path.join(REPO_ROOT, 'scripts', 'lib', 'canon.mjs');
const MULTISCAN_SRC = path.join(REPO_ROOT, 'scripts', 'lib', 'multiScan.mjs');

let tempRoot: string;

function paths() {
  return {
    content: path.join(tempRoot, 'content'),
    leak: path.join(tempRoot, '.leakcheck'),
    out: path.join(tempRoot, 'out'),
    manifest: path.join(tempRoot, '.leakcheck', 'paid-manifest.json'),
    freeManifest: path.join(tempRoot, '.leakcheck', 'free-question-manifest.json'),
    samplerManifest: path.join(tempRoot, '.leakcheck', 'sampler-manifest.json'),
  };
}

/** An empty-but-valid sampler manifest — zero published chapters, nothing to check. */
function writeInertSamplerManifest(p: ReturnType<typeof paths>) {
  writeFileSync(p.samplerManifest, JSON.stringify({}));
}

/**
 * Writes an innocuous, valid free-question manifest — the free manifest now
 * fails closed (Blocker 3), so every test that isn't specifically exercising
 * that behavior needs one present, with fps that won't coincidentally match
 * anything the test itself writes to out/.
 */
function writeInertFreeManifest(p: ReturnType<typeof paths>) {
  writeFileSync(p.freeManifest, JSON.stringify({ ids: ['inert-free-q'], fps: ['z'.repeat(24)] }));
}

function run() {
  try {
    const stdout = execFileSync('node', [path.join('scripts', 'check-paid-leak.mjs')], {
      cwd: tempRoot,
      encoding: 'utf8',
    });
    return { code: 0, stdout };
  } catch (err) {
    const e = err as { status: number; stdout: string; stderr: string };
    return { code: e.status, stdout: e.stdout, stderr: e.stderr };
  }
}

describe('check-paid-leak.mjs (leak gate)', () => {
  beforeEach(() => {
    tempRoot = mkdtempSync(path.join(tmpdir(), 'arnready-leak-gate-'));
    mkdirSync(path.join(tempRoot, 'scripts', 'lib'), { recursive: true });
    copyFileSync(SCRIPT_SRC, path.join(tempRoot, 'scripts', 'check-paid-leak.mjs'));
    copyFileSync(LIB_SRC, path.join(tempRoot, 'scripts', 'lib', 'canon.mjs'));
    copyFileSync(MULTISCAN_SRC, path.join(tempRoot, 'scripts', 'lib', 'multiScan.mjs'));
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('fails closed when the paid manifest is missing', () => {
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/Missing .*paid-manifest\.json/);
  });

  it('fails when a free question record is missing isFree:true', () => {
    const p = paths();
    mkdirSync(path.join(p.content, 'questions'), { recursive: true });
    mkdirSync(p.leak, { recursive: true });
    writeFileSync(
      path.join(p.content, 'questions', 'ch01.free.json'),
      JSON.stringify([{ id: 'q1', isFree: false }]),
    );
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-q-1'], contentFps: ['a'.repeat(24)], publicFps: ['a'.repeat(24)] }));
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/without isFree===true/);
  });

  it('fails when a paid question id leaks into the static export', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], contentFps: ['a'.repeat(24)], publicFps: ['a'.repeat(24)] }));
    writeInertFreeManifest(p);
    writeFileSync(path.join(p.out, 'leak.html'), '<div>paid-secret-id</div>');
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains paid question id/);
  });

  it('fails when paid question text (fingerprint) leaks into the static export', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    const fp = 'thisisapaidquestionfingerprintxyz123';
    writeFileSync(p.manifest, JSON.stringify({ ids: ['pid-1'], contentFps: [fp], publicFps: [fp] }));
    writeInertFreeManifest(p);
    writeFileSync(path.join(p.out, 'leak.html'), `<div>${fp}</div>`);
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains paid question text/);
  });

  it('catches an HTML-entity-escaped paid fingerprint (M0-D1 entity normalization fix)', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    // Plain text "P&L Impact" canonicalises to "plimpact"; an XML/HTML
    // escaped copy ("P&amp;L Impact") must canonicalise to the SAME string,
    // not "pampllimpact", or the entity-escaped leak would evade detection.
    writeFileSync(p.manifest, JSON.stringify({ ids: ['pid-1'], contentFps: ['plimpactonnavcalculationsxyz'], publicFps: ['plimpactonnavcalculationsxyz'] }));
    writeInertFreeManifest(p);
    writeFileSync(path.join(p.out, 'leak.xml'), '<q>P&amp;L Impact On Nav Calculations Xyz</q>');
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains paid question text/);
  });

  it('catches a DOUBLE-escaped paid fingerprint (M1-B2 fix — React/Next can escape already-escaped source text)', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    // Plain text "P&L Impact" canonicalises to "plimpact". A SINGLE escape
    // pass ("P&amp;L Impact") was already covered above; this fixture is
    // escaped TWICE ("P&amp;amp;L Impact" — the literal "&" in "&amp;" got
    // escaped again), reproducing the M1-B2 defect where a single decode
    // pass left it as "&amp;" (still escaped) instead of fully resolving.
    writeFileSync(p.manifest, JSON.stringify({ ids: ['pid-1'], contentFps: ['plimpactonnavcalculationsxyz'], publicFps: ['plimpactonnavcalculationsxyz'] }));
    writeInertFreeManifest(p);
    writeFileSync(path.join(p.out, 'leak.xml'), '<q>P&amp;amp;L Impact On Nav Calculations Xyz</q>');
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains paid question text/);
  });

  // ── Blocker 6: content/ and out/ scan with DIFFERENT paid-fingerprint
  // exclusion scopes — a fp legitimately excluded from content/'s broad
  // "full free export" scope (because it matches card 11+ of the full
  // 732-card raw deck) must NOT be excluded from out/'s narrow "genuinely
  // public" scope (which only ever renders the first-10 sampler).
  describe('paid manifest: content/ vs out/ use different exclusion scopes', () => {
    it('fails when a paid fingerprint matching a non-public card (card 11+) leaks into out/, even though it is legitimately absent from content/\'s scan list', () => {
      const p = paths();
      mkdirSync(p.leak, { recursive: true });
      mkdirSync(p.out, { recursive: true });
      const card11Fp = 'thistextonlyexistsonflashcardnumbereleven';
      // export-content.mjs would exclude this fp from contentFps (it
      // legitimately matches content/flashcards' full raw deck) but keep it
      // in publicFps (card 11 is never part of the public first-10 sampler).
      // contentFps still needs a harmless placeholder — an empty list itself
      // fails closed (correctly), which isn't what this test is exercising.
      writeFileSync(
        p.manifest,
        JSON.stringify({ ids: ['pid-1'], contentFps: ['z'.repeat(24)], publicFps: [card11Fp] }),
      );
      writeInertFreeManifest(p);
      writeFileSync(path.join(p.out, 'leak.html'), `<div>${card11Fp}</div>`);
      const result = run();
      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/contains paid question text/);
    });

    it('does not flag a paid fingerprint in content/ that is absent from contentFps but present in publicFps (content/ uses its own scoped list)', () => {
      const p = paths();
      mkdirSync(path.join(p.content, 'questions'), { recursive: true });
      mkdirSync(p.leak, { recursive: true });
      mkdirSync(p.out, { recursive: true });
      const publicOnlyFp = 'thistextexistsintheapprovedpublicteachingblob';
      // Simulates a fp that is scannable for out/ (publicFps) but was
      // correctly excluded from contentFps because content/ legitimately
      // contains it (e.g. inside the full raw flashcard export) — content/
      // must not be scanned with publicFps's stricter list. contentFps
      // still needs a harmless placeholder (an empty list fails closed).
      writeFileSync(
        p.manifest,
        JSON.stringify({ ids: ['pid-1'], contentFps: ['z'.repeat(24)], publicFps: [publicOnlyFp] }),
      );
      writeInertFreeManifest(p);
      writeInertSamplerManifest(p);
      writeFileSync(
        path.join(p.content, 'questions', 'ch01.free.json'),
        JSON.stringify([{ id: 'free-q-1', isFree: true }]),
      );
      writeFileSync(path.join(p.content, 'flashcards-fixture.txt'), publicOnlyFp);
      writeFileSync(path.join(p.out, 'index.html'), '<div>clean public page</div>');
      const result = run();
      expect(result.code).toBe(0);
    });
  });

  // Realistic rendered HTML puts markup BETWEEN a question's fields
  // (`<p>{stem}</p><li>{option}</li>`), so a single fingerprint requiring
  // stem+options contiguous never matches real output. These fixtures use
  // the actual field-level fingerprints export-content.mjs now writes.
  const sampleQuestion = {
    question: 'This realistic exam stem describes a mutual fund distributor obligation under the SEBI code of conduct',
    options: [
      'This option states the correct regulatory obligation for mutual fund distributors under SEBI rules',
      'This option states an incorrect alternative regulatory framework that does not apply in this case',
    ],
    explanation: 'The correct answer follows from the SEBI regulatory obligation for mutual fund distributors explained above',
  };
  const sampleFps = fieldFingerprints(sampleQuestion);

  it('catches a normally marked-up paid question (fields separated by real HTML tags)', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(p.manifest, JSON.stringify({ ids: ['pid-1'], contentFps: sampleFps, publicFps: sampleFps }));
    writeInertFreeManifest(p);
    const markup =
      `<p>${sampleQuestion.question}</p>` +
      `<ul><li>${sampleQuestion.options[0]}</li><li>${sampleQuestion.options[1]}</li></ul>` +
      `<p>${sampleQuestion.explanation}</p>`;
    writeFileSync(path.join(p.out, 'leak.html'), markup);
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains paid question text/);
  });

  it('catches a normally marked-up free question (fields separated by real HTML tags)', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], contentFps: ['a'.repeat(24)], publicFps: ['a'.repeat(24)] }));
    writeFileSync(
      path.join(p.leak, 'free-question-manifest.json'),
      JSON.stringify({ ids: ['free-q-1'], fps: sampleFps }),
    );
    const markup =
      `<p>${sampleQuestion.question}</p>` +
      `<ul><li>${sampleQuestion.options[0]}</li><li>${sampleQuestion.options[1]}</li></ul>` +
      `<p>${sampleQuestion.explanation}</p>`;
    writeFileSync(path.join(p.out, 'chapters.html'), markup);
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains free question text/);
  });

  it('catches a stem-only leak (options and explanation absent from the page)', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(p.manifest, JSON.stringify({ ids: ['pid-1'], contentFps: sampleFps, publicFps: sampleFps }));
    writeInertFreeManifest(p);
    writeFileSync(path.join(p.out, 'leak.html'), `<p>${sampleQuestion.question}</p>`);
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains paid question text/);
  });

  it('catches an explanation-only leak (stem and options absent from the page)', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(p.manifest, JSON.stringify({ ids: ['pid-1'], contentFps: sampleFps, publicFps: sampleFps }));
    writeInertFreeManifest(p);
    writeFileSync(path.join(p.out, 'leak.html'), `<p>${sampleQuestion.explanation}</p>`);
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains paid question text/);
  });

  it('fails when a free question id leaks into the public export', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], contentFps: ['a'.repeat(24)], publicFps: ['a'.repeat(24)] }));
    writeFileSync(
      path.join(p.leak, 'free-question-manifest.json'),
      JSON.stringify({ ids: ['free-q-1'], fps: ['b'.repeat(24)] }),
    );
    writeFileSync(path.join(p.out, 'chapters.html'), '<div>free-q-1</div>');
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains free question id.*must never appear in the public export/);
  });

  it('fails when a free question text fingerprint leaks into the public export', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    const fp = 'thisisafreequestionfingerprintabc123';
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], contentFps: ['a'.repeat(24)], publicFps: ['a'.repeat(24)] }));
    writeFileSync(path.join(p.leak, 'free-question-manifest.json'), JSON.stringify({ ids: ['free-q-1'], fps: [fp] }));
    writeFileSync(path.join(p.out, 'chapters.html'), `<div>${fp}</div>`);
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains free question text/);
  });

  it('passes when the public export has no question text at all', () => {
    const p = paths();
    mkdirSync(path.join(p.content, 'questions'), { recursive: true });
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(
      path.join(p.content, 'questions', 'ch01.free.json'),
      JSON.stringify([{ id: 'free-q-1', isFree: true }]),
    );
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], contentFps: ['a'.repeat(24)], publicFps: ['a'.repeat(24)] }));
    writeFileSync(
      path.join(p.leak, 'free-question-manifest.json'),
      JSON.stringify({ ids: ['free-q-1'], fps: ['b'.repeat(24)] }),
    );
    writeInertSamplerManifest(p);
    writeFileSync(path.join(p.out, 'index.html'), '<div>chapter teaching prose only, no questions</div>');
    const result = run();
    expect(result.code).toBe(0);
  });

  it('passes when the export is clean of paid ids and fingerprints', () => {
    const p = paths();
    mkdirSync(path.join(p.content, 'questions'), { recursive: true });
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(
      path.join(p.content, 'questions', 'ch01.free.json'),
      JSON.stringify([{ id: 'free-q-1', isFree: true }]),
    );
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], contentFps: ['a'.repeat(24)], publicFps: ['a'.repeat(24)] }));
    writeInertFreeManifest(p);
    writeInertSamplerManifest(p);
    writeFileSync(path.join(p.out, 'index.html'), '<div>totally clean public page</div>');
    const result = run();
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/PASSED/);
  });

  // ── Blocker 4: sampler manifest asserts EXACT canonical identity, not
  // just a ≤10 count (a `.slice(10, 20)` regression must be caught) ───────
  describe('flashcard sampler correctness', () => {
    const canonicalIds = Array.from({ length: 10 }, (_, i) => `1:savings-vs-investments:${i}`);

    function baseManifests(p: ReturnType<typeof paths>) {
      writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], contentFps: ['a'.repeat(24)], publicFps: ['a'.repeat(24)] }));
      writeInertFreeManifest(p);
    }

    it('passes when the hub renders exactly the canonical sampler and a spoke renders a valid subset', () => {
      const p = paths();
      mkdirSync(p.leak, { recursive: true });
      mkdirSync(path.join(p.out, 'chapters', '1'), { recursive: true });
      baseManifests(p);
      writeFileSync(p.samplerManifest, JSON.stringify({ 1: canonicalIds }));
      const hub = canonicalIds.map((id) => `<div data-card-id="${id}"></div>`).join('\n');
      writeFileSync(path.join(p.out, 'chapters', '1.html'), hub);
      // A spoke renders only ITS share (a subset) — not all 10.
      const spokeShare = canonicalIds.slice(0, 3).map((id) => `<div data-card-id="${id}"></div>`).join('\n');
      writeFileSync(path.join(p.out, 'chapters', '1', 'savings-vs-investments.html'), spokeShare);
      const result = run();
      expect(result.code).toBe(0);
    });

    it('fails when the hub renders the WRONG 10 cards (a .slice(10, 20) regression) — count-only checks would miss this', () => {
      const p = paths();
      mkdirSync(p.leak, { recursive: true });
      mkdirSync(path.join(p.out, 'chapters'), { recursive: true });
      baseManifests(p);
      writeFileSync(p.samplerManifest, JSON.stringify({ 1: canonicalIds }));
      // Ten DIFFERENT card ids — same count (10), wrong identity.
      const wrongIds = Array.from({ length: 10 }, (_, i) => `1:savings-vs-investments:${i + 10}`);
      const hub = wrongIds.map((id) => `<div data-card-id="${id}"></div>`).join('\n');
      writeFileSync(path.join(p.out, 'chapters', '1.html'), hub);
      const result = run();
      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/missing canonical sampler card/);
      expect(result.stderr).toMatch(/unexpected card/);
    });

    it('fails when the hub is missing a canonical sampler card', () => {
      const p = paths();
      mkdirSync(p.leak, { recursive: true });
      mkdirSync(path.join(p.out, 'chapters'), { recursive: true });
      baseManifests(p);
      writeFileSync(p.samplerManifest, JSON.stringify({ 1: canonicalIds }));
      const hub = canonicalIds.slice(0, 9).map((id) => `<div data-card-id="${id}"></div>`).join('\n');
      writeFileSync(path.join(p.out, 'chapters', '1.html'), hub);
      const result = run();
      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/missing canonical sampler card/);
    });

    it('fails when a spoke renders a card outside the chapter\'s canonical sampler', () => {
      const p = paths();
      mkdirSync(p.leak, { recursive: true });
      mkdirSync(path.join(p.out, 'chapters', '1'), { recursive: true });
      baseManifests(p);
      writeFileSync(p.samplerManifest, JSON.stringify({ 1: canonicalIds }));
      const hub = canonicalIds.map((id) => `<div data-card-id="${id}"></div>`).join('\n');
      writeFileSync(path.join(p.out, 'chapters', '1.html'), hub);
      // Card index 10 is outside the first-10 canonical sampler.
      writeFileSync(path.join(p.out, 'chapters', '1', 'some-subtopic.html'), '<div data-card-id="1:savings-vs-investments:10"></div>');
      const result = run();
      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/not in chapter 1's canonical sampler/);
    });

    it('fails when the sampler manifest is missing', () => {
      const p = paths();
      mkdirSync(p.leak, { recursive: true });
      baseManifests(p);
      const result = run();
      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/Missing .*sampler-manifest\.json/);
    });

    it('fails when the sampler manifest is malformed (not an object)', () => {
      const p = paths();
      mkdirSync(p.leak, { recursive: true });
      baseManifests(p);
      writeFileSync(p.samplerManifest, JSON.stringify(['not', 'an', 'object']));
      const result = run();
      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/Sampler manifest is malformed/);
    });

    it('passes with an empty sampler manifest (zero published chapters is a legitimate partial-rollout state)', () => {
      const p = paths();
      mkdirSync(p.leak, { recursive: true });
      mkdirSync(p.out, { recursive: true });
      baseManifests(p);
      writeInertSamplerManifest(p);
      writeFileSync(path.join(p.out, 'index.html'), '<div>nothing published yet</div>');
      const result = run();
      expect(result.code).toBe(0);
    });
  });

  // ── Blocker 3: free-manifest fails closed ──────────────────────────────
  describe('free-question manifest fails closed', () => {
    it('fails when the free-question manifest is missing', () => {
      const p = paths();
      mkdirSync(p.leak, { recursive: true });
      writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], contentFps: ['a'.repeat(24)], publicFps: ['a'.repeat(24)] }));
      // No free-question-manifest.json written.
      const result = run();
      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/Missing .*free-question-manifest\.json/);
    });

    it('fails when the free-question manifest is empty (well-formed but no ids/fps)', () => {
      const p = paths();
      mkdirSync(p.leak, { recursive: true });
      writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], contentFps: ['a'.repeat(24)], publicFps: ['a'.repeat(24)] }));
      writeFileSync(p.freeManifest, JSON.stringify({ ids: [], fps: [] }));
      const result = run();
      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/Free-question manifest is empty or malformed/);
    });

    it('fails when the free-question manifest is malformed (invalid JSON)', () => {
      const p = paths();
      mkdirSync(p.leak, { recursive: true });
      writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], contentFps: ['a'.repeat(24)], publicFps: ['a'.repeat(24)] }));
      writeFileSync(p.freeManifest, '{not valid json');
      const result = run();
      expect(result.code).not.toBe(0);
    });
  });
});
