import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActiveMistake, ProgressBackend } from '../src/lib/progressBackend';
import { getActiveMistakes, loadMistakeQuestions } from '../src/lib/mistakesService';
import { type Question, shuffle } from '../src/lib/quizEngine';

/**
 * The M6 read side of the mistakes deck: `getActiveMistakes` /
 * `loadMistakeQuestions` (ported from ../ARNReady-App/services/
 * mistakesService.js) exercised through the same injected seams the surface
 * uses — a ProgressBackend stub and a `fetchById` function. No Firestore
 * SDK anywhere: the per-document-gets rules behaviour itself lives on
 * `fetchQuestionById` and is pinned in test/questionDelivery.test.ts; here
 * we pin the service's contract:
 *
 *   - the seam read is mapped to the app's entry shape with the app's
 *     defaults, and the chapter scope is applied in memory (the web's
 *     one-query equivalent of the app's two query shapes);
 *   - signed-out and failed reads degrade quietly to [] (app catch);
 *   - one null fetch drops that card, never the deck;
 *   - each loaded question carries its `_streak`;
 *   - the deck is shuffled via the ported quizEngine shuffle (rng-injected
 *     determinism);
 *   - an empty active deck never fetches at all.
 */

/** A loud backend stub: only the mistakes read is reachable from these
 * functions — everything else throwing proves the services touch nothing
 * more (the progressParity suite's stub discipline). */
function backendWith(actives: ActiveMistake[], uid: string | null = 'test-uid'): ProgressBackend {
  const unreachable = (name: string) => () => {
    throw new Error(`unexpected backend call: ${name}`);
  };
  return {
    uid: () => uid,
    serverTimestamp: unreachable('serverTimestamp'),
    increment: unreachable('increment'),
    readChapterProgress: unreachable('readChapterProgress'),
    writeChapterProgress: unreachable('writeChapterProgress'),
    addSession: unreachable('addSession'),
    readActiveMistakes: async () => actives,
    commitMistakes: unreachable('commitMistakes'),
    readUserRoot: unreachable('readUserRoot'),
    appendMockAttempt: unreachable('appendMockAttempt'),
  };
}

function makeQuestion(id: string, chapter = 3): Question {
  return {
    id,
    chapter,
    subtopic: 'Test Topic',
    question: `Question ${id}`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('getActiveMistakes — seam mapping + in-memory chapter scope', () => {
  const ACTIVES: ActiveMistake[] = [
    { id: 'q-a', correctStreak: 1, chapter: 3, subtopic: 'NAV' },
    { id: 'q-b', correctStreak: 0, chapter: 5, subtopic: 'Tax' },
    { id: 'q-c', correctStreak: 0, chapter: 3, subtopic: 'NAV' },
  ];

  it('maps the seam read to the app entry shape', async () => {
    const out = await getActiveMistakes(backendWith(ACTIVES));
    expect(out).toEqual([
      { questionId: 'q-a', chapter: 3, subtopic: 'NAV', correctStreak: 1 },
      { questionId: 'q-b', chapter: 5, subtopic: 'Tax', correctStreak: 0 },
      { questionId: 'q-c', chapter: 3, subtopic: 'NAV', correctStreak: 0 },
    ]);
  });

  it('applies the app defaults for entries missing chapter/subtopic/streak', async () => {
    const out = await getActiveMistakes(backendWith([{ id: 'bare', correctStreak: 0 }]));
    expect(out).toEqual([{ questionId: 'bare', chapter: null, subtopic: 'General', correctStreak: 0 }]);
  });

  it('scopes to one chapter in memory — same result set as the app second query shape', async () => {
    const out = await getActiveMistakes(backendWith(ACTIVES), 3);
    expect(out.map((m) => m.questionId)).toEqual(['q-a', 'q-c']);
  });

  it('returns [] when signed out, without reading', async () => {
    const backend = backendWith(ACTIVES, null);
    const read = vi.spyOn(backend, 'readActiveMistakes');
    expect(await getActiveMistakes(backend)).toEqual([]);
    expect(read).not.toHaveBeenCalled();
  });

  it('degrades a failed read quietly to [] (app catch), never throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const backend = backendWith([]);
    backend.readActiveMistakes = async () => {
      throw new Error('offline');
    };
    expect(await getActiveMistakes(backend)).toEqual([]);
  });
});

describe('loadMistakeQuestions — per-card degradation, _streak, shuffle', () => {
  it('empty active deck resolves [] without a single fetch', async () => {
    const fetchById = vi.fn();
    expect(await loadMistakeQuestions(backendWith([]), fetchById, 3)).toEqual([]);
    expect(fetchById).not.toHaveBeenCalled();
  });

  it('one null fetch drops that card, never the deck', async () => {
    const actives: ActiveMistake[] = [
      { id: 'ok-1', correctStreak: 0, chapter: 3 },
      { id: 'denied', correctStreak: 1, chapter: 3 },
      { id: 'ok-2', correctStreak: 1, chapter: 3 },
    ];
    const fetchById = vi.fn(async (id: string) =>
      id === 'denied' ? null : makeQuestion(id),
    );
    const deck = await loadMistakeQuestions(backendWith(actives), fetchById, 3);
    expect(fetchById).toHaveBeenCalledTimes(3);
    expect(deck.map((q) => q.id).sort()).toEqual(['ok-1', 'ok-2']);
  });

  it('each question carries its own _streak', async () => {
    const actives: ActiveMistake[] = [
      { id: 'q-a', correctStreak: 1, chapter: 3 },
      { id: 'q-b', correctStreak: 0, chapter: 3 },
    ];
    const deck = await loadMistakeQuestions(
      backendWith(actives),
      async (id) => makeQuestion(id),
      3,
    );
    const byId = new Map(deck.map((q) => [q.id, q._streak]));
    expect(byId.get('q-a')).toBe(1);
    expect(byId.get('q-b')).toBe(0);
  });

  it('only fetches the scoped chapter ids', async () => {
    const actives: ActiveMistake[] = [
      { id: 'in-scope', correctStreak: 0, chapter: 3 },
      { id: 'other-chapter', correctStreak: 0, chapter: 7 },
    ];
    const fetchById = vi.fn(async (id: string) => makeQuestion(id));
    await loadMistakeQuestions(backendWith(actives), fetchById, 3);
    expect(fetchById.mock.calls.map((c) => c[0])).toEqual(['in-scope']);
  });

  it('shuffles via the ported quizEngine shuffle — deterministic under an injected rng', async () => {
    const actives: ActiveMistake[] = ['q1', 'q2', 'q3', 'q4'].map((id) => ({
      id,
      correctStreak: 0,
      chapter: 3,
    }));
    const rng = () => 0; // fully deterministic Fisher–Yates path
    const deck = await loadMistakeQuestions(
      backendWith(actives),
      async (id) => makeQuestion(id),
      3,
      rng,
    );
    // The exact order the real engine shuffle produces for this rng — proof
    // the ported shuffle ran (raw seam order would differ).
    const expected = shuffle(
      actives.map((m) => ({ ...makeQuestion(m.id), _streak: 0 })),
      () => 0,
    ).map((q) => q.id);
    expect(deck.map((q) => q.id)).toEqual(expected);
    expect(deck.map((q) => q.id)).not.toEqual(['q1', 'q2', 'q3', 'q4']);
  });
});
