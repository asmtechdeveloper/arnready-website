import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { PracticePlayer } from '@/components/PracticePlayer';
import { FREE_QUESTIONS_PER_CHAPTER, PRACTICE_GATE_INDEX } from '@/lib/nudgeGates';
import { nudge, practicePlayer as playerCopy, upgradeWall } from '@/lib/copy';
import type { Question } from '@/lib/quizEngine';

/**
 * PracticePlayer (M5 plan D7, step S4) — the review protocol's M5 checklist
 * made concrete at this specific render site:
 *   - the Q11 nudge fires once, continuing reveals the question, and it
 *     never fires again in the same run;
 *   - a free `?q=21` deep link renders the wall with zero question text
 *     anywhere in the DOM;
 *   - a paid user never sees a nudge or a wall, across the full index range;
 *   - no control ever offers a free user an index at or beyond their cap;
 *   - the component contains no second gate definition (source-scan, in the
 *     spirit of test/isPaidDiscipline.test.ts).
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

/** Answers the currently-visible question (always picks option 0, which
 * every fixture question marks correct) and advances past it if a "Next"
 * control is present. Returns whether a nudge was showing before answering. */
function answerAndAdvance(): { sawNudge: boolean; sawWall: boolean } {
  const sawNudge = screen.queryByText(nudge.practice.title) !== null;
  if (sawNudge) {
    fireEvent.click(screen.getByRole('button', { name: nudge.practice.continue }));
    return { sawNudge: true, sawWall: false };
  }
  const sawWall = screen.queryByText(upgradeWall.title) !== null;
  if (sawWall) return { sawNudge: false, sawWall: true };

  const options = screen.getAllByRole('radio');
  fireEvent.click(options[0] as HTMLElement);
  const next = screen.queryByRole('button', { name: playerCopy.next });
  if (next) fireEvent.click(next);
  return { sawNudge: false, sawWall: false };
}

describe('PracticePlayer — free user, Q11 nudge (D7)', () => {
  it('shows the nudge exactly once, at Q11, and never again for the rest of the run', () => {
    const questions = makeQuestions(FREE_QUESTIONS_PER_CHAPTER);
    render(<PracticePlayer chapter={1} questions={questions} startAt={1} isPaid={false} />);

    let nudgeCount = 0;
    let wallCount = 0;
    // Walk the entire free run (Q1..Q20) plus a safety margin of iterations.
    for (let step = 0; step < FREE_QUESTIONS_PER_CHAPTER + 5; step += 1) {
      const { sawNudge, sawWall } = answerAndAdvance();
      if (sawNudge) nudgeCount += 1;
      if (sawWall) wallCount += 1;
      if (sawWall) break;
    }

    expect(nudgeCount).toBe(1);
    expect(wallCount).toBe(0);
  });

  it('the nudge appears at Q11 (index 10) and not before', () => {
    // One question short of the gate index — no nudge yet.
    const questions = makeQuestions(FREE_QUESTIONS_PER_CHAPTER);
    render(
      <PracticePlayer chapter={1} questions={questions} startAt={PRACTICE_GATE_INDEX} isPaid={false} />,
    );
    expect(screen.queryByText(nudge.practice.title)).toBeNull();
    expect(screen.getByText('Question text number 10')).toBeInTheDocument();
  });

  it('at Q11 itself, the nudge shows; continuing reveals the question and does not re-fire', () => {
    const questions = makeQuestions(FREE_QUESTIONS_PER_CHAPTER);
    render(
      <PracticePlayer
        chapter={1}
        questions={questions}
        startAt={PRACTICE_GATE_INDEX + 1}
        isPaid={false}
      />,
    );
    expect(screen.getByText(nudge.practice.title)).toBeInTheDocument();
    expect(screen.queryByText('Question text number 11')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: nudge.practice.continue }));

    expect(screen.queryByText(nudge.practice.title)).toBeNull();
    expect(screen.getByText('Question text number 11')).toBeInTheDocument();
  });
});

describe('PracticePlayer — Q21+ wall, deep link (D7/manual §1)', () => {
  it('a free user deep-linked to ?q=21 lands on the wall, with zero question text in the DOM', () => {
    const questions = makeQuestions(FREE_QUESTIONS_PER_CHAPTER);
    const { container } = render(
      <PracticePlayer
        chapter={4}
        questions={questions}
        startAt={FREE_QUESTIONS_PER_CHAPTER + 1}
        isPaid={false}
      />,
    );

    expect(screen.getByText(upgradeWall.title)).toBeInTheDocument();

    // Not just "not visible" — the question text must not exist anywhere in
    // the rendered markup at all (no blur, no collapsed element).
    const html = container.innerHTML;
    for (const q of questions) {
      expect(html).not.toContain(q.question);
      for (const option of q.options) expect(html).not.toContain(option);
    }
    expect(screen.queryAllByRole('radio')).toHaveLength(0);

    // The wall is a hard stop: no continue/dismiss affordance.
    expect(screen.queryByRole('button')).toBeNull();
    const backLink = screen.getByRole('link', { name: upgradeWall.backToChapter });
    expect(backLink).toHaveAttribute('href', '/chapters/4');
  });

  it('the wall still holds even if the delivered array happens to be shorter than the cap', () => {
    // Defense in depth (D7): the wall check uses the requested index, never
    // clamped by the array length the caller happened to receive.
    const questions = makeQuestions(5);
    render(<PracticePlayer chapter={2} questions={questions} startAt={21} isPaid={false} />);
    expect(screen.getByText(upgradeWall.title)).toBeInTheDocument();
  });
});

