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
    // No rollback backup is left behind after a clean commit.
    expect(existsSync(`${finalContent}.previous`)).toBe(false);
  });

  it('commits multiple pairs together and leaves no backups', () => {
    const finalContent = path.join(work, 'content');
    const finalLeak = path.join(work, '.leakcheck');
    mkdirSync(finalContent, { recursive: true });
    mkdirSync(finalLeak, { recursive: true });
    writeFileSync(path.join(finalContent, 'old.json'), 'OLD');
    writeFileSync(path.join(finalLeak, 'old.json'), 'OLD');
    const { content, leak } = buildValidStage(work);

    commitStaging([
      { staging: content, final: finalContent },
      { staging: leak, final: finalLeak },
    ]);

    expect(existsSync(path.join(finalContent, 'chapter-stats.json'))).toBe(true);
    expect(existsSync(path.join(finalLeak, 'sampler-manifest.json'))).toBe(true);
    expect(existsSync(path.join(finalContent, 'old.json'))).toBe(false);
    expect(existsSync(`${finalContent}.previous`)).toBe(false);
    expect(existsSync(`${finalLeak}.previous`)).toBe(false);
  });

  it('throws if a staging dir is missing rather than deleting the live tree', () => {
    const finalContent = path.join(work, 'content');
    mkdirSync(finalContent, { recursive: true });
    writeFileSync(path.join(finalContent, 'keep.json'), 'live');
    expect(() => commitStaging([{ staging: path.join(work, 'nope'), final: finalContent }])).toThrow(/staging dir missing/);
    // The live tree is untouched because the swap aborted before any rename.
    expect(existsSync(path.join(finalContent, 'keep.json'))).toBe(true);
  });

  it('rolls back every earlier pair to the OLD generation if a later rename fails', () => {
    // First pair (content) swaps in fine; the second pair's `final` sits under
    // a parent that does not exist, so its rename throws ENOENT. The whole
    // group must then revert so content/ and .leakcheck/ never split across
    // generations.
    const finalContent = path.join(work, 'content');
    mkdirSync(finalContent, { recursive: true });
    writeFileSync(path.join(finalContent, 'gen.txt'), 'OLD');

    const { content, leak } = buildValidStage(work);
    const brokenFinal = path.join(work, 'ghost-parent', 'leak'); // parent absent → rename fails

    expect(() =>
      commitStaging([
        { staging: content, final: finalContent },
        { staging: leak, final: brokenFinal },
      ]),
    ).toThrow();

    // content/ was rolled back to its OLD generation (staged chapter-stats is
    // gone; the original gen.txt is restored), and no backup leaks.
    expect(readFileSync(path.join(finalContent, 'gen.txt'), 'utf8')).toBe('OLD');
    expect(existsSync(path.join(finalContent, 'chapter-stats.json'))).toBe(false);
    expect(existsSync(`${finalContent}.previous`)).toBe(false);
  });
});
