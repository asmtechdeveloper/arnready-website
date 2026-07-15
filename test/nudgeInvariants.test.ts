import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import * as nudgeGates from '@/lib/nudgeGates';

/**
 * nudgeInvariants.test.ts — pins the D10 no-nudge invariants that M2 CAN
 * prove without wired-up players (M2 plan §4 step S5):
 *
 *   (a) every gate in src/lib/nudgeGates.ts returns `null` for `isPaid:
 *       true`, across a sampled input matrix (short-circuit proof).
 *   (b) the module's exported gate/wall surface is EXACTLY the four gate
 *       functions plus `countDistinctReveals` and the four constants — no
 *       mock gate, no mistakes gate (D10b; adgate-logic.md:18-20:
 *       "Mistakes deck… Mock… carry zero ads" — their absence IS the
 *       guarantee).
 *   (c) a source-tree guard: no file under src/ OTHER THAN
 *       src/lib/nudgeGates.ts declares a function whose name matches a
 *       gate pattern — the single-write-site rule for the decision layer.
 */

// ─── (a) isPaid:true short-circuit, sampled matrix ────────────────────────

describe('D10a — every gate returns null when isPaid:true (sampled matrix)', () => {
  describe('practiceNudgeBeforeQuestion', () => {
    for (let nextIndex = 0; nextIndex <= 25; nextIndex += 1) {
      for (const nudgesShownThisRun of [0, 1, 2]) {
        it(`nextIndex=${nextIndex} nudgesShownThisRun=${nudgesShownThisRun} -> null`, () => {
          expect(
            nudgeGates.practiceNudgeBeforeQuestion(nextIndex, {
              isPaid: true,
              nudgesShownThisRun,
            }),
          ).toBeNull();
        });
      }
    }
  });

  describe('practiceWallBeforeQuestion', () => {
    for (let nextIndex = 0; nextIndex <= 25; nextIndex += 1) {
      it(`nextIndex=${nextIndex} -> null`, () => {
        expect(
          nudgeGates.practiceWallBeforeQuestion(nextIndex, { isPaid: true }),
        ).toBeNull();
      });
    }
  });

  describe('examNudgeBeforeStart', () => {
    for (const nudgeShown of [true, false]) {
      it(`nudgeShown=${nudgeShown} -> null`, () => {
        expect(
          nudgeGates.examNudgeBeforeStart({ isPaid: true, nudgeShown }),
        ).toBeNull();
      });
    }
  });

  describe('flashcardNudgeAfterReveal', () => {
    for (let distinctReveals = 0; distinctReveals <= 60; distinctReveals += 5) {
      for (const gatesShownThisRun of [0, 1, 2, 3]) {
        it(`distinctReveals=${distinctReveals} gatesShownThisRun=${gatesShownThisRun} -> null`, () => {
          expect(
            nudgeGates.flashcardNudgeAfterReveal(distinctReveals, {
              isPaid: true,
              gatesShownThisRun,
            }),
          ).toBeNull();
        });
      }
    }
  });
});

// ─── (b) exact exported surface — no mock gate, no mistakes gate ─────────

describe('D10b — the exported gate/wall surface is exactly the pinned set', () => {
  const EXPECTED_GATE_FUNCTIONS = [
    'practiceNudgeBeforeQuestion',
    'practiceWallBeforeQuestion',
    'examNudgeBeforeStart',
    'flashcardNudgeAfterReveal',
  ].sort();

  const EXPECTED_ALL_EXPORTS = [
    'PRACTICE_GATE_INDEX',
    'FREE_QUESTIONS_PER_CHAPTER',
    'FLASHCARD_GATE_EVERY',
    'FLASHCARD_GATE_MAX',
    'practiceNudgeBeforeQuestion',
    'practiceWallBeforeQuestion',
    'examNudgeBeforeStart',
    'flashcardNudgeAfterReveal',
    'countDistinctReveals',
  ].sort();

  it('exports exactly the four gate functions plus countDistinctReveals and the four constants — no more, no less', () => {
    const actualExports = Object.keys(nudgeGates).sort();
    expect(actualExports).toEqual(EXPECTED_ALL_EXPORTS);
  });

  it('the exported function names are exactly the four gate functions plus countDistinctReveals (no mock gate, no mistakes gate)', () => {
    const actualFunctionNames = Object.keys(nudgeGates)
      .filter((key) => typeof (nudgeGates as Record<string, unknown>)[key] === 'function')
      .sort();
    expect(actualFunctionNames).toEqual([...EXPECTED_GATE_FUNCTIONS, 'countDistinctReveals'].sort());
  });

  it('no export name matches a mock-gate or mistakes-gate pattern', () => {
    const offenders = Object.keys(nudgeGates).filter((key) =>
      /mock|mistake/i.test(key),
    );
    expect(offenders).toEqual([]);
  });
});

// ─── (c) source-tree guard — single write-site for gate-like functions ───

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');
const NUDGE_GATES_FILE = path.join(SRC_ROOT, 'lib', 'nudgeGates.ts');

// Matches a function/const/let declaration whose identifier looks like a
// gate or wall predicate: `*NudgeBefore*`, `*GateBefore*`, `*WallBefore*`,
// or `*NudgeAfterReveal*`. The wall predicate is part of the decision layer
// (D10b: "plus the wall predicate"), so the single-write-site rule covers it.
const DECL_RE = /\b(?:function|const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[=(]/g;
const GATE_NAME_RE = /(Nudge|Gate|Wall)Before|NudgeAfterReveal/;

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      yield* walk(p);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      yield p;
    }
  }
}

function findGateLikeDeclarations(filePath: string): string[] {
  const text = readFileSync(filePath, 'utf8');
  const found: string[] = [];
  let match: RegExpExecArray | null;
  DECL_RE.lastIndex = 0;
  while ((match = DECL_RE.exec(text)) !== null) {
    const name = match[1];
    if (name !== undefined && GATE_NAME_RE.test(name)) {
      found.push(name);
    }
  }
  return found;
}

describe('D10c — single-write-site guard: no other src/ file declares a gate-like function', () => {
  const srcFiles = [...walk(SRC_ROOT)];

  it('actually reads a non-trivial number of files under src/ (guard is not a stub)', () => {
    expect(srcFiles.length).toBeGreaterThan(5);
    expect(srcFiles).toContain(NUDGE_GATES_FILE);
  });

  it('src/lib/nudgeGates.ts itself declares the four pinned gate functions (sanity: the pattern actually matches real declarations)', () => {
    const declared = findGateLikeDeclarations(NUDGE_GATES_FILE);
    expect(declared.sort()).toEqual(
      [
        'practiceNudgeBeforeQuestion',
        'practiceWallBeforeQuestion',
        'examNudgeBeforeStart',
        'flashcardNudgeAfterReveal',
      ].sort(),
    );
  });

  it('no file other than src/lib/nudgeGates.ts declares a gate-like function (*NudgeBefore*, *GateBefore*, *NudgeAfterReveal*)', () => {
    const offenders: string[] = [];
    for (const file of srcFiles) {
      if (file === NUDGE_GATES_FILE) continue;
      const declared = findGateLikeDeclarations(file);
      if (declared.length > 0) {
        offenders.push(`${path.relative(REPO_ROOT, file)}: ${declared.join(', ')}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
