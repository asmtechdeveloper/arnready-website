import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Structural enforcement of manual §0.9 / CLAUDE.md non-negotiable 3:
 * `users/{uid}.isPaid` is SERVER-WRITE-ONLY.
 *
 * The review protocol's §3.5 check is "grep the diff for writes". A reviewer
 * does that once; this does it on every commit, forever. It is deliberately a
 * source-text scan rather than a behavioural test: the property we need is
 * "no code path anywhere can write entitlement", and no runtime test can
 * demonstrate the absence of a path it didn't happen to execute.
 */
const SRC = path.resolve(import.meta.dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) found.push(full);
  }
  return found;
}

/** Comments stripped: prose ABOUT entitlement is fine; code is what binds. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const FILES = sourceFiles(SRC).map((file) => {
  const text = readFileSync(file, 'utf8');
  return { rel: path.relative(SRC, file), text, code: stripComments(text) };
});

/** The names each file imports from 'firebase/firestore'. */
function firestoreImports(code: string): string[] {
  const names: string[] = [];
  const pattern = /import\s*\{([^}]*)\}\s*from\s*['"]firebase\/firestore['"]/g;
  for (const match of code.matchAll(pattern)) {
    for (const raw of (match[1] ?? '').split(',')) {
      const name = (raw.trim().split(/\s+as\s+/)[0] ?? '').trim();
      if (name) names.push(name);
    }
  }
  return names;
}

/**
 * Every Firestore mutation entry point in the modular Web SDK. M3 writes
 * NOTHING: user-document creation is M4's, and it will add these imports
 * deliberately, in one reviewed service (manual M4: "the single-write-site
 * problem"). Until then, any occurrence is a defect.
 */
const FIRESTORE_WRITE_APIS = [
  'setDoc',
  'updateDoc',
  'addDoc',
  'deleteDoc',
  'writeBatch',
  'runTransaction',
  'setDocument',
  'increment',
  'arrayUnion',
  'arrayRemove',
  'deleteField',
  'serverTimestamp',
];

describe('isPaid is server-write-only (manual §0.9)', () => {
  it('no src/ module imports a Firestore write API', () => {
    const offenders = FILES.flatMap((f) =>
      firestoreImports(f.code)
        .filter((name) => FIRESTORE_WRITE_APIS.includes(name))
        .map((name) => `${f.rel}: ${name}`),
    );
    expect(offenders).toEqual([]);
  });

  it.each(FIRESTORE_WRITE_APIS)('no src/ module calls %s(...)', (api) => {
    // Catches indirect use (namespace import, re-export) that the import
    // check above would miss.
    const offenders = FILES.filter((f) => new RegExp(`\\b${api}\\s*\\(`).test(f.code)).map(
      (f) => f.rel,
    );
    expect(offenders, `${api}() called in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('the entitlement store is the only module that reads the isPaid FIELD', () => {
    // nudgeGates.ts takes `isPaid` as a pure function PARAMETER (the M2
    // decision layer) — it never touches Firestore, so it is not a second
    // source of truth. Anything else naming the field in code is.
    const ALLOWED = ['lib/entitlementStore.ts', 'lib/nudgeGates.ts', 'components/AppShell.tsx'];
    const mentions = FILES.filter((f) => /isPaid/.test(f.code)).map((f) => f.rel);
    expect(mentions.sort()).toEqual([...ALLOWED].sort());
  });

  it('nudgeGates receives isPaid as a parameter and never imports Firestore', () => {
    const gates = FILES.find((f) => f.rel === 'lib/nudgeGates.ts')!;
    expect(gates.code).not.toMatch(/from\s*['"]firebase/);
    expect(firestoreImports(gates.code)).toEqual([]);
  });

  it('entitlementStore reads isPaid ONLY via strict === true equality', () => {
    const store = FILES.find((f) => f.rel === 'lib/entitlementStore.ts')!.text;
    // Strip comments so prose about isPaid cannot mask a real assignment.
    const code = store.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    const reads = code.match(/isPaid[^\n]*/g) ?? [];
    for (const line of reads) {
      // No assignment TO the Firestore field, in any form.
      expect(line).not.toMatch(/isPaid\s*[:=]\s*true/);
      expect(line).not.toMatch(/isPaid\s*\+\+|isPaid\s*\|\|=/);
    }
    // The one read that grants entitlement is a strict comparison.
    expect(code).toMatch(/isPaid\s*===\s*true/);
  });

  it('AppShell never derives entitlement — it only consumes the store', () => {
    const shell = FILES.find((f) => f.rel === 'components/AppShell.tsx')!.text;
    expect(shell).toMatch(/useEntitlement/);
    // No local computation, defaulting, or override of paid state.
    expect(shell).not.toMatch(/isPaid\s*=\s*(?!\{)/);
    expect(shell).not.toMatch(/isPaid\s*\?\?/);
    expect(shell).not.toMatch(/isPaid\s*\|\|/);
  });

  it('entitlement is never cached in web storage (no cross-account bleed)', () => {
    // The app caches isPaid per-uid in AsyncStorage; the web deliberately does
    // not (review protocol M3: "no caching across accounts").
    const offenders = FILES.filter((f) =>
      /localStorage|sessionStorage|indexedDB|document\.cookie/.test(f.text),
    ).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it('no module writes to the users collection', () => {
    const offenders = FILES.filter(
      (f) => /collection\(\s*['"`]users/.test(f.text) || /['"`]users['"`]\s*,[^)]*\)\s*\.set/.test(f.text),
    ).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });
});
