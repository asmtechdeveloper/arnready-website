import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ExamPlayer } from '@/components/ExamPlayer';
import { examPlayer as playerCopy, nudge } from '@/lib/copy';
import type { Question } from '@/lib/quizEngine';

/**
 * ExamPlayer (M5 plan D8, step S5) — the review protocol's M5 checklist
 * made concrete at this specific render site:
 *   - exactly one pre-start nudge for a free user, never mid-run;
 *   - a paid user never sees a nudge, anywhere, ever;
 *   - the component contains no second gate definition and calls no
 *     per-question gate at all (source-scan, in the spirit of
 *     test/isPaidDiscipline.test.ts and test/practicePlayer.test.tsx);
 *   - `examScope` is captured immutably at start and survives an
 *     entitlement flip mid-run without recomputing or re-nudging.
 */

function makeQuestions(count: number, chapter = 1): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q${chapter}-${String(i + 1).padStart(3, '0')}`,
    chapter,
    question: `Question text number ${i + 1}`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: 0,
    explanation: `Explanation for question ${i + 1}`,
    difficulty: 'easy',
    isFree: true,
    isSeed: true,
  }));
}

/** Answers the currently-visible question (always picks option 0) and
 * presses whichever control is showing — "Next question" or, on the last
 * question, "Submit exam". */
function answerAndAdvance(isLast: boolean) {
  const radios = screen.getAllByRole('radio');
  fireEvent.click(radios[0] as HTMLElement);
  const label = isLast ? playerCopy.submit : playerCopy.next;
  fireEvent.click(screen.getByRole('button', { name: label }));
}

describe('ExamPlayer — free user, one pre-start nudge, never mid-run (D8 point 1/2)', () => {
  it('shows the pre-start nudge; continuing starts the exam; no nudge reappears for any question through submission', () => {
    const questions = makeQuestions(5);
    render(<ExamPlayer chapter={1} questions={questions} isPaid={false} />);

    expect(screen.getByText(nudge.exam.title)).toBeInTheDocument();
    expect(screen.queryByText('Question text number 1')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: nudge.exam.continue }));

    expect(screen.queryByText(nudge.exam.title)).toBeNull();
    expect(screen.getByText('Question text number 1')).toBeInTheDocument();

    for (let i = 0; i < questions.length; i += 1) {
      expect(screen.queryByText(nudge.exam.title)).toBeNull();
      answerAndAdvance(i === questions.length - 1);
      expect(screen.queryByText(nudge.exam.title)).toBeNull();
    }

    expect(screen.getByText(playerCopy.complete)).toBeInTheDocument();
    expect(screen.queryByText(nudge.exam.title)).toBeNull();
  });

  it('an answer is never revealed as correct/incorrect and carries no explanation ("no peeking")', () => {
    const questions = makeQuestions(3);
    render(<ExamPlayer chapter={1} questions={questions} isPaid={false} />);
    fireEvent.click(screen.getByRole('button', { name: nudge.exam.continue }));

    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);

    expect(screen.queryByText('Correct')).toBeNull();
    expect(screen.queryByText('Incorrect')).toBeNull();
    expect(screen.queryByText('Explanation for question 1')).toBeNull();
  });
});

describe('ExamPlayer — paid user: zero nudge, exam starts immediately (D8 point 7)', () => {
  it('never shows a nudge, at start or across the whole run', () => {
    const questions = makeQuestions(4);
    render(<ExamPlayer chapter={1} questions={questions} isPaid={true} />);

    expect(screen.queryByText(nudge.exam.title)).toBeNull();
    expect(screen.getByText('Question text number 1')).toBeInTheDocument();

    for (let i = 0; i < questions.length; i += 1) {
      expect(screen.queryByText(nudge.exam.title)).toBeNull();
      answerAndAdvance(i === questions.length - 1);
      expect(screen.queryByText(nudge.exam.title)).toBeNull();
    }

    expect(screen.getByText(playerCopy.complete)).toBeInTheDocument();
  });
});

describe('ExamPlayer — examScope captured immutably (D8 point 4)', () => {
  it("captures 'sample' for a free user, once the run starts", () => {
    const questions = makeQuestions(3);
    render(<ExamPlayer chapter={1} questions={questions} isPaid={false} />);
    fireEvent.click(screen.getByRole('button', { name: nudge.exam.continue }));
    expect(screen.getByTestId('exam-player-state')).toHaveAttribute('data-scope', 'sample');
  });

  it("captures 'full' for a paid user, immediately", () => {
    const questions = makeQuestions(3);
    render(<ExamPlayer chapter={1} questions={questions} isPaid={true} />);
    expect(screen.getByTestId('exam-player-state')).toHaveAttribute('data-scope', 'full');
  });

  it('an isPaid flip after the exam starts does not change the captured scope or inject a nudge', () => {
    const questions = makeQuestions(3);
    const { rerender } = render(<ExamPlayer chapter={1} questions={questions} isPaid={false} />);
    fireEvent.click(screen.getByRole('button', { name: nudge.exam.continue }));
    expect(screen.getByTestId('exam-player-state')).toHaveAttribute('data-scope', 'sample');

    // Simulate an entitlement flip mid-run by re-rendering the same instance
    // with a different `isPaid` prop — the scope must not be recomputed, and
    // no nudge may appear now that the run has already begun.
    rerender(<ExamPlayer chapter={1} questions={questions} isPaid={true} />);

    expect(screen.getByTestId('exam-player-state')).toHaveAttribute('data-scope', 'sample');
    expect(screen.queryByText(nudge.exam.title)).toBeNull();

    // The run keeps going undisturbed.
    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: playerCopy.next }));
    expect(screen.getByTestId('exam-player-state')).toHaveAttribute('data-scope', 'sample');
    expect(screen.queryByText(nudge.exam.title)).toBeNull();
  });
});

describe('ExamPlayer — structural guard: exactly one gate call, no arithmetic, no wall (D6/D8)', () => {
  const SOURCE = readFileSync(
    path.resolve(import.meta.dirname, '..', 'src', 'components', 'ExamPlayer.tsx'),
    'utf8',
  );
  // Strip comments so a code-scan can't be defeated by explanatory prose
  // mentioning a gate name or a number — same discipline as
  // test/isPaidDiscipline.test.ts and test/practicePlayer.test.tsx.
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('calls examNudgeBeforeStart exactly once in the whole file', () => {
    const matches = CODE.match(/examNudgeBeforeStart\s*\(/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('never calls any other gate function from nudgeGates.ts', () => {
    expect(CODE).not.toMatch(/practiceNudgeBeforeQuestion/);
    expect(CODE).not.toMatch(/practiceWallBeforeQuestion/);
    expect(CODE).not.toMatch(/flashcardNudgeAfterReveal/);
  });

  it('never re-derives a gate threshold as literal arithmetic', () => {
    expect(CODE).not.toMatch(/===\s*10\b/);
    expect(CODE).not.toMatch(/10\s*===/);
    expect(CODE).not.toMatch(/>=\s*20\b/);
    expect(CODE).not.toMatch(/20\s*<=/);
    expect(CODE).not.toMatch(/\.length\s*>\s*20\b/);
    expect(CODE).not.toMatch(/%\s*15\b/);
  });

  it('declares no gate-like function of its own (*NudgeBefore*, *GateBefore*, *WallBefore*, *NudgeAfterReveal*)', () => {
    const declRe = /\b(?:function|const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[=(]/g;
    const gateNameRe = /(Nudge|Gate|Wall)Before|NudgeAfterReveal/;
    const offenders: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = declRe.exec(CODE)) !== null) {
      const name = match[1];
      if (name !== undefined && gateNameRe.test(name)) offenders.push(name);
    }
    expect(offenders).toEqual([]);
  });

  it('never imports or renders <UpgradeWall> — there is no exam wall', () => {
    expect(CODE).not.toMatch(/UpgradeWall/);
  });

  it('renders <PremiumNudge variant="exam"> verbatim, never restyled or wrapped in a variant', () => {
    expect(CODE).toMatch(/<PremiumNudge\s+variant="exam"/);
  });

  it('imports the gate decision from src/lib/nudgeGates.ts rather than reimplementing it', () => {
    expect(CODE).toMatch(/from ['"]@\/lib\/nudgeGates['"]/);
    expect(CODE).toMatch(/examNudgeBeforeStart/);
  });
});
