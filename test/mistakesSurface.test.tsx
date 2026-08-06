import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

import type { MistakeEntry, MistakeQuestion } from '@/lib/mistakesService';

/**
 * `/app/mistakes` — the MistakesSurface (M6): picker, earned empty states,
 * and the deck hand-off. Pins the contract ported from the app's mistakes
 * entry points:
 *
 *   - signed out shows the sign-in prompt and runs no read;
 *   - the picker groups active mistakes by chapter and renders ONLY chapters
 *     that hold any, with syllabus titles and per-chapter counts;
 *   - an all-clear deck is the EARNED empty state (app appCopy.mistakes.empty);
 *   - `?chapter=N` loads the deck through `loadMistakeQuestions` with the
 *     injected `fetchQuestionById` (the per-document-gets seam) and mounts
 *     the player; an invalid chapter falls back to the picker;
 *   - an empty chapter deck shows the same earned state with a way back to
 *     the picker;
 *   - the route is noindex like every /app route.
 *
 * Service/delivery mocks follow test/mockSurface.test.tsx's idiom; the
 * player is mocked to a spy (the run itself is test/mistakesPlayer.test.tsx's
 * scope).
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

const getActiveMistakes = vi.fn();
const loadMistakeQuestions = vi.fn();
vi.mock('@/lib/mistakesService', () => ({
  getActiveMistakes: (...args: unknown[]) => getActiveMistakes(...args),
  loadMistakeQuestions: (...args: unknown[]) => loadMistakeQuestions(...args),
}));

/** The real module is NOT mocked here — the surface must inject this exact
 * function into loadMistakeQuestions, which the deck test asserts by
 * identity. */
const { fetchQuestionById } = await import('@/lib/questionDelivery');

/** A non-null backend stub — its methods are never reached (the service is mocked). */
const STUB_BACKEND = { uid: () => 'test-uid' };
const firestoreBackend = vi.fn();
vi.mock('@/lib/progressBackend', () => ({
  firestoreBackend: () => firestoreBackend(),
}));

const playerMounts = vi.fn();
vi.mock('@/components/MistakesPlayer', () => ({
  MistakesPlayer: (props: { chapter: number; questions: MistakeQuestion[] }) => {
    playerMounts(props);
    return (
      <div
        data-testid="mistakes-player-stub"
        data-chapter={props.chapter}
        data-ids={props.questions.map((q) => q.id).join(',')}
      />
    );
  },
}));

// Imported AFTER the mocks are registered.
const { MistakesSurface } = await import('@/components/MistakesSurface');
const { metadata } = await import('@/app/app/mistakes/page');
const { useAuth } = await import('@/lib/authStore');
const { appShell, mistakes: copy, syllabus } = await import('@/lib/copy');

function signedIn(uid = 'uid-a') {
  useAuth.setState({ user: { uid, displayName: 'Test Learner', email: 'test@example.com' } });
}

function entry(questionId: string, chapter: number | null, correctStreak = 0): MistakeEntry {
  return { questionId, chapter, subtopic: 'Test Topic', correctStreak };
}

function deckQuestion(id: string, streak = 0): MistakeQuestion {
  return {
    id,
    chapter: 3,
    subtopic: 'Test Topic',
    question: `Question ${id}`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    _streak: streak,
  };
}

beforeEach(() => {
  configured = true;
  mockSearch = '';
  useAuth.setState({ user: undefined, signingIn: false });
  getActiveMistakes.mockReset();
  getActiveMistakes.mockResolvedValue([]);
  loadMistakeQuestions.mockReset();
  loadMistakeQuestions.mockResolvedValue([]);
  firestoreBackend.mockReset();
  firestoreBackend.mockReturnValue(STUB_BACKEND);
  playerMounts.mockReset();
});

describe('/app/mistakes — route indexing', () => {
  it('declares noindex, nofollow, same as the other /app routes', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe(copy.meta.title);
  });
});

describe('MistakesSurface — auth chrome', () => {
  it('signed out shows the sign-in prompt, and no read or player runs', () => {
    useAuth.setState({ user: null });
    render(<MistakesSurface />);
    expect(screen.getByText(appShell.signedOut.title)).toBeInTheDocument();
    expect(getActiveMistakes).not.toHaveBeenCalled();
    expect(loadMistakeQuestions).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mistakes-player-stub')).toBeNull();
  });

  it('unconfigured Firebase shows the unavailable card', () => {
    configured = false;
    render(<MistakesSurface />);
    expect(screen.getByText(appShell.unavailable.title)).toBeInTheDocument();
  });
});

