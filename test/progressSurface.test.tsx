import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

import type { MockHistoryEntry } from '@/lib/mockService';
import type { ProgressBlob, ScopeBlob } from '@/lib/progressService';

/**
 * `/app/progress` — the ProgressSurface (M6): the read-only progress view.
 * Pins THE DISPLAY LAW ported from the app's ChapterListScreen ChapterRow
 * (manual §1: "Never compare the two on one surface"):
 *
 *   - readiness is the FULL-exam lastPercentage ONLY, presence-checked (a 0%
 *     full exam counts), rendered as pct + a filled bar;
 *   - a chapter with BOTH scopes shows readiness and NO sample text — full
 *     readiness and sample accuracy never share a row;
 *   - sample-only → the neutral 'Free sample: {score}/{total}' line (the
 *     blob's LOCKED lastScore/lastTotal pair), no pct, empty bar;
 *   - practice-only → the practised line; untouched → not started;
 *   - a null backend degrades every row to not-started (a failed read reads
 *     as "no progress yet" — the M4 declared deviation), never a crash;
 *   - mock history renders newest-first (stored order reversed, the
 *     MockSurface idiom) and the empty state links to /app/mock;
 *   - rows link to /app/practice?chapter=N with the weight chip rendered;
 *   - the surface is structurally read-only and entitlement-free.
 *
 * Service/backend mocks follow test/mistakesSurface.test.tsx's idiom.
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

const getChapterProgress = vi.fn();
vi.mock('@/lib/progressService', () => ({
  getChapterProgress: (...args: unknown[]) => getChapterProgress(...args),
}));

const getMockHistory = vi.fn();
vi.mock('@/lib/mockService', () => ({
  getMockHistory: (...args: unknown[]) => getMockHistory(...args),
}));

/** A non-null backend stub — its methods are never reached (services mocked). */
const STUB_BACKEND = { uid: () => 'test-uid' };
const firestoreBackend = vi.fn();
vi.mock('@/lib/progressBackend', () => ({
  firestoreBackend: () => firestoreBackend(),
}));

// Imported AFTER the mocks are registered.
const { ProgressSurface } = await import('@/components/ProgressSurface');
const { metadata } = await import('@/app/app/progress/page');
const { useAuth } = await import('@/lib/authStore');
const { appShell, progress: copy, mockSurface, syllabus } = await import('@/lib/copy');
const { MOCK_CHAPTER_WEIGHTS } = await import('@/lib/mockConfig');

function signedIn(uid = 'uid-a') {
  useAuth.setState({ user: { uid, displayName: 'Test Learner', email: 'test@example.com' } });
}

function scope(over: Partial<ScopeBlob> = {}): ScopeBlob {
  return {
    lastScore: 0,
    lastTotal: 0,
    lastAttempted: 0,
    lastPercentage: 0,
    bestScore: 0,
    bestTotal: 0,
    attempts: 1,
    wrong: [],
    ...over,
  };
}

function blob(over: Partial<ProgressBlob> = {}): ProgressBlob {
  return {
    sample: null,
    full: null,
    practiced: 0,
    lastScore: 0,
    lastTotal: 0,
    lastAttempted: 0,
    lastPercentage: 0,
    bestScore: 0,
    bestTotal: 0,
    attempts: 0,
    wrong: [],
    ...over,
  };
}

/** Wires getChapterProgress to answer per chapter number; unset → null. */
function progressByChapter(byChapter: Record<number, ProgressBlob | null>) {
  getChapterProgress.mockImplementation((_backend: unknown, n: number) =>
    Promise.resolve(byChapter[n] ?? null),
  );
}

function historyEntry(over: Partial<MockHistoryEntry> = {}): MockHistoryEntry {
  return { date: '2026-08-01T10:00:00.000Z', score: 60, total: 100, percentage: 60, ...over };
}

async function renderLoaded() {
  render(<ProgressSurface />);
  await waitFor(() => expect(screen.getByText(copy.title)).toBeInTheDocument());
}

function chapterRows(): HTMLElement[] {
  const list = screen.getByRole('region', { name: copy.listLabel });
  return within(list).getAllByRole('listitem');
}

beforeEach(() => {
  configured = true;
  useAuth.setState({ user: undefined, signingIn: false });
  getChapterProgress.mockReset();
  getChapterProgress.mockResolvedValue(null);
  getMockHistory.mockReset();
  getMockHistory.mockResolvedValue([]);
  firestoreBackend.mockReset();
  firestoreBackend.mockReturnValue(STUB_BACKEND);
});

