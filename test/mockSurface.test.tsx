import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { MOCK_DURATION_MIN, MOCK_QUESTIONS } from '@/lib/mockConfig';
import type { Question } from '@/lib/quizEngine';

/**
 * `/app/mock` — the MockSurface pre-start surface (M6), the web
 * PreMockScreen. These pin the behavioural contract ported from
 * ../ARNReady-App/screens/PreMockScreen.js:
 *
 *   - checking → ready for an eligible free user (free banner, filled
 *     instructions, ONE primary start CTA);
 *   - paid users get no free banner and short-circuit eligibility;
 *   - the used-mock state (score line, en-IN date, additions-pitch copy,
 *     exactly one primary CTA, no start button);
 *   - a FAILED eligibility check is the error state with retry — NEVER the
 *     used-mock pitch (ScreenState policy §3);
 *   - the AWAITED ensureUserDocument gate: 'error' can never reach 'ready';
 *   - history renders newest first with the weak-chapters line;
 *   - Start → fetchMockQuestions(isPaid) → assembleMock → MockPlayer, with
 *     the assembling state shown meanwhile; a fetch error retries to ready;
 *   - zero nudge machinery in the surface source (the pitch is plain copy).
 *
 * Service/delivery mocks follow test/studySurfaces.test.tsx's idiom; the
 * player is mocked to a spy so the assembled-paper handoff is observable
 * (the run itself is test/mockPlayer.test.tsx's scope).
 */

