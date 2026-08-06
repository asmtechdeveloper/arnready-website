import { readFileSync } from 'node:fs';
import path from 'node:path';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { MistakeQuestion } from '@/lib/mistakesService';

/**
 * MistakesPlayer (M6) — the deck re-attempt run, the web port of
 * QuizScreen's `source === 'mistakes'` behaviours. Pins:
 *
 *   - the deck badge and practice-style answer feedback with explanation;
 *   - the retire line's EXACT app computation (QuizScreen.js:653-660):
 *     correct on a streak-0 question → retireProgress; correct on a
 *     streak-1 question (this answer completes MISTAKE_RETIRE_STREAK) →
 *     retireDone; no retire line on a wrong answer;
 *   - completion records EXACTLY ONCE (under StrictMode) through the M4
 *     service with source 'mistakes' and the full parallel payload;
 *   - a null backend shows results, records nothing, never throws;
 *   - ZERO NUDGES, STRUCTURALLY: neither new component imports any nudge/
 *     wall/gate machinery, and neither names the paid flag at all — the
 *     deck is identical for both tiers, so test/isPaidDiscipline.test.ts's
 *     exhaustive allowlist needs no extending for this surface.
 */

const recordPracticeSession = vi.fn();
const firestoreBackend = vi.fn();

vi.mock('@/lib/progressService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/progressService')>()),
  recordPracticeSession: (...args: unknown[]) => recordPracticeSession(...args),
}));

vi.mock('@/lib/progressBackend', () => ({
  firestoreBackend: () => firestoreBackend(),
  MISTAKES_RUN_SOURCE: 'mistakes',
}));

// Imported AFTER the mocks are registered.
const { MistakesPlayer } = await import('@/components/MistakesPlayer');
const { mistakes: copy, practicePlayer: playerCopy } = await import('@/lib/copy');
const { MISTAKE_RETIRE_STREAK } = await import('@/lib/mistakesService');

/** A non-null backend stub — its methods are never reached (the service is mocked). */
const STUB_BACKEND = { uid: () => 'test-uid' };

function deckQuestion(id: string, streak: number): MistakeQuestion {
  return {
    id,
    chapter: 3,
    subtopic: 'Test Topic',
    question: `Question text ${id}`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: 0,
    explanation: `Explanation for ${id}`,
    _streak: streak,
  };
}

beforeEach(() => {
  recordPracticeSession.mockReset();
  firestoreBackend.mockReset();
  firestoreBackend.mockReturnValue(STUB_BACKEND);
});

afterEach(() => cleanup());

describe('MistakesPlayer — badge and answer feedback', () => {
  it('wears the deck badge and reveals verdict + explanation on answer', () => {
    render(<MistakesPlayer chapter={3} questions={[deckQuestion('q1', 0)]} />);

    expect(screen.getByText(copy.badge)).toBeInTheDocument();
    expect(screen.getByText('Question text q1')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
    expect(screen.getByText(playerCopy.correct)).toBeInTheDocument();
    expect(screen.getByText('Explanation for q1')).toBeInTheDocument();
  });
});

describe('MistakesPlayer — the retire line (app QuizScreen computation)', () => {
  it('sanity: the locked threshold these cases straddle is 2', () => {
    expect(MISTAKE_RETIRE_STREAK).toBe(2);
  });

  it('correct on a streak-0 question shows retireProgress, exactly', () => {
    render(<MistakesPlayer chapter={3} questions={[deckQuestion('q1', 0)]} />);
    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);

    expect(screen.getByText(copy.retireProgress)).toBeInTheDocument();
    expect(screen.queryByText(copy.retireDone)).toBeNull();
  });

  it('correct on a streak-1 question shows retireDone, exactly — this answer retires it', () => {
    render(<MistakesPlayer chapter={3} questions={[deckQuestion('q1', 1)]} />);
    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);

    expect(screen.getByText(copy.retireDone)).toBeInTheDocument();
    expect(screen.queryByText(copy.retireProgress)).toBeNull();
  });

  it('a wrong answer shows no retire line at all', () => {
    render(<MistakesPlayer chapter={3} questions={[deckQuestion('q1', 1)]} />);
    fireEvent.click(screen.getAllByRole('radio')[1] as HTMLElement);

    expect(screen.getByText(playerCopy.incorrect)).toBeInTheDocument();
    expect(screen.queryByText(copy.retireDone)).toBeNull();
    expect(screen.queryByText(copy.retireProgress)).toBeNull();
  });
});