describe('/app/progress — route indexing', () => {
  it('declares noindex, nofollow, same as the other /app routes', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe(copy.meta.title);
  });
});

describe('ProgressSurface — auth chrome', () => {
  it('signed out shows the sign-in prompt, and no read runs', () => {
    useAuth.setState({ user: null });
    render(<ProgressSurface />);
    expect(screen.getByText(appShell.signedOut.title)).toBeInTheDocument();
    expect(getChapterProgress).not.toHaveBeenCalled();
    expect(getMockHistory).not.toHaveBeenCalled();
  });

  it('unconfigured Firebase shows the unavailable card', () => {
    configured = false;
    render(<ProgressSurface />);
    expect(screen.getByText(appShell.unavailable.title)).toBeInTheDocument();
  });
});

describe('ProgressSurface — the display law (full-exam readiness only)', () => {
  it('a full-exam chapter shows pct + filled bar and NEVER sample text, even with both scopes', async () => {
    signedIn();
    // Chapter 1 holds BOTH a full exam (72%) and a sample (7/10) — the row
    // must show only the full readiness (the display-law pin).
    progressByChapter({
      1: blob({
        full: scope({ lastScore: 22, lastTotal: 30, lastPercentage: 72 }),
        sample: scope({ lastScore: 7, lastTotal: 10, lastPercentage: 70 }),
        practiced: 40,
      }),
    });
    await renderLoaded();

    const row = chapterRows()[0] as HTMLElement;
    expect(row).toHaveTextContent(copy.readiness(72));
    expect(within(row).getByTestId('progress-bar-fill-1')).toBeInTheDocument();
    // NO sample or practice text beside full readiness — never on one row.
    expect(row).not.toHaveTextContent(copy.sampleActivity(7, 10));
    expect(row).not.toHaveTextContent(copy.practiceActivity(40));
  });

  it('a 0% full exam COUNTS as readiness (presence check, not truthiness)', async () => {
    signedIn();
    progressByChapter({
      2: blob({
        full: scope({ lastScore: 0, lastTotal: 30, lastPercentage: 0 }),
        sample: scope({ lastScore: 7, lastTotal: 10, lastPercentage: 70 }),
      }),
    });
    await renderLoaded();

    const row = chapterRows()[1] as HTMLElement;
    expect(row).toHaveTextContent(copy.readiness(0));
    expect(within(row).getByTestId('progress-bar-fill-2')).toBeInTheDocument();
    expect(row).not.toHaveTextContent(copy.sampleActivity(7, 10));
  });

  it('a sample-only chapter shows the neutral sample line, no pct, empty bar', async () => {
    signedIn();
    // lastScore/lastTotal — the LOCKED denominator pair — never served count.
    progressByChapter({
      3: blob({ sample: scope({ lastScore: 7, lastTotal: 10, lastPercentage: 70 }) }),
    });
    await renderLoaded();

    const row = chapterRows()[2] as HTMLElement;
    expect(row).toHaveTextContent(copy.sampleActivity(7, 10));
    expect(row).not.toHaveTextContent(copy.readiness(70));
    expect(within(row).queryByTestId('progress-bar-fill-3')).toBeNull();
  });

  it('practice-only shows the practised line; an untouched chapter shows not started', async () => {
    signedIn();
    progressByChapter({ 4: blob({ practiced: 12 }) });
    await renderLoaded();

    const rows = chapterRows();
    expect(rows[3]).toHaveTextContent(copy.practiceActivity(12));
    expect(within(rows[3] as HTMLElement).queryByTestId('progress-bar-fill-4')).toBeNull();
    expect(rows[4]).toHaveTextContent(copy.notStarted);
  });
});

