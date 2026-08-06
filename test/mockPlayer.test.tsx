import { readFileSync } from 'node:fs';
import path from 'node:path';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { MOCK_DURATION_MIN } from '@/lib/mockConfig';
import { mockPlayer as copy, mockResults as resultsCopy } from '@/lib/copy';
import type { Question } from '@/lib/quizEngine';

/**
 * MockPlayer (M6) — the 100-question timed mock run, ported from
 * ../ARNReady-App/screens/MockTestScreen.js. These pin the properties a
 * reviewer must not take on trust:
 *   - the palette grid states and the flag/visited bookkeeping;
 *   - keyboard operation (design doc §7: first-class for laptop mocks);
 *   - the LOCKED submit flow (counting confirm vs. simple confirm), and
 *     recording EXACTLY ONCE with the exact service payload — proven under
 *     StrictMode so the submittedRef + useRecordOnce guards are genuinely
 *     exercised;
 *   - auto-submit at zero fires the recording once, never twice;
 *   - a confirmed exit records NOTHING (incomplete attempts are never
 *     recorded — LOCKED);
 *   - beforeunload is registered while the run is live and removed on
 *     submit (the web's hardware-back-confirm equivalent);
 *   - the zero-nudge pin: no nudge/wall machinery is imported, ever.
 *
 * The M6 service and the backend seam are mocked so these assert the CALL
 * the player makes — the write shapes themselves are mockServicePort.test.ts's
 * scope (same division as test/resultsRecording.test.tsx).
 */

const recordMockAttempt = vi.fn();
const firestoreBackend = vi.fn();

// Preserve every real export and override the record function plus the
// history read (MockResults calls it after submit; its stats fall back to
// the current attempt on an empty history — pinned in mockResults.test.tsx).
vi.mock('@/lib/mockService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mockService')>()),
  recordMockAttempt: (...args: unknown[]) => recordMockAttempt(...args),
  getMockHistory: async () => [],
}));

vi.mock('@/lib/progressBackend', () => ({
  firestoreBackend: () => firestoreBackend(),
}));

// Imported AFTER the mocks are registered.
const { MockPlayer } = await import('@/components/MockPlayer');

/** A non-null backend stub — its methods are never reached (the service is mocked). */
const STUB_BACKEND = { uid: () => 'test-uid' };

const INITIAL_SECS = MOCK_DURATION_MIN * 60;

