import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { computeExamScorePct, type Question } from '@/lib/quizEngine';
import { practicePlayer, examPlayer, flashcardPlayer, results as resultsCopy, nudge } from '@/lib/copy';

/**
 * S7 — end-of-run recording + minimal results screens (M5 plan D10).
 *
 * These pin the three properties a reviewer must not take on trust:
 *   1. each mode records through the M4 service EXACTLY ONCE — proven under
 *      React StrictMode, which double-invokes effects, so the useRecordOnce
 *      latch is genuinely exercised rather than assumed;
 *   2. a null backend (signed out / Firebase unavailable) still shows results,
 *      records nothing, and never throws;
 *   3. the free exam result is the honest locked percentage, never the
 *      misleading raw "correct/served" fraction.
 *
 * The M4 service and the backend seam are mocked so these assert the CALL the
 * player makes — the write shapes themselves are M4's own parity suite.
 */

const recordPracticeSession = vi.fn();
const recordExamSession = vi.fn();
const recordFlashcardSession = vi.fn();
const firestoreBackend = vi.fn();

// Preserve every real export (FREE_SCORE_FLOOR, EXAM_SCOPE, … which quizEngine
// and others import) and override ONLY the three record functions.
vi.mock('@/lib/progressService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/progressService')>()),
  recordPracticeSession: (...args: unknown[]) => recordPracticeSession(...args),
  recordExamSession: (...args: unknown[]) => recordExamSession(...args),
  recordFlashcardSession: (...args: unknown[]) => recordFlashcardSession(...args),
}));

vi.mock('@/lib/progressBackend', () => ({
  firestoreBackend: () => firestoreBackend(),
}));

// Imported AFTER the mocks are registered.
const { PracticePlayer } = await import('@/components/PracticePlayer');
const { ExamPlayer } = await import('@/components/ExamPlayer');
const { FlashcardPlayer } = await import('@/components/FlashcardPlayer');

/** A non-null backend stub — its methods are never reached (the service is mocked). */
const STUB_BACKEND = { uid: () => 'test-uid' };