describe('MistakesSurface — the picker', () => {
  it('groups counts by chapter and renders ONLY chapters with active mistakes', async () => {
    signedIn();
    getActiveMistakes.mockResolvedValue([
      entry('q1', 2),
      entry('q2', 2),
      entry('q3', 5),
    ]);
    render(<MistakesSurface />);

    // Loading first, then the picker.
    expect(screen.getByText(copy.loading)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(copy.picker.title)).toBeInTheDocument());

    // One unscoped read through the backend seam.
    expect(getActiveMistakes).toHaveBeenCalledTimes(1);
    expect(getActiveMistakes).toHaveBeenCalledWith(STUB_BACKEND);

    const grid = screen.getByRole('region', { name: copy.picker.gridLabel });
    const cards = within(grid).getAllByRole('listitem');
    expect(cards).toHaveLength(2);

    // Chapter 2: syllabus title, count of 2, link into the chapter deck.
    expect(cards[0]).toHaveTextContent(syllabus.chapters[1] as string);
    expect(cards[0]).toHaveTextContent(copy.picker.countLabel(2));
    expect(within(cards[0] as HTMLElement).getByRole('link', { name: copy.picker.cta })).toHaveAttribute(
      'href',
      '/app/mistakes?chapter=2',
    );
    // Chapter 5: count of 1.
    expect(cards[1]).toHaveTextContent(syllabus.chapters[4] as string);
    expect(cards[1]).toHaveTextContent(copy.picker.countLabel(1));

    // A chapter with no mistakes never renders a card.
    expect(screen.queryByText(syllabus.chapters[0] as string)).toBeNull();
  });

  it('all clear is the EARNED empty state with the way back to study', async () => {
    signedIn();
    getActiveMistakes.mockResolvedValue([]);
    render(<MistakesSurface />);

    await waitFor(() => expect(screen.getByText(copy.empty.title)).toBeInTheDocument());
    expect(screen.getByText(copy.empty.body)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.empty.back.label })).toHaveAttribute(
      'href',
      copy.empty.back.href,
    );
    expect(screen.queryByText(copy.picker.title)).toBeNull();
  });

  it.each(['chapter=0', 'chapter=13', 'chapter=abc'])(
    'an invalid ?%s falls back to the picker, never a guess',
    async (search) => {
      signedIn();
      mockSearch = search;
      getActiveMistakes.mockResolvedValue([entry('q1', 2)]);
      render(<MistakesSurface />);

      await waitFor(() => expect(screen.getByText(copy.picker.title)).toBeInTheDocument());
      expect(loadMistakeQuestions).not.toHaveBeenCalled();
    },
  );
});

describe('MistakesSurface — ?chapter=N loads the deck', () => {
  it('loads through loadMistakeQuestions with the injected fetchQuestionById, then mounts the player', async () => {
    signedIn();
    mockSearch = 'chapter=3';
    const deck = [deckQuestion('q-b', 1), deckQuestion('q-a', 0)];
    let resolveLoad!: (value: unknown) => void;
    loadMistakeQuestions.mockReturnValue(new Promise((resolve) => (resolveLoad = resolve)));
    render(<MistakesSurface />);

    // The loading state holds while the deck is in flight.
    expect(screen.getByText(copy.loading)).toBeInTheDocument();
    expect(screen.queryByTestId('mistakes-player-stub')).toBeNull();

    resolveLoad(deck);
    await waitFor(() => expect(screen.getByTestId('mistakes-player-stub')).toBeInTheDocument());

    // The seam call: backend, the REAL fetchQuestionById (per-document gets),
    // and the parsed chapter.
    expect(loadMistakeQuestions).toHaveBeenCalledTimes(1);
    expect(loadMistakeQuestions).toHaveBeenCalledWith(STUB_BACKEND, fetchQuestionById, 3);

    const stub = screen.getByTestId('mistakes-player-stub');
    expect(stub.dataset.chapter).toBe('3');
    expect(stub.dataset.ids).toBe('q-b,q-a'); // the service order, untouched
    expect(getActiveMistakes).not.toHaveBeenCalled();
  });

  it('an empty chapter deck is the earned state with the way back to the picker', async () => {
    signedIn();
    mockSearch = 'chapter=4';
    loadMistakeQuestions.mockResolvedValue([]);
    render(<MistakesSurface />);

    await waitFor(() => expect(screen.getByText(copy.empty.title)).toBeInTheDocument());
    expect(screen.getByText(copy.emptyChapter.body)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.emptyChapter.back.label })).toHaveAttribute(
      'href',
      copy.emptyChapter.back.href,
    );
    expect(screen.queryByTestId('mistakes-player-stub')).toBeNull();
  });

  it('a null backend degrades to the empty state, never a crash or a player', async () => {
    signedIn();
    mockSearch = 'chapter=4';
    firestoreBackend.mockReturnValue(null);
    render(<MistakesSurface />);

    await waitFor(() => expect(screen.getByText(copy.empty.title)).toBeInTheDocument());
    expect(loadMistakeQuestions).not.toHaveBeenCalled();
  });
});