describe('PracticePlayer — paid users: zero nudges, zero wall, ever (D7 point 5)', () => {
  const PAID_TOTAL = 40; // more than the free cap, to sweep well past it
  const questions = makeQuestions(PAID_TOTAL);

  it.each(
    Array.from({ length: PAID_TOTAL }, (_, i) => i + 1), // startAt = 1..40, 1-based
  )('no nudge and no wall at 1-based position %i', (startAt) => {
    render(
      <PracticePlayer chapter={1} questions={questions} startAt={startAt} isPaid={true} />,
    );
    expect(screen.queryByText(nudge.practice.title)).toBeNull();
    expect(screen.queryByText(upgradeWall.title)).toBeNull();
    expect(screen.getByText(`Question text number ${startAt}`)).toBeInTheDocument();
  });

  it('a paid user deep-linked well past the free cap still sees the question, never the wall', () => {
    render(
      <PracticePlayer
        chapter={1}
        questions={questions}
        startAt={FREE_QUESTIONS_PER_CHAPTER + 10}
        isPaid={true}
      />,
    );
    expect(screen.queryByText(upgradeWall.title)).toBeNull();
    expect(screen.getByText(`Question text number ${FREE_QUESTIONS_PER_CHAPTER + 10}`)).toBeInTheDocument();
  });
});

describe('PracticePlayer — no control ever offers an index at or beyond the cap (D7 point 4)', () => {
  it('at the last free question, there is no "Next" control — only the completion note', () => {
    const questions = makeQuestions(FREE_QUESTIONS_PER_CHAPTER);
    render(
      <PracticePlayer
        chapter={1}
        questions={questions}
        startAt={FREE_QUESTIONS_PER_CHAPTER}
        isPaid={false}
      />,
    );
    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);

    expect(screen.queryByRole('button', { name: playerCopy.next })).toBeNull();
    expect(screen.getByText(playerCopy.setComplete)).toBeInTheDocument();
  });

  it('walking every "Next" press in a free run never reveals a question past the cap', () => {
    // Clicking every available "Next" control from Q1 must never surface a
    // question beyond the delivered (already-capped) array — proof that no
    // control offers an index the free user isn't entitled to.
    const questions = makeQuestions(FREE_QUESTIONS_PER_CHAPTER);
    render(<PracticePlayer chapter={1} questions={questions} startAt={1} isPaid={false} />);

    for (let step = 0; step < FREE_QUESTIONS_PER_CHAPTER + 5; step += 1) {
      answerAndAdvance();
      expect(screen.queryByText(`Question text number ${FREE_QUESTIONS_PER_CHAPTER + 1}`)).toBeNull();
    }
    // The run ended on the completion note, not a "Next" control.
    expect(screen.queryByRole('button', { name: playerCopy.next })).toBeNull();
    expect(screen.getByText(playerCopy.setComplete)).toBeInTheDocument();
  });
});

describe('PracticePlayer — structural guard: no gate arithmetic in this component', () => {
  const SOURCE = readFileSync(
    path.resolve(import.meta.dirname, '..', 'src', 'components', 'PracticePlayer.tsx'),
    'utf8',
  );
  // Comments explain the pinned functions' own semantics in prose — strip
  // them so a code-scan can't be defeated by explanatory text mentioning a
  // number, the same discipline test/isPaidDiscipline.test.ts applies.
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('never re-derives the Q11 gate index as a literal comparison', () => {
    expect(CODE).not.toMatch(/===\s*10\b/);
    expect(CODE).not.toMatch(/10\s*===/);
  });

  it('never re-derives the free cap as a literal comparison', () => {
    expect(CODE).not.toMatch(/>=\s*20\b/);
    expect(CODE).not.toMatch(/20\s*<=/);
    expect(CODE).not.toMatch(/\.length\s*>\s*20\b/);
  });

  it('never reimplements the flashcard-style modulo gate', () => {
    expect(CODE).not.toMatch(/%\s*15\b/);
  });

  it('imports the gate decisions from src/lib/nudgeGates.ts rather than reimplementing them', () => {
    expect(CODE).toMatch(/from ['"]@\/lib\/nudgeGates['"]/);
    expect(CODE).toMatch(/practiceWallBeforeQuestion/);
    expect(CODE).toMatch(/practiceNudgeBeforeQuestion/);
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

  it('renders <PremiumNudge> and <UpgradeWall> verbatim, never restyled or wrapped in a variant', () => {
    expect(CODE).toMatch(/<PremiumNudge\s+variant="practice"/);
    expect(CODE).toMatch(/<UpgradeWall\s+returnTo=/);
  });
});