/** Chapter varies per question (i + 1) so weakChapters expectations are exact. */
function makeQuestions(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q${String(i + 1).padStart(3, '0')}`,
    chapter: i + 1,
    subtopic: 'Test Topic',
    question: `Question text number ${i + 1}`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: 0,
    difficulty: 'medium' as const,
    isFree: true,
    isSeed: true,
  }));
}

function cell(n: number, stateLabel: string): HTMLElement {
  return screen.getByRole('button', { name: copy.cellLabel(n, stateLabel) });
}

beforeEach(() => {
  // Fake timers throughout: the countdown starts on mount, and a real 1s
  // interval firing mid-test would be an un-acted state update.
  vi.useFakeTimers();
  recordMockAttempt.mockReset();
  firestoreBackend.mockReset();
  firestoreBackend.mockReturnValue(STUB_BACKEND);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('MockPlayer — question panel and palette states', () => {
  it('renders question 1 of N, selects an option, and flips the palette cell to answered', () => {
    const questions = makeQuestions(4);
    render(<MockPlayer questions={questions} isPaid={false} onExit={() => {}} />);

    expect(screen.getByText(copy.counter(1, 4))).toBeInTheDocument();
    expect(screen.getByText('Question text number 1')).toBeInTheDocument();

    // Index 0 is pre-visited, so its cell starts in the visited state.
    expect(cell(1, copy.legend.visited).className).toContain('bg-palette-visited-bg');

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    fireEvent.click(radios[1] as HTMLElement);
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');

    // Answers stay changeable until submit (never locked in).
    fireEvent.click(radios[2] as HTMLElement);
    expect(radios[2]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveAttribute('aria-checked', 'false');

    expect(cell(1, copy.legend.answered).className).toContain('bg-green');
    // The active cell carries the purple border.
    expect(cell(1, copy.legend.answered).className).toContain('border-purple');
  });

  it('palette jump marks visited; flag toggles amber and aria state; the legend renders all four states', () => {
    const questions = makeQuestions(5);
    render(<MockPlayer questions={questions} isPaid={false} onExit={() => {}} />);

    // Jump to Q3 via the palette, then back to Q1 — Q3's cell stays visited.
    fireEvent.click(cell(3, copy.legend.notVisited));
    expect(screen.getByText(copy.counter(3, 5))).toBeInTheDocument();
    fireEvent.click(cell(1, copy.legend.visited));
    expect(screen.getByText(copy.counter(1, 5))).toBeInTheDocument();
    expect(cell(3, copy.legend.visited).className).toContain('bg-palette-visited-bg');

    // Flag the current question (Q1): amber cell + pressed toggle.
    const flagButton = screen.getByRole('button', { name: copy.flagOff });
    expect(flagButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(flagButton);
    expect(screen.getByRole('button', { name: copy.flagOn })).toHaveAttribute('aria-pressed', 'true');
    expect(cell(1, copy.legend.flagged).className).toContain('bg-amber');

    // Un-flag restores the (visited) state.
    fireEvent.click(screen.getByRole('button', { name: copy.flagOn }));
    expect(cell(1, copy.legend.visited)).toBeInTheDocument();

    // Legend: all four state labels present.
    for (const label of Object.values(copy.legend)) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('keyboard: "2" selects option B, arrows navigate, "f" flags', () => {
    const questions = makeQuestions(3);
    render(<MockPlayer questions={questions} isPaid={false} onExit={() => {}} />);

    fireEvent.keyDown(window, { key: '2' });
    expect(screen.getAllByRole('radio')[1]).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(copy.counter(2, 3))).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(copy.counter(1, 3))).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'f' });
    expect(screen.getByRole('button', { name: copy.flagOn })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('MockPlayer — LOCKED submit flow + exactly-once recording', () => {
  it('shows the counting confirm for unanswered/flagged, then records ONCE with the exact payload (StrictMode)', () => {
    const questions = makeQuestions(4);
    render(
      <StrictMode>
        <MockPlayer questions={questions} isPaid={false} onExit={() => {}} />
      </StrictMode>,
    );

    // 5 seconds elapse before submitting — timeTaken must reflect it.
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Q1: correct (option A). Q2: wrong (option B) and flagged. Q3/Q4 untouched.
    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.click(screen.getAllByRole('radio')[1] as HTMLElement);
    fireEvent.keyDown(window, { key: 'f' });

    fireEvent.click(screen.getByRole('button', { name: copy.submit }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(copy.confirmSubmit.title)).toBeInTheDocument();
    expect(
      within(dialog).getByText(copy.confirmSubmit.remaining(2, 1)),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: copy.confirmSubmit.cancelRemaining }),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: copy.confirmSubmit.confirm }));

    expect(recordMockAttempt).toHaveBeenCalledTimes(1);
    const [backendArg, payload] = recordMockAttempt.mock.calls[0]!;
    expect(backendArg).toBe(STUB_BACKEND);
    expect(payload).toEqual({
      score: 1,
      total: 4,
      percentage: 25, // round(1/4 * 100)
      timeTaken: 5,
      weakChapters: [2], // only Q2 (chapter 2) was answered wrong
      answers: [0, 1, null, null],
      questions,
    });

    // The results block renders with the attempt's score.
    expect(screen.getByText(resultsCopy.scoreLine(1, 4))).toBeInTheDocument();
  });

  it('shows the simple confirm when all questions are answered and none flagged; cancel records nothing', () => {
    const questions = makeQuestions(2);
    render(<MockPlayer questions={questions} isPaid={false} onExit={() => {}} />);

    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);

    fireEvent.click(screen.getByRole('button', { name: copy.submit }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(copy.confirmSubmit.allAnswered)).toBeInTheDocument();

    // Cancelling keeps the run alive and records nothing.
    fireEvent.click(within(dialog).getByRole('button', { name: copy.confirmSubmit.cancelAllAnswered }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(recordMockAttempt).not.toHaveBeenCalled();
    expect(screen.getByText(copy.counter(2, 2))).toBeInTheDocument();
  });

  it('skips recording (but still completes) when the backend is null — same null handling as the other players', () => {
    firestoreBackend.mockReturnValue(null);
    const questions = makeQuestions(1);
    expect(() => {
      render(<MockPlayer questions={questions} isPaid={false} onExit={() => {}} />);
      fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
      fireEvent.click(screen.getByRole('button', { name: copy.submit }));
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: copy.confirmSubmit.confirm }),
      );
    }).not.toThrow();

    expect(recordMockAttempt).not.toHaveBeenCalled();
    expect(screen.getByText(resultsCopy.scoredLabel)).toBeInTheDocument();
  });
});

describe('MockPlayer — timer', () => {
  it('auto-submits exactly once when the countdown reaches zero (StrictMode, extra ticks after zero)', () => {
    const questions = makeQuestions(3);
    render(
      <StrictMode>
        <MockPlayer questions={questions} isPaid={false} onExit={() => {}} />
      </StrictMode>,
    );

    act(() => {
      vi.advanceTimersByTime(INITIAL_SECS * 1000);
    });

    expect(recordMockAttempt).toHaveBeenCalledTimes(1);
    expect(recordMockAttempt.mock.calls[0]![1]).toMatchObject({
      score: 0,
      total: 3,
      percentage: 0,
      timeTaken: INITIAL_SECS,
      answers: [null, null, null],
    });
    expect(screen.getByText(resultsCopy.scoreLine(0, 3))).toBeInTheDocument();

    // Pending timers after zero must never produce a second submission.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(recordMockAttempt).toHaveBeenCalledTimes(1);
  });
});

describe('MockPlayer — exit', () => {
  it('Escape cancels the exit dialog; confirming calls onExit and records NOTHING', () => {
    const onExit = vi.fn();
    const questions = makeQuestions(2);
    render(<MockPlayer questions={questions} isPaid={false} onExit={onExit} />);

    fireEvent.click(screen.getByRole('button', { name: copy.exit }));
    let dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(copy.confirmExit.body)).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onExit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: copy.exit }));
    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: copy.confirmExit.confirm }));

    expect(onExit).toHaveBeenCalledTimes(1);
    // LOCKED: incomplete attempts are never recorded.
    expect(recordMockAttempt).not.toHaveBeenCalled();
  });
});

describe('MockPlayer — beforeunload guard', () => {
  it('registers beforeunload while the run is live and removes it after submit', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const added = () => addSpy.mock.calls.filter((c) => c[0] === 'beforeunload').length;
    const removed = () => removeSpy.mock.calls.filter((c) => c[0] === 'beforeunload').length;

    const questions = makeQuestions(1);
    render(<MockPlayer questions={questions} isPaid={false} onExit={() => {}} />);

    expect(added()).toBeGreaterThan(0);
    expect(added()).toBeGreaterThan(removed()); // live: one handler currently attached

    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: copy.submit }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: copy.confirmSubmit.confirm }),
    );

    // After submit every registration has been removed — no warning lingers
    // on the completion screen, and none is re-registered.
    expect(removed()).toBe(added());

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('MockPlayer — empty paper', () => {
  it('renders the empty state — never a 0-question timed run, never a crash', () => {
    render(<MockPlayer questions={[]} isPaid={false} onExit={() => {}} />);

    expect(screen.getByText(copy.empty.title)).toBeInTheDocument();
    expect(screen.getByText(copy.empty.body)).toBeInTheDocument();
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.queryByRole('button', { name: copy.submit })).toBeNull();

    // No countdown ever starts, so nothing can auto-submit.
    act(() => {
      vi.advanceTimersByTime(INITIAL_SECS * 1000);
    });
    expect(recordMockAttempt).not.toHaveBeenCalled();
  });
});

describe('MockPlayer — structural zero-nudge pin (manual §1)', () => {
  // Same comment-stripped source-scan discipline as examPlayer.test.tsx /
  // test/isPaidDiscipline.test.ts. studyLeakAndNudgeInvariants.test.tsx's
  // section B is a RENDER-level sweep of the M5 players; this per-file
  // source pin lives here, next to the component's own suite, exactly as
  // ExamPlayer's structural guards do.
  const SOURCE = readFileSync(
    path.resolve(import.meta.dirname, '..', 'src', 'components', 'MockPlayer.tsx'),
    'utf8',
  );
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('imports no nudge or wall machinery — the mock run is a zero-nudge surface', () => {
    expect(CODE).not.toMatch(/PremiumNudge/);
    expect(CODE).not.toMatch(/UpgradeWall/);
    expect(CODE).not.toMatch(/nudgeGates/);
  });

  it('never assembles the paper itself — questions arrive already assembled', () => {
    expect(CODE).not.toMatch(/assembleMock/);
    expect(CODE).not.toMatch(/MOCK_CHAPTER_WEIGHTS/);
  });

  it('records through recordMockAttempt only, never through the backend directly', () => {
    expect(CODE).toMatch(/recordMockAttempt\s*\(/);
    expect(CODE).not.toMatch(/appendMockAttempt/);
    expect(CODE).not.toMatch(/writeSessionLog/);
  });
});
