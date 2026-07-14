import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { freshDir, validateStagedExport, commitStaging } from '../scripts/lib/atomicExport.mjs';

/**
 * M1-S6: unit coverage for the atomic export-tree swap without a live
 * Firestore credential — the export script builds into a staging tree,
 * validates it, and only then replaces the live tree wholesale, so a chapter
 * dropped from Firestore cannot leave a stale approved .raw.json behind.
 */
let work: string;

/** Build a complete, valid staged export tree under `root`. */
function buildValidStage(root: string) {
  const content = path.join(root, 'content.staging');
  const leak = path.join(root, '.leakcheck.staging');
  mkdirSync(path.join(content, 'questions'), { recursive: true });
  mkdirSync(path.join(content, 'flashcards'), { recursive: true });
  writeFileSync(path.join(content, 'questions', 'ch01.free.json'), '[]');
  writeFileSync(path.join(content, 'flashcards', 'ch01.raw.json'), '[]');
  writeFileSync(path.join(content, 'chapter-stats.json'), '{}');
  mkdirSync(leak, { recursive: true });
  writeFileSync(path.join(leak, 'paid-manifest.json'), '{}');
  writeFileSync(path.join(leak, 'free-question-manifest.json'), '{}');
  writeFileSync(path.join(leak, 'sampler-manifest.json'), '{}');
  return { content, leak };
}

beforeEach(() => {
  work = mkdtempSync(path.join(tmpdir(), 'arnready-atomic-'));
});
afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

describe('freshDir', () => {
  it('clears a leftover directory and recreates it empty', () => {
    const dir = path.join(work, 'stage');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'leftover.json'), 'stale');
    freshDir(dir);
    expect(existsSync(dir)).toBe(true);
    expect(readdirSync(dir)).toEqual([]);
  });
});

describe('validateStagedExport', () => {
  it('accepts a complete staged tree', () => {
    const { content, leak } = buildValidStage(work);
    expect(() => validateStagedExport(content, leak)).not.toThrow();
  });

  it('throws when a required manifest is missing', () => {
    const { content, leak } = buildValidStage(work);
    rmSync(path.join(leak, 'sampler-manifest.json'));
    expect(() => validateStagedExport(content, leak)).toThrow(/sampler manifest/);
  });

  it('throws when the flashcards directory is empty', () => {
    const { content, leak } = buildValidStage(work);
    rmSync(path.join(content, 'flashcards', 'ch01.raw.json'));
    expect(() => validateStagedExport(content, leak)).toThrow(/flashcards/);
  });
});

describe('commitStaging', () => {
  it('replaces the live tree wholesale, discarding stale files', () => {
    // A live tree that still holds a chapter (ch99) which vanished from the
    // new export — it must NOT survive the swap.
    const finalContent = path.join(work, 'content');
    mkdirSync(path.join(finalContent, 'flashcards'), { recursive: true });
    writeFileSync(path.join(finalContent, 'flashcards', 'ch99.raw.json'), 'STALE');

    const { content } = buildValidStage(work);
    commitStaging([{ staging: content, final: finalContent }]);

    expect(existsSync(path.join(finalContent, 'flashcards', 'ch99.raw.json'))).toBe(false);
    expect(existsSync(path.join(finalContent, 'flashcards', 'ch01.raw.json'))).toBe(true);
    expect(readFileSync(path.join(finalContent, 'chapter-stats.json'), 'utf8')).toBe('{}');
    // The staging tree was consumed by the rename.
    expect(existsSync(content)).toBe(false);
  });

  it('throws if a staging dir is missing rather than deleting the live tree', () => {
    const finalContent = path.join(work, 'content');
    mkdirSync(finalContent, { recursive: true });
    writeFileSync(path.join(finalContent, 'keep.json'), 'live');
    expect(() => commitStaging([{ staging: path.join(work, 'nope'), final: finalContent }])).toThrow(/staging dir missing/);
    // The live tree is untouched because the swap aborted before rm.
    expect(existsSync(path.join(finalContent, 'keep.json'))).toBe(true);
  });
});