describe('ProgressSurface — data plumbing', () => {
  it('issues 12 parallel getChapterProgress reads through the backend seam', async () => {
    signedIn();
    await renderLoaded();
    expect(getChapterProgress).toHaveBeenCalledTimes(syllabus.chapters.length);
    for (let n = 1; n <= syllabus.chapters.length; n++) {
      expect(getChapterProgress).toHaveBeenCalledWith(STUB_BACKEND, n);
    }
    expect(getMockHistory).toHaveBeenCalledWith(STUB_BACKEND);
  });

  it('a null backend renders every row as not started with the empty mock line — no crash', async () => {
    signedIn();
    firestoreBackend.mockReturnValue(null);
    await renderLoaded();

    const rows = chapterRows();
    expect(rows).toHaveLength(syllabus.chapters.length);
    for (const row of rows) {
      expect(row).toHaveTextContent(copy.notStarted);
    }
    expect(getChapterProgress).not.toHaveBeenCalled();
    expect(getMockHistory).not.toHaveBeenCalled();
    expect(screen.getByText(copy.mockHistory.empty.text)).toBeInTheDocument();
  });

  it('rows link to /app/practice?chapter=N and render the weight chip', async () => {
    signedIn();
    await renderLoaded();

    const rows = chapterRows();
    for (let n = 1; n <= rows.length; n++) {
      const row = rows[n - 1] as HTMLElement;
      const link = within(row).getByRole('link');
      expect(link).toHaveAttribute('href', `/app/practice?chapter=${n}`);
      expect(row).toHaveTextContent(copy.weightChip(MOCK_CHAPTER_WEIGHTS[n] as number));
      expect(row).toHaveTextContent(syllabus.chapters[n - 1] as string);
    }
  });
});

describe('ProgressSurface — mock history', () => {
  it('renders rows newest-first (stored order reversed, the MockSurface idiom)', async () => {
    signedIn();
    // Stored order is oldest-first — the surface must reverse it.
    getMockHistory.mockResolvedValue([
      historyEntry({ date: '2026-07-01T10:00:00.000Z', score: 48 }),
      historyEntry({ date: '2026-08-01T10:00:00.000Z', score: 62, weakChapters: [4, 9] }),
    ]);
    await renderLoaded();

    const section = screen.getByRole('region', { name: copy.mockHistory.heading });
    const rows = within(section).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('62 / 100');
    expect(rows[0]).toHaveTextContent(mockSurface.historyWeak('Ch 4, Ch 9'));
    expect(rows[1]).toHaveTextContent('48 / 100');
    expect(rows[1]).toHaveTextContent(mockSurface.historyNoWeak);
    expect(within(section).queryByText(copy.mockHistory.empty.text)).toBeNull();
  });

  it('an empty history shows one quiet line linking to /app/mock', async () => {
    signedIn();
    await renderLoaded();

    const section = screen.getByRole('region', { name: copy.mockHistory.heading });
    expect(within(section).getByText(copy.mockHistory.empty.text)).toBeInTheDocument();
    expect(
      within(section).getByRole('link', { name: copy.mockHistory.empty.link.label }),
    ).toHaveAttribute('href', '/app/mock');
  });
});

describe('ProgressSurface — structurally read-only and entitlement-free', () => {
  const NEW_FILES = ['src/components/ProgressSurface.tsx', 'src/app/app/progress/page.tsx'];

  it.each(NEW_FILES)('%s never names the paid flag or the entitlement store', (rel) => {
      // The surface is READ-ONLY and identical for both tiers, so it carries
      // no entitlement at all — isPaidDiscipline's exhaustive allowlist must
      // never need these files added (the mistakesPlayer source-scan idiom).
    const source = readFileSync(
      path.resolve(import.meta.dirname, '..', ...rel.split('/')),
      'utf8',
    );
    expect(source.length).toBeGreaterThan(100); // guard is not a stub
    expect(source).not.toMatch(/isPaid/);
    expect(source).not.toMatch(/entitlementStore|useEntitlement/);
  });

  it('ProgressSurface imports no recording, nudge, or wall machinery', () => {
    const source = readFileSync(
      path.resolve(import.meta.dirname, '..', 'src', 'components', 'ProgressSurface.tsx'),
      'utf8',
    );
    // Import specifiers, not raw text — the mockSurface.test.tsx idiom.
    const specifiers: string[] = [];
    const re = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) if (m[1]) specifiers.push(m[1]);
    expect(specifiers.length).toBeGreaterThan(3); // guard is not a stub
    expect(specifiers.filter((s) => /PremiumNudge|UpgradeWall|nudgeGates/.test(s))).toEqual([]);
    // Read-only: none of the write-side service functions are imported.
    expect(source).not.toMatch(
      /recordExamSession|recordPracticeSession|recordMockAttempt|recordFlashcardSession|writeSessionLog|updateMistakesFromRun/,
    );
  });
});
