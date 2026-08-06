/**
 * MockResults (M6) — the post-submit mock results block, ported from the
 * app's ResultsScreen mock branch. Pins:
 *   - the three verdict bands against MOCK_PASS_MARK / MOCK_PASS_MARGIN;
 *   - the premium pitch: present for FREE users with the nudge-law dual CTA,
 *     entirely ABSENT for paid (the milestone's M2-B1 obligation, and the
 *     protocol's "no pitch for isPaid" structural check);
 *   - stats semantics: history-driven, current-score fallback when empty or
 *     when the backend is null (app ResultsScreen.js:134-140);
 *   - weak-chapter chips: >= 70% only, weightage-sorted, flashcard links;
 *     the needs-practice card below 70%;
 *   - READ-ONLY: rendering never records (no recordMockAttempt call).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';

import { mockResults as copy, syllabus } from '@/lib/copy';
import { MOCK_PASS_MARK, MOCK_PASS_MARGIN, MOCK_CHAPTER_WEIGHTS } from '@/lib/mockConfig';

const getMockHistory = vi.fn();
const recordMockAttempt = vi.fn();
const firestoreBackend = vi.fn();

vi.mock('@/lib/mockService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mockService')>()),
  getMockHistory: (...args: unknown[]) => getMockHistory(...args),
  recordMockAttempt: (...args: unknown[]) => recordMockAttempt(...args),
}));

vi.mock('@/lib/progressBackend', () => ({
  firestoreBackend: () => firestoreBackend(),
}));

const { MockResults } = await import('@/components/MockResults');

const BASE = {
  score: 61,
  total: 100,
  percentage: 61,
  timeTaken: 5400,
  weakChapters: [] as number[],
  isPaid: false,
  onRetake: () => {},
};

beforeEach(() => {
  vi.clearAllMocks();
  firestoreBackend.mockReturnValue({ uid: () => 'test-uid' });
  getMockHistory.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

function openDetails() {
  fireEvent.click(screen.getByRole('button', { name: copy.detailsShow }));
}

describe('MockResults — verdict bands (app ResultsScreen.js:378-384)', () => {
  it('at or above pass + margin reads passed-with-margin', () => {
    render(<MockResults {...BASE} percentage={MOCK_PASS_MARK + MOCK_PASS_MARGIN} />);
    expect(screen.getByText(copy.verdict.passMargin(MOCK_PASS_MARK))).toBeInTheDocument();
  });

  it('at pass but under the margin reads passed-just', () => {
    render(<MockResults {...BASE} percentage={MOCK_PASS_MARK} />);
    expect(screen.getByText(copy.verdict.passJust(MOCK_PASS_MARK))).toBeInTheDocument();
  });

  it('under pass reads the calibration line, never judgement-free silence', () => {
    render(<MockResults {...BASE} percentage={MOCK_PASS_MARK - 1} />);
    expect(screen.getByText(copy.verdict.fail(MOCK_PASS_MARK))).toBeInTheDocument();
  });
});

describe('MockResults — the premium pitch (M2-B1 obligation, nudge law)', () => {
  it('free: pitch block present with the dual CTA; back-to-study is the quiet link', () => {
    render(<MockResults {...BASE} isPaid={false} />);
    expect(screen.getByText(copy.pitch.title)).toBeInTheDocument();
    expect(screen.getByText(copy.pitch.body)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.pitch.cta.label })).toHaveAttribute(
      'href',
      copy.pitch.cta.href,
    );
    expect(screen.getByText(copy.pitch.webSoon)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.pitch.later.label })).toBeInTheDocument();
    // The nudge law, textually: the pitch names what premium ADDS.
    expect(copy.pitch.body).toMatch(/unlimited mocks/i);
    // The paid-only primary is absent for free users.
    expect(screen.queryByRole('button', { name: new RegExp(copy.takeAnother) })).toBeNull();
  });

  it('paid: ZERO pitch — no pitch strings anywhere; retake is the primary', () => {
    render(<MockResults {...BASE} isPaid={true} />);
    expect(screen.queryByText(copy.pitch.title)).toBeNull();
    expect(screen.queryByText(copy.pitch.body)).toBeNull();
    expect(screen.queryByText(copy.pitch.webSoon)).toBeNull();
    expect(screen.queryByRole('link', { name: copy.pitch.cta.label })).toBeNull();
    expect(screen.getByRole('button', { name: new RegExp(copy.takeAnother) })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.backToStudy.label })).toBeInTheDocument();
  });

  it('paid retake calls onRetake (back to the pre-start recheck)', () => {
    const onRetake = vi.fn();
    render(<MockResults {...BASE} isPaid={true} onRetake={onRetake} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(copy.takeAnother) }));
    expect(onRetake).toHaveBeenCalledTimes(1);
  });
});

describe('MockResults — stats (app ResultsScreen.js:134-140 semantics)', () => {
  it('empty history: every stat falls back to the current attempt', async () => {
    render(<MockResults {...BASE} percentage={61} score={61} />);
    openDetails();
    await waitFor(() => expect(getMockHistory).toHaveBeenCalled());
    // best / lowest / average all read 61; attempts reads 1.
    expect(screen.getAllByText(copy.stats.outOf(61, 100)).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(copy.stats.attempts)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('history-driven: best is max, lowest min, average rounded, attempts the count', async () => {
    getMockHistory.mockResolvedValue([
      { date: 'a', score: 40, total: 100, percentage: 40 },
      { date: 'b', score: 70, total: 100, percentage: 70 },
      { date: 'c', score: 55, total: 100, percentage: 55 },
    ]);
    render(<MockResults {...BASE} />);
    openDetails();
    await waitFor(() => {
      expect(screen.getByText(copy.stats.outOf(70, 100))).toBeInTheDocument(); // best
    });
    expect(screen.getByText(copy.stats.outOf(40, 100))).toBeInTheDocument(); // lowest
    expect(screen.getByText(copy.stats.outOf(55, 100))).toBeInTheDocument(); // average round(165/3)
    expect(screen.getByText('3')).toBeInTheDocument(); // attempts
  });

  it('null backend: renders with fallbacks, never reads, never throws', () => {
    firestoreBackend.mockReturnValue(null);
    render(<MockResults {...BASE} />);
    openDetails();
    expect(getMockHistory).not.toHaveBeenCalled();
    expect(screen.getAllByText(copy.stats.outOf(61, 100)).length).toBeGreaterThanOrEqual(3);
  });

  it('time taken renders h:mm:ss (app formatDuration)', () => {
    render(<MockResults {...BASE} timeTaken={5400} />);
    openDetails();
    expect(screen.getByText('1:30:00')).toBeInTheDocument();
  });
});

describe('MockResults — weak areas (app ResultsScreen.js:466-520)', () => {
  it('>= 70% with weak chapters: weightage-sorted chips linking to the chapter flashcards', () => {
    render(<MockResults {...BASE} percentage={72} weakChapters={[3, 9, 4]} />);
    openDetails();
    const links = screen.getAllByRole('link', { name: /of exam/ });
    // Sorted by MOCK_CHAPTER_WEIGHTS desc: 9 (15) > 4 (10) > 3 (4).
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/app/flashcards?chapter=9',
      '/app/flashcards?chapter=4',
      '/app/flashcards?chapter=3',
    ]);
    expect(links[0]!.textContent).toContain(
      copy.weak.chip(9, syllabus.chapters[8]!, MOCK_CHAPTER_WEIGHTS[9]!),
    );
    expect(screen.queryByText(copy.weak.needsPractice)).toBeNull();
  });

  it('< 70%: the needs-practice card, never chapter-chasing chips', () => {
    render(<MockResults {...BASE} percentage={45} weakChapters={[9, 12]} />);
    openDetails();
    expect(screen.getByText(copy.weak.needsPractice)).toBeInTheDocument();
    expect(screen.getByText(copy.weak.needsPracticeBody)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /of exam/ })).toBeNull();
  });

  it('>= 70% with NO weak chapters: neither section renders', () => {
    render(<MockResults {...BASE} percentage={90} weakChapters={[]} />);
    openDetails();
    expect(screen.queryByText(copy.weak.heading)).toBeNull();
    expect(screen.queryByText(copy.weak.needsPractice)).toBeNull();
  });
});

describe('MockResults — read-only discipline', () => {
  it('rendering never records: no recordMockAttempt call from the results block', async () => {
    render(<MockResults {...BASE} />);
    openDetails();
    await waitFor(() => expect(getMockHistory).toHaveBeenCalled());
    expect(recordMockAttempt).not.toHaveBeenCalled();
  });

  it('details are collapsed by default and toggle open/closed (app parity)', () => {
    render(<MockResults {...BASE} />);
    expect(screen.queryByText(copy.stats.attempt)).toBeNull();
    openDetails();
    expect(screen.getByText(copy.stats.attempt)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: copy.detailsHide }));
    expect(screen.queryByText(copy.stats.attempt)).toBeNull();
  });
});
