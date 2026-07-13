import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * check-paid-leak.mjs is a load-bearing script (kept as-is per the manual)
 * that always scans content/ + out/ + .leakcheck/paid-manifest.json
 * relative to the repo root — it isn't parameterizable. There is no live
 * Firestore service account key in this environment (per .env.example: "the
 * service account key stays OUTSIDE this repo"), so export-content.mjs
 * cannot run here. These tests exercise the leak gate itself against
 * synthetic fixtures written to the same (gitignored) paths the real build
 * pipeline uses, then clean up.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const LEAK_DIR = path.join(ROOT, '.leakcheck');
const OUT_DIR = path.join(ROOT, 'out');
const MANIFEST = path.join(LEAK_DIR, 'paid-manifest.json');

function cleanup() {
  rmSync(CONTENT_DIR, { recursive: true, force: true });
  rmSync(LEAK_DIR, { recursive: true, force: true });
  rmSync(OUT_DIR, { recursive: true, force: true });
}

function run() {
  try {
    const stdout = execFileSync('node', ['scripts/check-paid-leak.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return { code: 0, stdout };
  } catch (err) {
    const e = err as { status: number; stdout: string; stderr: string };
    return { code: e.status, stdout: e.stdout, stderr: e.stderr };
  }
}

describe('check-paid-leak.mjs (leak gate)', () => {
  afterEach(cleanup);

  it('fails closed when the paid manifest is missing', () => {
    cleanup();
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/Missing .*paid-manifest\.json/);
  });

  it('fails when a free question record is missing isFree:true', () => {
    cleanup();
    mkdirSync(path.join(CONTENT_DIR, 'questions'), { recursive: true });
    mkdirSync(LEAK_DIR, { recursive: true });
    writeFileSync(
      path.join(CONTENT_DIR, 'questions', 'ch01.free.json'),
      JSON.stringify([{ id: 'q1', isFree: false }]),
    );
    writeFileSync(
      MANIFEST,
      JSON.stringify({ ids: ['paid-q-1'], fps: ['a'.repeat(24)] }),
    );
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/without isFree===true/);
  });

  it('fails when a paid question id leaks into the static export', () => {
    cleanup();
    mkdirSync(LEAK_DIR, { recursive: true });
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(
      MANIFEST,
      JSON.stringify({ ids: ['paid-secret-id'], fps: ['a'.repeat(24)] }),
    );
    writeFileSync(path.join(OUT_DIR, 'leak.html'), '<div>paid-secret-id</div>');
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains paid question id/);
  });

  it('fails when paid question text (fingerprint) leaks into the static export', () => {
    cleanup();
    mkdirSync(LEAK_DIR, { recursive: true });
    mkdirSync(OUT_DIR, { recursive: true });
    const fp = 'thisisapaidquestionfingerprintxyz123';
    writeFileSync(MANIFEST, JSON.stringify({ ids: ['pid-1'], fps: [fp] }));
    writeFileSync(path.join(OUT_DIR, 'leak.html'), `<div>${fp}</div>`);
    const result = run();
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/contains paid question text/);
  });

  it('passes when the export is clean of paid ids and fingerprints', () => {
    cleanup();
    mkdirSync(path.join(CONTENT_DIR, 'questions'), { recursive: true });
    mkdirSync(LEAK_DIR, { recursive: true });
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(
      path.join(CONTENT_DIR, 'questions', 'ch01.free.json'),
      JSON.stringify([{ id: 'free-q-1', isFree: true }]),
    );
    writeFileSync(
      MANIFEST,
      JSON.stringify({ ids: ['paid-secret-id'], fps: ['a'.repeat(24)] }),
    );
    writeFileSync(path.join(OUT_DIR, 'index.html'), '<div>totally clean public page</div>');
    const result = run();
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/PASSED/);
    expect(existsSync(OUT_DIR)).toBe(true);
  });
});
