import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

/**
 * `/app/practice`, `/app/exam`, `/app/flashcards` — the shared StudySurface
 * chrome (M5 plan D1–D3, S3). This pins the three states the plan requires
 * before any player exists: signed-out never shows a partial player, an
 * invalid `?chapter=` renders the picker rather than throwing or guessing
 * chapter 1, and a failed `questionDelivery` read is an ERROR state with a
 * retry affordance — never an empty surface.
 */
let configured = true;
vi.mock('@/lib/firebaseClient', () => ({
  isFirebaseConfigured: () => configured,
  getAuthClient: () => null,
  getDb: () => null,
}));

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const fetchPracticeQuestions = vi.fn();
const fetchExamQuestions = vi.fn();
const fetchFlashcardDeck = vi.fn();
vi.mock('@/lib/questionDelivery', () => ({
  fetchPracticeQuestions: (...args: unknown[]) => fetchPracticeQuestions(...args),
  fetchExamQuestions: (...args: unknown[]) => fetchExamQuestions(...args),
  fetchFlashcardDeck: (...args: unknown[]) => fetchFlashcardDeck(...args),
}));

const { PracticeSurface } = await import('@/components/PracticeSurface');
const { ExamSurface } = await import('@/components/ExamSurface');
const { FlashcardsSurface } = await import('@/components/FlashcardsSurface');
const { useAuth } = await import('@/lib/authStore');
const { useEntitlement } = await import('@/lib/entitlementStore');
const { appShell, auth: authCopy, studySurface } = await import('@/lib/copy');

const SURFACES = [
  { name: 'practice', Component: PracticeSurface, fetchFn: fetchPracticeQuestions, loading: studySurface.loading.practice },
  { name: 'exam', Component: ExamSurface, fetchFn: fetchExamQuestions, loading: studySurface.loading.exam },
  { name: 'flashcards', Component: FlashcardsSurface, fetchFn: fetchFlashcardDeck, loading: studySurface.loading.flashcards },
] as const;

function signedIn(uid = 'uid-a') {
  useAuth.setState({ user: { uid, displayName: 'Test Learner', email: 'test@example.com' } });
}

beforeEach(() => {
  configured = true;
  mockSearch = '';
  useAuth.setState({ user: undefined, signingIn: false });
  useEntitlement.setState({ isPaid: false, known: false });
  fetchPracticeQuestions.mockReset();
  fetchExamQuestions.mockReset();
  fetchFlashcardDeck.mockReset();
});

describe.each(SURFACES)('/app/$name — signed-out state', ({ Component }) => {
  it('shows the sign-in prompt, never a partial player', () => {
    mockSearch = 'chapter=3';
    useAuth.setState({ user: null });
    render(<Component />);

    expect(screen.getByText(appShell.signedOut.title)).toBeInTheDocument();
    expect(screen.getByText(authCopy.signInWithGoogle)).toBeInTheDocument();
    expect(screen.queryByTestId(/player-slot/)).toBeNull();
  });
});

describe.each(SURFACES)('/app/$name — invalid chapter', ({ Component, fetchFn }) => {
  it.each(['', 'chapter=0', 'chapter=13', 'chapter=abc'])(
    'renders the picker rather than throwing or guessing chapter 1 (%s)',
    (search) => {
      mockSearch = search;
      signedIn();

      expect(() => render(<Component />)).not.toThrow();
      expect(screen.getByText(studySurface.pickChapter.title)).toBeInTheDocument();
      // The same launcher grid the /app shell uses — proves it's the picker,
      // not a dead end, and that chapter 1 was never assumed.
      expect(screen.getByText('Chapter 1').closest('li')?.querySelector('a')).toHaveAttribute(
        'href',
        expect.stringContaining('chapter=1'),
      );
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );
});

describe.each(SURFACES)('/app/$name — failed delivery is an error, never an empty surface', ({ Component, fetchFn, loading }) => {
  it('renders the error state with a retry affordance, and retry re-invokes the load', async () => {
    mockSearch = 'chapter=5';
    signedIn();
    fetchFn.mockResolvedValue({ status: 'error', reason: 'firestore-unavailable' });

    render(<Component />);

    // Loading is shown first (or resolves fast enough that only the error
    // shows) — either way the error must appear, never a blank/empty state.
    await waitFor(() => expect(screen.getByText(studySurface.error.title)).toBeInTheDocument());
    expect(screen.queryByText(loading)).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText(studySurface.error.retry));
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    expect(screen.getByText(studySurface.error.title)).toBeInTheDocument();
  });
});
