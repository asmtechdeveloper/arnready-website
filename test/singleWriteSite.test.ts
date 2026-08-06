/**
 * The single-write-site guarantee (manual M4, review protocol §4 M4).
 *
 * "Single write site: no other web module writes progress/sessions/mistakes
 * (grep for collection names across src/)." A reviewer runs that grep once;
 * this runs it on every commit, forever.
 *
 * Why it matters beyond tidiness: the app and the website write to the SAME
 * `users/{uid}` tree. A second web module writing a session document its own
 * way would corrupt the app's Prepometer without failing any parity test —
 * because the parity test only covers the service it knows about. Containment
 * is what makes the parity proof meaningful.
 *
 * This is a source-text scan by design: the property is "no code path anywhere
 * writes these collections", and no runtime test can demonstrate the absence of
 * a path it did not happen to execute.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', 'src');

/** The one module permitted to hold Firestore mutation calls. */
const WRITE_SITE = 'lib/progressBackend.ts';

/**
 * The subcollections the app also reads and writes. Nothing outside the write
 * site may name these at all — there is no legitimate read of them elsewhere.
 */
const SHARED_COLLECTIONS = ['chapterProgress', 'sessions', 'mistakes'];

/**
 * `users` is handled separately because it has one legitimate READER: M3's
 * entitlement listener, which subscribes to `users/{uid}` for `isPaid` and is
 * already pinned read-only by `isPaidDiscipline.test.ts`. Reading is fine;
 * writing is what must stay contained.
 */
const USERS_READERS = ['lib/entitlementStore.ts'];

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) found.push(full);
  }
  return found;
}

/** Comments stripped: prose naming a collection is fine; code is what binds. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const FILES = sourceFiles(SRC).map((file) => ({
  rel: path.relative(SRC, file),
  code: stripComments(readFileSync(file, 'utf8')),
}));

describe('single write site for progress, sessions and mistakes', () => {
  it.each(SHARED_COLLECTIONS)('only the write site names the %s collection in code', (name) => {
    const offenders = FILES.filter(
      (f) => f.rel !== WRITE_SITE && new RegExp(`['"\`]${name}['"\`]`).test(f.code),
    ).map((f) => f.rel);
    expect(offenders, `'${name}' referenced in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('the write site exists and names every shared collection', () => {
    const backend = FILES.find((f) => f.rel === WRITE_SITE);
    expect(backend, `${WRITE_SITE} is missing`).toBeDefined();
    for (const name of [...SHARED_COLLECTIONS, 'users']) {
      expect(backend!.code).toMatch(new RegExp(`['"\`]${name}['"\`]`));
    }
  });

  it('only the write site and the entitlement reader name the users collection', () => {
    const offenders = FILES.filter(
      (f) => f.rel !== WRITE_SITE && !USERS_READERS.includes(f.rel) && /['"`]users['"`]/.test(f.code),
    ).map((f) => f.rel);
    expect(offenders, `'users' referenced in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('the progress services reach Firestore only through the backend seam', () => {
    for (const rel of ['lib/progressService.ts', 'lib/mistakesService.ts', 'lib/mockService.ts']) {
      const file = FILES.find((f) => f.rel === rel);
      expect(file, `${rel} is missing`).toBeDefined();
      // No direct SDK import: every Firestore touch is an injected method call,
      // which is exactly what makes the parity test able to observe them all.
      expect(file!.code, `${rel} imports the Firestore SDK directly`).not.toMatch(
        /from\s*['"]firebase\/firestore['"]/,
      );
    }
  });

  it('the exam/practice/flashcard write sites live in one module', () => {
    const recorders = FILES.filter((f) =>
      /export\s+async\s+function\s+record(Exam|Practice|Flashcard)Session/.test(f.code),
    ).map((f) => f.rel);
    expect(recorders).toEqual(['lib/progressService.ts']);
  });

  it('the mistakes hook has exactly one definition', () => {
    const hooks = FILES.filter((f) => /export\s+async\s+function\s+updateMistakesFromRun/.test(f.code)).map(
      (f) => f.rel,
    );
    expect(hooks).toEqual(['lib/mistakesService.ts']);
  });

  it('the mock write site lives in one module (M6)', () => {
    // Same containment as the exam/practice/flashcard recorders: the mock
    // attempt (the one-free-ever counter write) has exactly one definition,
    // and it lives in the ported service — never restated by a surface.
    const recorders = FILES.filter((f) =>
      /export\s+async\s+function\s+(recordMockAttempt|canTakeMock|getMockHistory)/.test(f.code),
    ).map((f) => f.rel);
    expect(recorders).toEqual(['lib/mockService.ts']);
  });
});
