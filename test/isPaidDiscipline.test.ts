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
 * Every Firestore mutation entry point in the modular Web SDK.
 *
 * M3 asserted that NO src/ module used any of these, and recorded why: "user
 * document creation is M4's, and it will add these imports deliberately, in one
 * reviewed service (manual M4: 'the single-write-site problem')."
 *
 * M4 is that milestone. The assertions below are therefore NARROWED, not
 * relaxed: every write API is still banned everywhere in `src/` except the one
 * allowlisted backend module. The guarantee changes from "nothing writes" to
 * "exactly one reviewed module writes", which is the strongest form available
 * once the product must write at all. Widening WRITE_SITE beyond one file
 * should be treated as a defect.
 */
const WRITE_SITE = 'lib/progressBackend.ts';
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
  it('only the single write site imports a Firestore write API', () => {
    const offenders = FILES.filter((f) => f.rel !== WRITE_SITE).flatMap((f) =>
      firestoreImports(f.code)
        .filter((name) => FIRESTORE_WRITE_APIS.includes(name))
        .map((name) => `${f.rel}: ${name}`),
    );
    expect(offenders).toEqual([]);
  });

  it.each(FIRESTORE_WRITE_APIS)('no src/ module outside the write site calls %s(...)', (api) => {
    // Catches indirect use (namespace import, re-export) that the import check
    // above would miss.
    //
    // The lookbehind excludes METHOD calls — `backend.increment(n)` and
    // `backend.serverTimestamp()` are calls on the injected ProgressBackend
    // seam, not on the Firestore SDK. That distinction is the whole point of
    // the seam: the progress services never hold an SDK handle, which is why
    // the parity test can observe every sentinel they produce. A bare
    // `increment(` in those files WOULD still fail here.
    const offenders = FILES.filter(
      (f) => f.rel !== WRITE_SITE && new RegExp(`(?<![.\\w])${api}\\s*\\(`).test(f.code),
    ).map((f) => f.rel);
    expect(offenders, `${api}() called in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('the entitlement store is the only module that reads the isPaid FIELD', () => {
    // nudgeGates.ts takes `isPaid` as a pure function PARAMETER (the M2
    // decision layer) — it never touches Firestore, so it is not a second
    // source of truth. Anything else naming the field in code is.
    // lib/progressBackend.ts joins the list in M4: `ensureUserDocument` must
    // write `isPaid: false` at creation, because the DEPLOYED rule
    // `allow create: … request.resource.data.isPaid == false` requires the
    // field to be present and false. That is the single permitted mention, and
    // the test below pins it to exactly that literal.
    const ALLOWED = [
      'lib/entitlementStore.ts',
      'lib/nudgeGates.ts',
      'lib/progressBackend.ts',
      'components/AppShell.tsx',
    ];
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

  it('only the single write site WRITES to the users collection', () => {
    // M3's entitlement listener legitimately READS `users/{uid}`; that is
    // pinned read-only above and by `singleWriteSite.test.ts`. What must stay
    // contained is writing — a module that both names the collection and holds
    // a mutation call.
    const READ_ONLY = ['lib/entitlementStore.ts'];
    const offenders = FILES.filter((f) => {
      if (f.rel === WRITE_SITE || READ_ONLY.includes(f.rel)) return false;
      const namesUsers = /collection\(\s*['"`]users/.test(f.code) || /doc\(\s*\w+\s*,\s*['"`]users/.test(f.code);
      return namesUsers;
    }).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it('the write site mentions isPaid exactly once, as the literal false', () => {
    const backend = FILES.find((f) => f.rel === WRITE_SITE)!.code;
    const mentions = backend.match(/isPaid[^\n]*/g) ?? [];
    expect(mentions).toEqual(['isPaid: false,']);
  });

  it('the write site can never raise isPaid, on any path', () => {
    const backend = FILES.find((f) => f.rel === WRITE_SITE)!.code;
    // Every `isPaid:` in the write site must be followed by exactly `false`.
    expect(backend.match(/isPaid\s*:\s*\w+/g)).toEqual(['isPaid: false']);
    expect(backend).not.toMatch(/isPaid\s*=[^=]/);
  });

  it('only whitelisted profile keys can reach the user document', () => {
    const backend = FILES.find((f) => f.rel === WRITE_SITE)!.code;
    // The user document spreads `safeProfile` (as the app does), so the
    // security boundary is the whitelist that BUILDS safeProfile, not the
    // absence of a spread. Exactly two keys may be copied out of the caller's
    // object, each behind a typeof guard.
    expect(backend).toMatch(/typeof\s+profile\.displayName\s*===\s*'string'/);
    expect(backend).toMatch(/typeof\s+profile\.newsletterOptIn\s*===\s*'boolean'/);
    const assignments = backend.match(/safeProfile\.\w+\s*=/g) ?? [];
    expect(assignments.sort()).toEqual(['safeProfile.displayName =', 'safeProfile.newsletterOptIn =']);
    // Nothing else may be spread into the document — only safeProfile.
    const spreads = backend.match(/\.\.\.\w+/g) ?? [];
    expect(spreads).toEqual(['...safeProfile']);
  });

  it('ensureUserDocument runs in a transaction and branches on existence', () => {
    const backend = FILES.find((f) => f.rel === WRITE_SITE)!.code;
    // A transaction is what stops a concurrent server-side entitlement grant
    // from being clobbered: Firestore retries the read rather than letting this
    // write land on stale state.
    expect(backend).toMatch(/runTransaction/);
    expect(backend).toMatch(/if\s*\(\s*snap\.exists\(\)\s*\)\s*\{/);
    // The existing-document branch may write ONLY the whitelist, merged.
    expect(backend).toMatch(/transaction\.set\(\s*ref,\s*safeProfile,\s*\{\s*merge:\s*true\s*\}\s*\)/);
    // Behavioural coverage of every branch lives in ensureUserDocument.test.ts.
  });
});
