import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

let tempRoot: string;

function paths() {
  return {
    content: path.join(tempRoot, 'content'),
    leak: path.join(tempRoot, '.leakcheck'),
    out: path.join(tempRoot, 'out'),
    manifest: path.join(tempRoot, '.leakcheck', 'paid-manifest.json'),
  };
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
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-q-1'], fps: ['a'.repeat(24)] }));
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/without isFree===true/);
  });

  it('fails when a paid question id leaks into the static export', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], fps: ['a'.repeat(24)] }));
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
    writeFileSync(p.manifest, JSON.stringify({ ids: ['pid-1'], fps: [fp] }));
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
    writeFileSync(p.manifest, JSON.stringify({ ids: ['pid-1'], fps: ['plimpactonnavcalculationsxyz'] }));
    writeFileSync(path.join(p.out, 'leak.xml'), '<q>P&amp;L Impact On Nav Calculations Xyz</q>');
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains paid question text/);
  });

  it('fails when a free question id leaks into the public export', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], fps: ['a'.repeat(24)] }));
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
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], fps: ['a'.repeat(24)] }));
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
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], fps: ['a'.repeat(24)] }));
    writeFileSync(
      path.join(p.leak, 'free-question-manifest.json'),
      JSON.stringify({ ids: ['free-q-1'], fps: ['b'.repeat(24)] }),
    );
    writeFileSync(path.join(p.out, 'index.html'), '<div>chapter teaching prose only, no questions</div>');
    const result = run();
    expect(result.code).toBe(0);
  });

  it('fails when more than 10 distinct sampler cards render for one chapter', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], fps: ['a'.repeat(24)] }));
    const cardDivs = Array.from({ length: 11 }, (_, i) => `<div data-card-id="1:savings-vs-investments:${i}"></div>`).join('\n');
    writeFileSync(path.join(p.out, 'hub.html'), cardDivs);
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/exceeds the 10-card public budget/);
  });

  it('passes when the same 10 sampler cards repeat across a hub and its spokes (distinct, not occurrence, count)', () => {
    const p = paths();
    mkdirSync(p.leak, { recursive: true });
    mkdirSync(p.out, { recursive: true });
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], fps: ['a'.repeat(24)] }));
    const ids = Array.from({ length: 10 }, (_, i) => `1:savings-vs-investments:${i}`);
    const hub = ids.map((id) => `<div data-card-id="${id}"></div>`).join('\n');
    writeFileSync(path.join(p.out, 'hub.html'), hub);
    // Same 10 cards repeat on a spoke page — must not double-count.
    writeFileSync(path.join(p.out, 'spoke.html'), hub);
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
    writeFileSync(p.manifest, JSON.stringify({ ids: ['paid-secret-id'], fps: ['a'.repeat(24)] }));
    writeFileSync(path.join(p.out, 'index.html'), '<div>totally clean public page</div>');
    const result = run();
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/PASSED/);
  });
});
