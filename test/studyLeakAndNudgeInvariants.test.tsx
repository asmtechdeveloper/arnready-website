import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { PracticePlayer } from '@/components/PracticePlayer';
import { ExamPlayer } from '@/components/ExamPlayer';
import { FlashcardPlayer } from '@/components/FlashcardPlayer';
import { nudge, upgradeWall } from '@/lib/copy';
import type { Question } from '@/lib/quizEngine';

/**
 * M5 cross-cutting invariants (step S8), mapped to the review protocol's M5
 * checklist:
 *   A. leak discipline (§0.6 / D12): question + flashcard CONTENT reaches the
 *      signed-in client only at RUNTIME from Firestore, never through a static
 *      import — so no client module may import the build-time content export or
 *      the filesystem. The postbuild leak gate proves `out/` is clean; this
 *      proves the import graph can't reintroduce it.
 *   B. zero nudges for isPaid users on the three real surfaces — the pure gate
 *      matrix is pinned in nudgeInvariants.test.ts; this pins it at the render
 *      sites the checklist actually names.
 *
 * ("Same nudge never twice per run" and "no second gate definition in src/"
 * are already pinned per-player and by nudgeInvariants.test.ts's D10c source
 * scan, respectively — not duplicated here.)
 */

// ─── A. Static leak guard over the import graph ──────────────────────────────

const SRC_ROOT = path.resolve(import.meta.dirname, '..', 'src');

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) yield p;
  }
}

/** Every `from '…'` / `import('…')` specifier in a source file. */
function importSpecifiers(text: string): string[] {
  const specs: string[] = [];
  const re = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) if (m[1]) specs.push(m[1]);
  return specs;
}

const SRC_FILES = [...walk(SRC_ROOT)];

describe('M5 A — no client-reachable module imports question content or the filesystem (D12)', () => {
  it('reads a non-trivial number of source files (guard is not a stub)', () => {
    expect(SRC_FILES.length).toBeGreaterThan(20);
  });

  it('NO src module statically imports the free-question export — questions are Firestore-runtime only', () => {
    const offenders: string[] = [];
    for (const file of SRC_FILES) {
      const specs = importSpecifiers(readFileSync(file, 'utf8'));
      if (specs.some((s) => /content\/questions|questions\.free/.test(s))) {
        offenders.push(path.relative(SRC_ROOT, file));
      }
    }
    expect(offenders, `question content imported in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('the runtime delivery layer imports neither the content export nor node:fs', () => {
    // questionDelivery is the ONE module that fetches questions/flashcards for a
    // signed-in client. If it ever imported content/ or fs, question text would
    // be bundled into the static export — exactly the leak §0.6 forbids.
    const delivery = readFileSync(path.join(SRC_ROOT, 'lib', 'questionDelivery.ts'), 'utf8');
    const specs = importSpecifiers(delivery);
    expect(specs.some((s) => s.startsWith('content') || /\/content\//.test(s))).toBe(false);
    expect(specs.some((s) => s === 'node:fs' || s === 'fs')).toBe(false);
  });

  it("the client player/surface components import no build-time content loader or fs", () => {
    // Anything carrying `'use client'` ships to the browser. None of it may pull
    // in `src/lib/content.ts` (the fs-backed SSG loader) or the filesystem.
    const offenders: string[] = [];
    for (const file of SRC_FILES) {
      const text = readFileSync(file, 'utf8');
      if (!/^['"]use client['"]/m.test(text)) continue;
      const specs = importSpecifiers(text);
      if (specs.some((s) => s === 'node:fs' || s === 'fs' || /\blib\/content\b|@\/lib\/content/.test(s))) {
        offenders.push(path.relative(SRC_ROOT, file));
      }
    }
    expect(offenders, `client module imports fs/content loader: ${offenders.join(', ')}`).toEqual([]);
  });
});

// ─── B. Zero nudges for isPaid users on the real surfaces ────────────────────

function makeQuestions(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q${i + 1}`,
    chapter: 1,
    subtopic: 'T',
    question: `Question ${i + 1}`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    difficulty: 'medium' as const,
    isFree: true,
    isSeed: true,
  }));
}

function makeDeck(count: number) {
  const cards = Array.from({ length: count }, (_, i) => ({
    front: `F${i + 1}`,
    back: `B${i + 1}`,
    subtopic: 'T',
    cardId: `card-${i + 1}`,
    canonicalIndex: i,
  }));
  return { chapterNumber: 1, sections: [{ subtopic: 'T', cards }], cards, totalCards: count };
}

function noNudgeOrWallPresent(): void {
  expect(screen.queryByText(nudge.practice.title)).toBeNull();
  expect(screen.queryByText(nudge.exam.title)).toBeNull();
  for (const v of nudge.flashcard.variants) expect(screen.queryByText(v.title)).toBeNull();
  expect(screen.queryByText(upgradeWall.title)).toBeNull();
}

afterEach(() => cleanup());

describe('M5 B — a paid user sees no nudge and no wall on any real surface', () => {
  it('practice: no Q11 nudge and no Q21 wall across the whole run (incl. a deep link past 20)', () => {
    const questions = makeQuestions(40);
    render(<PracticePlayer chapter={1} questions={questions} startAt={21} isPaid />);
    noNudgeOrWallPresent();
    // Walk several questions from the Q11 boundary too.
    cleanup();
    render(<PracticePlayer chapter={1} questions={questions} startAt={1} isPaid />);
    for (let i = 0; i < 15; i += 1) {
      noNudgeOrWallPresent();
      fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
      const next = screen.queryByRole('button', { name: /next question/i });
      if (!next) break;
      fireEvent.click(next);
    }
  });

  it('exam: starts immediately with no pre-start nudge', () => {
    render(<ExamPlayer chapter={1} questions={makeQuestions(5)} isPaid />);
    noNudgeOrWallPresent();
    // The first question is showing — the run started with no interstitial.
    expect(screen.getByText('Question 1')).toBeInTheDocument();
  });

  it('flashcards: no nudge across a sweep well past the 45th reveal', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<FlashcardPlayer chapter={1} deck={makeDeck(60)} isPaid />);
    for (let i = 0; i < 50; i += 1) {
      noNudgeOrWallPresent();
      const reveal = screen.queryByRole('button', { name: /reveal the back/i });
      if (!reveal) break;
      fireEvent.click(reveal);
      fireEvent.click(screen.getByRole('button', { name: /i knew it/i }));
    }
    vi.restoreAllMocks();
  });
});