function makeQuestions(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q${i + 1}`,
    chapter: 1,
    subtopic: 'Test Topic',
    question: `Question text number ${i + 1}`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    difficulty: 'medium' as const,
    isFree: true,
    isSeed: true,
  }));
}

function makeDeck(count: number) {
  const cards = Array.from({ length: count }, (_, i) => ({
    front: `Front ${i + 1}`,
    back: `Back ${i + 1}`,
    subtopic: 'Test Topic',
    cardId: `card-${i + 1}`,
    canonicalIndex: i,
  }));
  return { chapterNumber: 1, sections: [{ subtopic: 'Test Topic', cards }], cards, totalCards: count };
}

beforeEach(() => {
  recordPracticeSession.mockReset();
  recordExamSession.mockReset();
  recordFlashcardSession.mockReset();
  firestoreBackend.mockReset();
  firestoreBackend.mockReturnValue(STUB_BACKEND);
});

afterEach(() => cleanup());

/** Answer the current practice/exam question with `optionIndex`, then advance. */
function answer(optionIndex: number, advanceLabel: string) {
  fireEvent.click(screen.getAllByRole('radio')[optionIndex] as HTMLElement);
  fireEvent.click(screen.getByRole('button', { name: advanceLabel }));
}

describe('S7 practice recording + results', () => {
  it('records once (even under StrictMode) with the full answers array, then shows the score', () => {
    const questions = makeQuestions(3);
    render(
      <StrictMode>
        <PracticePlayer chapter={7} questions={questions} startAt={1} isPaid={false} />
      </StrictMode>,
    );

    // Answer Q1 correct, Q2 wrong, Q3 correct, then open results.
    answer(0, practicePlayer.next); // Q1 correct
    answer(1, practicePlayer.next); // Q2 wrong
    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement); // Q3 correct
    fireEvent.click(screen.getByRole('button', { name: practicePlayer.seeResults }));

    expect(recordPracticeSession).toHaveBeenCalledTimes(1);
    const [backendArg, payload] = recordPracticeSession.mock.calls[0]!;
    expect(backendArg).toBe(STUB_BACKEND);
    expect(payload).toMatchObject({
      chapterNumber: 7,
      correct: 2,
      attempted: 3,
      scorePct: 67, // round(2/3 * 100)
    });
    // The full parallel answers array is passed so the mistakes hook has real
    // data — not a discarded single pick.
    expect(payload.answers).toEqual([0, 1, 0]);
    expect(payload.questions).toHaveLength(3);

    // Results screen shows the honest accuracy line.
    expect(
      screen.getByText(resultsCopy.practice.headline(2, 3, 67)),
    ).toBeInTheDocument();
  });

  it('shows results but records nothing when the backend is null (fail-closed, no throw)', () => {
    firestoreBackend.mockReturnValue(null);
    const questions = makeQuestions(1);
    expect(() => {
      render(<PracticePlayer chapter={1} questions={questions} startAt={1} isPaid={false} />);
      fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
      fireEvent.click(screen.getByRole('button', { name: practicePlayer.seeResults }));
    }).not.toThrow();

    expect(recordPracticeSession).not.toHaveBeenCalled();
    expect(screen.getByText(resultsCopy.practice.title)).toBeInTheDocument();
  });
});

describe('S7 exam recording + honest score', () => {
  it('records once with the captured examScope and shows the locked percentage, not a raw fraction', () => {
    // 10 questions, free; answer 7 correct + 3 wrong → computeExamScorePct
    // free = 7 / max(10, 10) = 70%. The dishonest "7/20" must never appear.
    const questions = makeQuestions(10);
    render(
      <StrictMode>
        <ExamPlayer chapter={4} questions={questions} isPaid={false} />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('button', { name: nudge.exam.continue }));

    for (let i = 0; i < 10; i += 1) {
      const correct = i < 7; // first 7 correct, last 3 wrong
      const isLast = i === 9;
      fireEvent.click(screen.getAllByRole('radio')[correct ? 0 : 1] as HTMLElement);
      fireEvent.click(screen.getByRole('button', { name: isLast ? examPlayer.submit : examPlayer.next }));
    }

    const expectedPct = computeExamScorePct({ isPaid: false, correct: 7, attempted: 10, served: 10 });
    expect(expectedPct).toBe(70);

    expect(recordExamSession).toHaveBeenCalledTimes(1);
    expect(recordExamSession.mock.calls[0]![1]).toMatchObject({
      chapterNumber: 4,
      correct: 7,
      attempted: 10,
      served: 10,
      scorePct: 70,
      examScope: 'sample',
    });

    expect(screen.getByText(resultsCopy.exam.headline(70))).toBeInTheDocument();
    // No raw correct/served fraction anywhere on the results surface.
    expect(screen.queryByText(/\b\d+\s*\/\s*\d+\b/)).toBeNull();
  });
});

describe('S7 flashcard recording + results', () => {
  it('records once with the self-grades and shows the knew-count, no percentage', () => {
    const deck = makeDeck(2);
    render(
      <StrictMode>
        <FlashcardPlayer chapter={9} deck={deck} isPaid={false} />
      </StrictMode>,
    );

    // Card 1: knew. Card 2: didn't know → deck finishes.
    fireEvent.click(screen.getByRole('button', { name: flashcardPlayer.reveal }));
    fireEvent.click(screen.getByRole('button', { name: flashcardPlayer.knew }));
    fireEvent.click(screen.getByRole('button', { name: flashcardPlayer.reveal }));
    fireEvent.click(screen.getByRole('button', { name: flashcardPlayer.didntKnow }));

    expect(recordFlashcardSession).toHaveBeenCalledTimes(1);
    const payload = recordFlashcardSession.mock.calls[0]![1];
    expect(payload.chapterNumber).toBe(9);
    expect(payload.grades).toEqual([
      { front: 'Front 1', subtopic: 'Test Topic', knew: true },
      { front: 'Front 2', subtopic: 'Test Topic', knew: false },
    ]);

    expect(screen.getByText(resultsCopy.flashcards.headline(1, 2))).toBeInTheDocument();
  });
});