let configured = true;
vi.mock('@/lib/firebaseClient', () => ({
  isFirebaseConfigured: () => configured,
  getAuthClient: () => null,
  getDb: () => null,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const ensureUserDocument = vi.fn();
vi.mock('@/lib/ensureUserDocument', () => ({
  ensureUserDocument: () => ensureUserDocument(),
}));

const canTakeMock = vi.fn();
const getMockHistory = vi.fn();
vi.mock('@/lib/mockService', () => ({
  canTakeMock: (...args: unknown[]) => canTakeMock(...args),
  getMockHistory: (...args: unknown[]) => getMockHistory(...args),
}));

const fetchMockQuestions = vi.fn();
vi.mock('@/lib/questionDelivery', () => ({
  fetchMockQuestions: (...args: unknown[]) => fetchMockQuestions(...args),
}));

/** A non-null backend stub — its methods are never reached (the service is mocked). */
const STUB_BACKEND = { uid: () => 'test-uid' };
const firestoreBackend = vi.fn();
vi.mock('@/lib/progressBackend', () => ({
  firestoreBackend: () => firestoreBackend(),
}));

/** Player spy: exposes the questions it was mounted with, so the assembled
 * handoff (test 7) is a black-box observation, not an implementation peek. */
const playerMounts = vi.fn();
vi.mock('@/components/MockPlayer', () => ({
  MockPlayer: (props: { questions: Question[]; isPaid: boolean; onExit: () => void }) => {
    playerMounts(props);
    return (
      <div
        data-testid="mock-player-stub"
        data-count={props.questions.length}
        data-ids={props.questions
          .map((q) => q.id)
          .sort()
          .join(',')}
      />
    );
  },
}));

// Imported AFTER the mocks are registered.
const { MockSurface } = await import('@/components/MockSurface');
const { metadata } = await import('@/app/app/mock/page');
const { useAuth } = await import('@/lib/authStore');
const { useEntitlement } = await import('@/lib/entitlementStore');
const { appShell, mockSurface: copy } = await import('@/lib/copy');

const READY_FIRST_LINE = copy.instructions[0]
  .replace('{questions}', String(MOCK_QUESTIONS))
  .replace('{minutes}', String(MOCK_DURATION_MIN));

/** The component's own en-IN formatting, recomputed here so the expectation
 * never drifts from the runtime's locale data. */
function enInDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function signedIn(uid = 'uid-a') {
  useAuth.setState({ user: { uid, displayName: 'Test Learner', email: 'test@example.com' } });
}

function makePool(count: number, chapter = 1): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q${String(i + 1).padStart(3, '0')}`,
    chapter,
    subtopic: 'Test Topic',
    question: `Question text number ${i + 1}`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: 0,
    difficulty: 'medium' as const,
    isFree: true,
    isSeed: true,
  }));
}

/** The standard eligible-free-user happy path; individual tests override. */
beforeEach(() => {
  configured = true;
  useAuth.setState({ user: undefined, signingIn: false });
  useEntitlement.setState({ isPaid: false, known: true });
  ensureUserDocument.mockReset();
  ensureUserDocument.mockResolvedValue('ensured');
  canTakeMock.mockReset();
  canTakeMock.mockResolvedValue(true);
  getMockHistory.mockReset();
  getMockHistory.mockResolvedValue([]);
  fetchMockQuestions.mockReset();
  firestoreBackend.mockReset();
  firestoreBackend.mockReturnValue(STUB_BACKEND);
  playerMounts.mockReset();
});

describe('/app/mock — route indexing', () => {
  it('declares noindex, nofollow, same as the other /app routes', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe(copy.meta.title);
  });
});

describe('MockSurface — auth chrome', () => {
  it('signed out shows the sign-in prompt, and no check or player runs', () => {
    useAuth.setState({ user: null });
    render(<MockSurface />);
    expect(screen.getByText(appShell.signedOut.title)).toBeInTheDocument();
    expect(ensureUserDocument).not.toHaveBeenCalled();
    expect(canTakeMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mock-player-stub')).toBeNull();
  });
});

describe('MockSurface — checking → ready (eligible free user)', () => {
  it('shows the free banner, filled instructions, ONE primary start CTA, and no history section', async () => {
    signedIn();
    render(<MockSurface />);

    // 'checking' first — the loading card, never a flash of ready/used.
    expect(screen.getByText(appShell.loading)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(copy.title)).toBeInTheDocument());
    expect(screen.getByText(copy.freeBanner)).toBeInTheDocument();
    expect(screen.getByText(READY_FIRST_LINE)).toBeInTheDocument();
    expect(screen.getByText(copy.deviceAdvice)).toBeInTheDocument();

    // Exactly one primary CTA on the surface: the green start button.
    expect(screen.getAllByRole('button', { name: copy.startButton })).toHaveLength(1);
    expect(screen.queryByText(copy.historyTitle)).toBeNull();
    // The awaited gate ran before eligibility.
    expect(ensureUserDocument).toHaveBeenCalledTimes(1);
    expect(canTakeMock).toHaveBeenCalledWith(STUB_BACKEND, false);
  });
});

describe('MockSurface — paid user', () => {
  it('shows no free banner, and eligibility is asked with isPaid true', async () => {
    signedIn();
    useEntitlement.setState({ isPaid: true, known: true });
    render(<MockSurface />);

    await waitFor(() => expect(screen.getByText(copy.title)).toBeInTheDocument());
    expect(screen.queryByText(copy.freeBanner)).toBeNull();
    expect(canTakeMock).toHaveBeenCalledWith(STUB_BACKEND, true);
  });
});

describe('MockSurface — used-mock state', () => {
  const ATTEMPT = {
    date: '2026-08-01T10:00:00.000Z',
    score: 62,
    total: 100,
    percentage: 62,
    weakChapters: [9, 12],
  };

  it('shows the score line and additions pitch with exactly one primary CTA and no start button', async () => {
    signedIn();
    canTakeMock.mockResolvedValue(false);
    getMockHistory.mockResolvedValue([ATTEMPT]);
    render(<MockSurface />);

    await waitFor(() => expect(screen.getByText(copy.used.title)).toBeInTheDocument());
    // Score line: the only attempt's score + en-IN date (app usedScoreLine).
    expect(screen.getByText(copy.used.scoreLine(62, enInDate(ATTEMPT.date)))).toBeInTheDocument();
    // The pitch is the used-state copy object — the strings that pitch what
    // premium ADDS (unlimited mocks), never relief from the limit.
    expect(screen.getByText(copy.used.body)).toBeInTheDocument();
    expect(copy.used.body).toContain('unlimited mocks');

    // No start button; exactly one primary CTA (the app link) + the quiet
    // web-checkout line + the quiet way back.
    expect(screen.queryByRole('button', { name: copy.startButton })).toBeNull();
    const appCta = screen.getAllByRole('link', { name: copy.used.cta.label });
    expect(appCta).toHaveLength(1);
    expect(appCta[0]).toHaveAttribute('href', copy.used.cta.href);
    expect(screen.getByText(copy.used.webSoon)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.used.later.label })).toHaveAttribute(
      'href',
      copy.used.later.href,
    );
  });
});

describe('MockSurface — failed eligibility check (ScreenState policy §3)', () => {
  it('shows the error state with retry, NEVER the used-mock pitch; retry re-runs the whole sequence', async () => {
    signedIn();
    canTakeMock.mockRejectedValueOnce(new Error('firestore offline'));
    render(<MockSurface />);

    await waitFor(() => expect(screen.getByText(copy.error.title)).toBeInTheDocument());
    // The line the app comments in blood: a failed check must never render
    // the used-mock paywall pitch it would default to.
    expect(screen.queryByText(copy.used.title)).toBeNull();
    expect(screen.queryByRole('button', { name: copy.startButton })).toBeNull();

    // Retry re-runs the FULL sequence: ensure gate, then eligibility.
    fireEvent.click(screen.getByRole('button', { name: copy.error.retry }));
    await waitFor(() => expect(screen.getByText(copy.title)).toBeInTheDocument());
    expect(ensureUserDocument).toHaveBeenCalledTimes(2);
    expect(canTakeMock).toHaveBeenCalledTimes(2);
  });

  it('a null backend is the error state too', async () => {
    signedIn();
    firestoreBackend.mockReturnValue(null);
    render(<MockSurface />);
    await waitFor(() => expect(screen.getByText(copy.error.title)).toBeInTheDocument());
    expect(canTakeMock).not.toHaveBeenCalled();
  });
});

describe('MockSurface — the awaited ensureUserDocument gate', () => {
  it.each(['error', 'unavailable'] as const)(
    "outcome '%s' is the error state — never 'ready' (the submit write would be refused)",
    async (outcome) => {
      signedIn();
      ensureUserDocument.mockResolvedValue(outcome);
      render(<MockSurface />);

      await waitFor(() => expect(screen.getByText(copy.error.title)).toBeInTheDocument());
      expect(screen.queryByText(copy.title)).toBeNull();
      // The gate is sequenced FIRST: eligibility is never even asked.
      expect(canTakeMock).not.toHaveBeenCalled();
    },
  );

  it("'ensured' proceeds to the eligibility check", async () => {
    signedIn();
    render(<MockSurface />);
    await waitFor(() => expect(screen.getByText(copy.title)).toBeInTheDocument());
    expect(canTakeMock).toHaveBeenCalledTimes(1);
  });
});

describe('MockSurface — history', () => {
  it('renders newest first with the weak-chapters / no-weak lines', async () => {
    signedIn();
    // Stored order is oldest → newest (the app appends); the surface reverses.
    getMockHistory.mockResolvedValue([
      { date: '2026-07-01T09:00:00.000Z', score: 48, total: 100, percentage: 48, weakChapters: [9, 12] },
      { date: '2026-08-01T09:00:00.000Z', score: 71, total: 100, percentage: 71, weakChapters: [] },
    ]);
    render(<MockSurface />);

    await waitFor(() => expect(screen.getByText(copy.historyTitle)).toBeInTheDocument());
    const rows = within(screen.getByRole('region', { name: copy.historyTitle })).getAllByRole(
      'listitem',
    );
    expect(rows).toHaveLength(2);
    // Newest (August, no weak chapters) first…
    expect(rows[0]).toHaveTextContent('71 / 100');
    expect(rows[0]).toHaveTextContent(enInDate('2026-08-01T09:00:00.000Z'));
    expect(rows[0]).toHaveTextContent(copy.historyNoWeak);
    // …then the older attempt with its weak-chapters line.
    expect(rows[1]).toHaveTextContent('48 / 100');
    expect(rows[1]).toHaveTextContent(copy.historyWeak('Ch 9, Ch 12'));
  });
});

describe('MockSurface — start → assembling → running', () => {
  it('fetches with the store isPaid, shows assembling, and mounts MockPlayer with the assembled paper', async () => {
    signedIn();
    const pool = makePool(3); // chapter 1 (weight 8 > 3) → all 3 assemble
    let resolveFetch!: (value: unknown) => void;
    fetchMockQuestions.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));
    render(<MockSurface />);

    await waitFor(() => expect(screen.getByText(copy.title)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.startButton }));

    expect(fetchMockQuestions).toHaveBeenCalledWith(false);
    // The assembling state holds while the pool is in flight.
    expect(screen.getByText(copy.assembling)).toBeInTheDocument();
    expect(screen.queryByTestId('mock-player-stub')).toBeNull();

    resolveFetch({ status: 'ok', questions: pool });
    await waitFor(() => expect(screen.getByTestId('mock-player-stub')).toBeInTheDocument());

    // The player received assembleMock's output over the fetched pool:
    // same question set (assembly shuffles, so compare as a set).
    const stub = screen.getByTestId('mock-player-stub');
    expect(stub.dataset.count).toBe('3');
    expect(stub.dataset.ids).toBe('q001,q002,q003');
    expect(playerMounts).toHaveBeenCalledTimes(1);
    expect(playerMounts.mock.calls[0]?.[0]).toMatchObject({ isPaid: false });
  });

  it('a fetch error is the error state, and retry returns to ready', async () => {
    signedIn();
    fetchMockQuestions.mockResolvedValue({ status: 'error', reason: 'firestore-unavailable' });
    render(<MockSurface />);

    await waitFor(() => expect(screen.getByText(copy.title)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.startButton }));

    await waitFor(() => expect(screen.getByText(copy.error.title)).toBeInTheDocument());
    expect(screen.queryByTestId('mock-player-stub')).toBeNull();

    // Retry re-runs the eligibility sequence and lands back on ready.
    fireEvent.click(screen.getByRole('button', { name: copy.error.retry }));
    await waitFor(() => expect(screen.getByText(copy.title)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: copy.startButton })).toBeInTheDocument();
  });
});

describe('MockSurface — zero nudge machinery (nudge law)', () => {
  it('the surface source imports no nudge or wall module — the used pitch is plain copy', () => {
    const source = readFileSync(
      path.resolve(import.meta.dirname, '..', 'src', 'components', 'MockSurface.tsx'),
      'utf8',
    );
    // Import SPECIFIERS, not raw text — prose about the invariant is allowed;
    // pulling the machinery in is not (same idiom as
    // test/studyLeakAndNudgeInvariants.test.tsx's importSpecifiers scan).
    const specifiers: string[] = [];
    const re = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) if (m[1]) specifiers.push(m[1]);
    expect(specifiers.length).toBeGreaterThan(5); // guard is not a stub
    expect(specifiers.filter((s) => /PremiumNudge|UpgradeWall|nudgeGates/.test(s))).toEqual([]);
  });
});
