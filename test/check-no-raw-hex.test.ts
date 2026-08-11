import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Regression coverage for the raw-hex design-system gate (Codex M6-B2).
 *
 * THE DEFECT: `npm run lint` is a mandatory §0.11 gate, and it stopped
 * reproducing. The walker recursed into `.claude/worktrees/<name>/` — a
 * SEPARATE checkout of this repo created by an agent task — whose own
 * `src/styles/tokens.ts` is not the allowlisted path, so the guard reported
 * the locked palette as an illegal duplicate. Whether the required gate
 * passed therefore depended on unrelated local worktree state.
 *
 * These tests exercise the real script against synthetic fixtures, using
 * check-paid-leak.test.ts's isolation idiom: the script resolves ROOT from
 * its OWN location (`import.meta.dirname`), so each test copies it into a
 * fresh temp directory and runs it there. Nothing touches this repo's tree.
 */
const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPT_SRC = path.join(REPO_ROOT, 'scripts', 'check-no-raw-hex.mjs');

/**
 * Fixture colours are COMPOSED, never written as literals — this file is
 * scanned by the very guard it tests, and `test/tokens.test.ts` set the
 * precedent (it checksums the palette rather than restating it) precisely so
 * the guard can scan every test like any other file. A literal here would
 * make the suite fail itself, and allowlisting it would blunt the guard.
 */
const hex = (body: string) => `#${body}`;
const PURPLE = hex('534AB7');
const GREEN = hex('1D9E75');
const CREAM = hex('F5F5F0');
const OFFENDING = hex('FF00AA');

let tempRoot: string;

/** The locked palette file, at the one path the guard allows. */
function writeAllowedTokens(): void {
  const dir = path.join(tempRoot, 'src', 'styles');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, 'tokens.ts'),
    `export const colors = { purple: '${PURPLE}', green: '${GREEN}', bg: '${CREAM}' } as const;\n`,
  );
}

/**
 * A nested checkout at `where`, exactly as a git worktree appears on disk:
 * a `.git` FILE holding a gitdir pointer (not a directory), plus its own
 * copy of the token file. This is the M6-B2 reproduction fixture.
 */
function writeNestedCheckout(where: string, gitEntry: 'file' | 'dir' = 'file'): void {
  const root = path.join(tempRoot, where);
  mkdirSync(path.join(root, 'src', 'styles'), { recursive: true });
  if (gitEntry === 'file') {
    writeFileSync(path.join(root, '.git'), 'gitdir: /somewhere/.git/worktrees/fixture\n');
  } else {
    mkdirSync(path.join(root, '.git'), { recursive: true });
  }
  writeFileSync(
    path.join(root, 'src', 'styles', 'tokens.ts'),
    `export const colors = { purple: '${PURPLE}', green: '${GREEN}' } as const;\n`,
  );
}

function runGate(): { ok: boolean; output: string } {
  try {
    const stdout = execFileSync('node', [path.join('scripts', 'check-no-raw-hex.mjs')], {
      cwd: tempRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output: stdout };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(tmpdir(), 'arnready-hex-gate-'));
  mkdirSync(path.join(tempRoot, 'scripts'), { recursive: true });
  copyFileSync(SCRIPT_SRC, path.join(tempRoot, 'scripts', 'check-no-raw-hex.mjs'));
  writeAllowedTokens();
});

afterEach(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

describe('raw-hex gate — nested checkouts never affect the result (M6-B2)', () => {
  it('passes with a `.claude/worktrees/<name>` checkout present — the exact reported failure', () => {
    writeNestedCheckout(path.join('.claude', 'worktrees', 'hungry-zhukovsky-5337d4'));
    const { ok, output } = runGate();
    expect(ok, output).toBe(true);
    expect(output).toContain('Raw-hex guard PASSED');
  });

  it('passes with a nested checkout ANYWHERE, not only under .claude', () => {
    // The `.git`-entry check, independent of the directory name: a worktree
    // parked at the repo root must not be judged by this repo's gate either.
    writeNestedCheckout('some-other-worktree');
    const { ok, output } = runGate();
    expect(ok, output).toBe(true);
  });

  it('skips a nested CLONE (.git as a directory) as well as a worktree (.git as a file)', () => {
    writeNestedCheckout('nested-clone', 'dir');
    const { ok, output } = runGate();
    expect(ok, output).toBe(true);
  });

  it('still FAILS on a real offence in this tree — the fix narrows scope, not enforcement', () => {
    writeNestedCheckout(path.join('.claude', 'worktrees', 'w1'));
    mkdirSync(path.join(tempRoot, 'src', 'components'), { recursive: true });
    writeFileSync(
      path.join(tempRoot, 'src', 'components', 'Bad.tsx'),
      `export const Bad = () => <div style={{ color: '${OFFENDING}' }} />;\n`,
    );
    const { ok, output } = runGate();
    expect(ok).toBe(false);
    expect(output).toContain('RAW-HEX GUARD FAILED');
    expect(output).toContain('Bad.tsx');
    // And it reports ONLY the real offence — never the nested checkout's file.
    expect(output).not.toContain('worktrees');
  });

  it('still FAILS on a second token file inside this tree (the duplicate it exists to catch)', () => {
    // Same file name, same content — but a genuine part of THIS checkout, so
    // it is still an illegal second source of palette truth.
    const dir = path.join(tempRoot, 'src', 'styles', 'copy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'tokens.ts'), `export const purple = '${PURPLE}';\n`);
    const { ok, output } = runGate();
    expect(ok).toBe(false);
    expect(output).toContain('RAW-HEX GUARD FAILED');
  });
});