describe('MistakesPlayer — completion recording (once, source mistakes)', () => {
  it('records once (even under StrictMode) with the exact payload, then shows the completion card', () => {
    const questions = [deckQuestion('q1', 0), deckQuestion('q2', 1), deckQuestion('q3', 0)];
    render(
      <StrictMode>
        <MistakesPlayer chapter={3} questions={questions} />
      </StrictMode>,
    );

    // Q1 correct, Q2 wrong, Q3 correct → results.
    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: playerCopy.next }));
    fireEvent.click(screen.getAllByRole('radio')[2] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: playerCopy.next }));
    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: playerCopy.seeResults }));

    expect(recordPracticeSession).toHaveBeenCalledTimes(1);
    const [backendArg, payload] = recordPracticeSession.mock.calls[0]!;
    expect(backendArg).toBe(STUB_BACKEND);
    expect(payload).toMatchObject({
      chapterNumber: 3,
      correct: 2,
      attempted: 3,
      scorePct: 67, // round(2/3 * 100) — computePracticePct
      source: 'mistakes',
    });
    // The full parallel arrays feed updateMistakesFromRun inside the service:
    // Q1/Q3 correct advance streaks; Q2's wrong pick resets it.
    expect(payload.answers).toEqual([0, 2, 0]);
    expect(payload.questions.map((q: MistakeQuestion) => q.id)).toEqual(['q1', 'q2', 'q3']);

    expect(screen.getByText(copy.completion.title)).toBeInTheDocument();
    expect(screen.getByText(copy.completion.headline(2, 3, 67))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.completion.action.label })).toHaveAttribute(
      'href',
      copy.completion.action.href,
    );
  });

  it('a null backend shows the completion card, records nothing, never throws', () => {
    firestoreBackend.mockReturnValue(null);
    expect(() => {
      render(<MistakesPlayer chapter={3} questions={[deckQuestion('q1', 0)]} />);
      fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
      fireEvent.click(screen.getByRole('button', { name: playerCopy.seeResults }));
    }).not.toThrow();

    expect(recordPracticeSession).not.toHaveBeenCalled();
    expect(screen.getByText(copy.completion.title)).toBeInTheDocument();
  });
});

describe('MistakesPlayer + MistakesSurface — structurally nudge-free and entitlement-free', () => {
  const COMPONENTS = ['MistakesPlayer.tsx', 'MistakesSurface.tsx'];

  /** Import SPECIFIERS, not raw text — the mockSurface.test.tsx idiom. */
  function importSpecifiers(source: string): string[] {
    const specifiers: string[] = [];
    const re = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) if (m[1]) specifiers.push(m[1]);
    return specifiers;
  }

  it.each(COMPONENTS)('%s imports no nudge, wall, or gate machinery', (name) => {
    const source = readFileSync(
      path.resolve(import.meta.dirname, '..', 'src', 'components', name),
      'utf8',
    );
    const specifiers = importSpecifiers(source);
    expect(specifiers.length).toBeGreaterThan(3); // guard is not a stub
    expect(specifiers.filter((s) => /PremiumNudge|UpgradeWall|nudgeGates/.test(s))).toEqual([]);
  });

  it.each(COMPONENTS)('%s never names the paid flag or the entitlement store', (name) => {
    // The deck is IDENTICAL for both tiers (app QuizScreen mistakes mode has
    // no entitlement branch), so these components carry no paid prop at all —
    // isPaidDiscipline's exhaustive allowlist must never need them added.
    const source = readFileSync(
      path.resolve(import.meta.dirname, '..', 'src', 'components', name),
      'utf8',
    );
    expect(source).not.toMatch(/isPaid/);
    expect(source).not.toMatch(/entitlementStore|useEntitlement/);
  });
});
