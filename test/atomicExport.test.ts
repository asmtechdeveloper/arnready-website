import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, lstatSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  ensureReaderLayout,
  stageGeneration,
  validateStagedGeneration,
  publishGeneration,
} from '../scripts/lib/atomicExport.mjs';

/**
 * M1-S6 (three re-review rounds): the export publishes content/ and
 * .leakcheck/ under one generation dir and goes live via a SINGLE atomic
 * pointer switch. The stable reader symlinks are installed once, before any
 * publish, by ensureReaderLayout — which also performs the one-time migration
 * from the legacy real-directory layout, idempotently and recoverably, so a
 * crash mid-migration can never leave the two trees from different generations
 * and self-heals on the next startup.
 */
let root: string;
let exportDir: string;

type Stage = ReturnType<typeof stageGeneration>;

/** Write a complete, valid generation, tagged so we can tell generations apart. */
function fillGen(stage: Stage, tag: string) {
  writeFileSync(path.join(stage.contentDir, 'questions', 'ch01.free.json'), '[]');
  writeFileSync(path.join(stage.contentDir, 'flashcards', 'ch01.raw.json'), JSON.stringify([tag]));
  writeFileSync(path.join(stage.contentDir, 'chapter-stats.json'), JSON.stringify({ tag }));
  writeFileSync(path.join(stage.leakDir, 'paid-manifest.json'), JSON.stringify({ tag }));
  writeFileSync(path.join(stage.leakDir, 'free-question-manifest.json'), '{}');
  writeFileSync(path.join(stage.leakDir, 'sampler-manifest.json'), '{}');
}

/** One full exporter cycle: ensure layout, stage, validate, publish. */
function runExport(tag: string): Stage {
  ensureReaderLayout(root, exportDir);
  const stage = stageGeneration(exportDir);
  fillGen(stage, tag);
  validateStagedGeneration(stage.contentDir, stage.leakDir);
  publishGeneration(exportDir, stage.slot);
  return stage;
}

const liveTag = (tree: 'content' | '.leakcheck') => {
  const file = tree === 'content' ? 'chapter-stats.json' : 'paid-manifest.json';
  return JSON.parse(readFileSync(path.join(root, tree, file), 'utf8')).tag;
};
const isSymlink = (tree: 'content' | '.leakcheck') => lstatSync(path.join(root, tree)).isSymbolicLink();

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'arnready-atomic-'));
  exportDir = path.join(root, '.export');
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('ensureReaderLayout', () => {
  it('installs stable reader symlinks on a fresh environment BEFORE any publish', () => {
    ensureReaderLayout(root, exportDir);
    // Both reader paths are symlinks the moment the layout is ensured — so the
    // later publish only ever switches `current`, never these paths.
    expect(isSymlink('content')).toBe(true);
    expect(isSymlink('.leakcheck')).toBe(true);
  });

  it('migrates pre-existing real content/ and .leakcheck/ into ONE generation', () => {
    // Legacy real-directory export present on disk.
    mkdirSync(path.join(root, 'content', 'flashcards'), { recursive: true });
    mkdirSync(path.join(root, '.leakcheck'), { recursive: true });
    writeFileSync(path.join(root, 'content', 'chapter-stats.json'), JSON.stringify({ tag: 'legacy' }));
    writeFileSync(path.join(root, '.leakcheck', 'paid-manifest.json'), JSON.stringify({ tag: 'legacy' }));

    ensureReaderLayout(root, exportDir);

    expect(isSymlink('content')).toBe(true);
    expect(isSymlink('.leakcheck')).toBe(true);
    // Both legacy trees were captured into the SAME generation — never split.
    expect(liveTag('content')).toBe('legacy');
    expect(liveTag('.leakcheck')).toBe('legacy');
  });

  it('repairs a wrong pre-existing reader symlink without leaving it missing', () => {
    ensureReaderLayout(root, exportDir); // installs correct symlinks (current -> genA empty bootstrap)
    // Tamper: point content/ at a bogus target.
    rmSync(path.join(root, 'content'));
    symlinkSync('bogus-target', path.join(root, 'content'));
    // Publish a real generation, then re-ensure — the wrong link must be fixed.
    runExport('gen1');
    ensureReaderLayout(root, exportDir);
    expect(lstatSync(path.join(root, 'content')).isSymbolicLink()).toBe(true);
    expect(liveTag('content')).toBe('gen1');
  });

  it('is idempotent and recovers a partial migration (current bootstrapped, symlinks not yet installed)', () => {
    // Simulate a crash mid-migration: content/.leakcheck captured into genA and
    // `current` switched, but the reader symlinks were never created (both
    // reader paths absent). This is a MISSING state, never a mixed generation.
    mkdirSync(path.join(exportDir, 'genA', 'content', 'flashcards'), { recursive: true });
    mkdirSync(path.join(exportDir, 'genA', 'leakcheck'), { recursive: true });
    writeFileSync(path.join(exportDir, 'genA', 'content', 'chapter-stats.json'), JSON.stringify({ tag: 'captured' }));
    writeFileSync(path.join(exportDir, 'genA', 'leakcheck', 'paid-manifest.json'), JSON.stringify({ tag: 'captured' }));
    // `current` already points at genA; content/.leakcheck reader paths absent.
    // (switchCurrent is internal; emulate its result.)
    symlinkSync('genA', path.join(exportDir, 'current'));

    ensureReaderLayout(root, exportDir); // must reconcile, not double-bootstrap

    expect(liveTag('content')).toBe('captured');
    expect(liveTag('.leakcheck')).toBe('captured');
  });
});

