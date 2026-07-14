import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stageGeneration, validateStagedGeneration, publishGeneration } from '../scripts/lib/atomicExport.mjs';

/**
 * M1-S6 (re-review hardening): the export publishes content/ and .leakcheck/
 * under one generation dir and goes live via a SINGLE atomic pointer switch,
 * so the two reader trees can never be from different generations or missing.
 * These cover slot selection, validate-before-publish, that both trees switch
 * together through one `current`, that a failed/invalid new generation leaves
 * the previous one fully live, and the one-time migration of a pre-existing
 * real content/ directory into the symlink layout.
 */
let root: string;
let exportDir: string;

type Stage = ReturnType<typeof stageGeneration>;

/** Write a complete, valid generation tagged so we can tell generations apart. */
function fillGen(stage: Stage, tag: string) {
  writeFileSync(path.join(stage.contentDir, 'questions', 'ch01.free.json'), '[]');
  writeFileSync(path.join(stage.contentDir, 'flashcards', 'ch01.raw.json'), JSON.stringify([tag]));
  writeFileSync(path.join(stage.contentDir, 'chapter-stats.json'), JSON.stringify({ tag }));
  writeFileSync(path.join(stage.leakDir, 'paid-manifest.json'), JSON.stringify({ tag }));
  writeFileSync(path.join(stage.leakDir, 'free-question-manifest.json'), '{}');
  writeFileSync(path.join(stage.leakDir, 'sampler-manifest.json'), '{}');
}

function publishValid(tag: string): Stage {
  const stage = stageGeneration(exportDir);
  fillGen(stage, tag);
  validateStagedGeneration(stage.contentDir, stage.leakDir);
  publishGeneration(root, exportDir, stage.slot);
  return stage;
}

const liveTag = (tree: 'content' | '.leakcheck') => {
  const file = tree === 'content' ? 'chapter-stats.json' : 'paid-manifest.json';
  return JSON.parse(readFileSync(path.join(root, tree, file), 'utf8')).tag;
};

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'arnready-atomic-'));
  exportDir = path.join(root, '.export');
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('stageGeneration', () => {
  it('builds into genA first, with empty content/leakcheck subtrees', () => {
    const s = stageGeneration(exportDir);
    expect(s.slot).toBe('genA');
    expect(existsSync(path.join(s.contentDir, 'questions'))).toBe(true);
    expect(existsSync(path.join(s.contentDir, 'flashcards'))).toBe(true);
    expect(existsSync(s.leakDir)).toBe(true);
  });

  it('ping-pongs to the INACTIVE slot and never disturbs the live generation', () => {
    publishValid('gen1'); // genA is now live
    const s2 = stageGeneration(exportDir);
    expect(s2.slot).toBe('genB');
    // Staging genB left the live content/ (gen1, in genA) fully readable.
    expect(liveTag('content')).toBe('gen1');
    expect(liveTag('.leakcheck')).toBe('gen1');
  });
});

describe('validateStagedGeneration', () => {
  it('accepts a complete generation and rejects a missing manifest', () => {
    const s = stageGeneration(exportDir);
    fillGen(s, 'x');
    expect(() => validateStagedGeneration(s.contentDir, s.leakDir)).not.toThrow();
    rmSync(path.join(s.leakDir, 'sampler-manifest.json'));
    expect(() => validateStagedGeneration(s.contentDir, s.leakDir)).toThrow(/sampler manifest/);
  });
});

describe('publishGeneration', () => {
  it('publishes both trees via symlinks that resolve to the new generation', () => {
    publishValid('gen1');
    expect(lstatSync(path.join(root, 'content')).isSymbolicLink()).toBe(true);
    expect(lstatSync(path.join(root, '.leakcheck')).isSymbolicLink()).toBe(true);
    expect(liveTag('content')).toBe('gen1');
    expect(liveTag('.leakcheck')).toBe('gen1');
  });

  it('switches BOTH trees to the new generation together on the next publish', () => {
    publishValid('gen1');
    publishValid('gen2');
    // A single pointer switch moved content/ AND .leakcheck/ to gen2 at once —
    // never a mix of gen1/gen2 across the two trees.
    expect(liveTag('content')).toBe('gen2');
    expect(liveTag('.leakcheck')).toBe('gen2');
  });

  it('leaves the previous generation fully live if the new one fails validation', () => {
    publishValid('gen1');
    const bad = stageGeneration(exportDir); // genB
    // A half-written generation: everything except the sampler manifest.
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

  it('migrates a pre-existing real content/ directory into the symlink layout', () => {
    // Simulate the one-time transition from the old real-directory export.
    mkdirSync(path.join(root, 'content'), { recursive: true });
    writeFileSync(path.join(root, 'content', 'stale.json'), 'OLD-REAL-DIR');
    publishValid('gen1');
    expect(lstatSync(path.join(root, 'content')).isSymbolicLink()).toBe(true);
    expect(existsSync(path.join(root, 'content', 'stale.json'))).toBe(false);
    expect(liveTag('content')).toBe('gen1');
  });
});