describe('stageGeneration', () => {
  it('builds into genA first, then ping-pongs to the INACTIVE slot without disturbing the live gen', () => {
    ensureReaderLayout(root, exportDir); // bootstraps current -> genA (empty)
    const first = stageGeneration(exportDir);
    expect(first.slot).toBe('genB'); // genA is live (empty bootstrap), so build genB
    fillGen(first, 'gen1');
    validateStagedGeneration(first.contentDir, first.leakDir);
    publishGeneration(exportDir, first.slot); // current -> genB

    const second = stageGeneration(exportDir);
    expect(second.slot).toBe('genA');
    // Staging genA left the live content/ (gen1, in genB) fully readable.
    expect(liveTag('content')).toBe('gen1');
  });
});

describe('validateStagedGeneration', () => {
  it('accepts a complete generation and rejects a missing manifest', () => {
    ensureReaderLayout(root, exportDir);
    const s = stageGeneration(exportDir);
    fillGen(s, 'x');
    expect(() => validateStagedGeneration(s.contentDir, s.leakDir)).not.toThrow();
    rmSync(path.join(s.leakDir, 'sampler-manifest.json'));
    expect(() => validateStagedGeneration(s.contentDir, s.leakDir)).toThrow(/sampler manifest/);
  });
});

describe('publishGeneration', () => {
  it('switches BOTH trees to the new generation together on each publish', () => {
    runExport('gen1');
    expect(liveTag('content')).toBe('gen1');
    expect(liveTag('.leakcheck')).toBe('gen1');
    runExport('gen2');
    // One pointer switch moved content/ AND .leakcheck/ to gen2 at once — the
    // two trees are never from different generations.
    expect(liveTag('content')).toBe('gen2');
    expect(liveTag('.leakcheck')).toBe('gen2');
  });

  it('leaves the previous generation fully live if the new one fails validation', () => {
    runExport('gen1');
    ensureReaderLayout(root, exportDir);
    const bad = stageGeneration(exportDir);
    // Half-written generation: everything except the sampler manifest.
    writeFileSync(path.join(bad.contentDir, 'questions', 'ch01.free.json'), '[]');
    writeFileSync(path.join(bad.contentDir, 'flashcards', 'ch01.raw.json'), '["gen2"]');
    writeFileSync(path.join(bad.contentDir, 'chapter-stats.json'), JSON.stringify({ tag: 'gen2' }));
    writeFileSync(path.join(bad.leakDir, 'paid-manifest.json'), JSON.stringify({ tag: 'gen2' }));
    writeFileSync(path.join(bad.leakDir, 'free-question-manifest.json'), '{}');

    expect(() => validateStagedGeneration(bad.contentDir, bad.leakDir)).toThrow();
    // publishGeneration is NOT reached — content/ and .leakcheck/ still gen1.
    expect(liveTag('content')).toBe('gen1');
    expect(liveTag('.leakcheck')).toBe('gen1');
  });
});
