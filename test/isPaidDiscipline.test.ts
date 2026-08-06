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
 * That expectation was HALF right, and the half it got wrong matters. M4 does
 * write — progress, sessions and mistakes — so the assertions below are
 * NARROWED, not relaxed: every write API is still banned everywhere in `src/`
 * except the one allowlisted backend module. The guarantee moves from "nothing
 * writes" to "exactly one reviewed module writes". Widening WRITE_SITE beyond
 * one file should be treated as a defect.
 *
 * But M4 does NOT create the user document, contrary to M3's note. Codex M4-B1
 * established that it cannot: the deployed rule requires a client create to
 * send `isPaid: false`, and §0.9 forbids any client path writing that field, so
 * the two cannot both be satisfied. The root document stays server-owned. The
 * two assertions at the end of this file pin that absence.
 */
/**
 * Every module permitted to NAME `isPaid`, classified by HOW it is allowed to
 * (M5). Entitlement has exactly one source; everything else consumes it, and
 * each category below is pinned by a proof appropriate to its kind. Adding a
 * file here without the matching guarantee is what the per-category tests
 * exist to prevent — the categories are the point, not the list.
 */
/** The ONE source of truth: reads the Firestore field, strictly. */
const ENTITLEMENT_SOURCE = ['lib/entitlementStore.ts'];

/** Pure decision layers: `isPaid` is a caller-supplied parameter. No Firestore at all. */
const PURE_PARAMETER_CONSUMERS = ['lib/nudgeGates.ts', 'lib/quizEngine.ts'];

/**
 * Seam-bound services (M6): `isPaid` is a caller-supplied parameter (the app's
 * own `canTakeMock(isPaid)` signature), and every Firestore touch goes through
 * the injected ProgressBackend seam — no direct SDK import, so the same proof
 * as the pure consumers applies, plus `singleWriteSite.test.ts`'s containment.
 */
const SEAM_PARAMETER_CONSUMERS = ['lib/mockService.ts'];

/**
 * Delivery: legitimately imports Firestore (it issues the reads) and takes
 * `isPaid` as a parameter to choose WHICH query — but must never read the
 * field off a document, query it, or import the store.
 */
const DELIVERY_CONSUMERS = ['lib/questionDelivery.ts'];

/**
 * Store-connected UI: obtains entitlement ONLY from `useEntitlement`. These are
 * the ONLY files permitted to pass `isPaid` down as a prop (pinned below), so
 * entitlement always enters the component tree at a store-connected root.
 */
const UI_CONSUMERS = [
  'components/AppShell.tsx',
  'components/PracticeSurface.tsx',
  'components/ExamSurface.tsx',
  'components/FlashcardsSurface.tsx',
  // M6: the mock pre-start surface — same shape as the M5 surfaces: store-
  // connected root, passes isPaid down (to canTakeMock/fetchMockQuestions/
  // MockPlayer), never sources or derives it.
  'components/MockSurface.tsx',
];

/**
 * Presentational players that RECEIVE `isPaid` as a prop from a store-connected
 * parent above and forward it straight into the pinned gate functions.
 *
 * Why this is a category rather than a hole: the danger of a prop is that paid
 * state could enter from anywhere. That is closed by the companion test below,
 * which asserts the only files that ever PASS `isPaid` as a prop are the
 * store-connected UI_CONSUMERS. Entitlement therefore still has exactly one
 * entry point into the tree, and a player that re-renders on sign-out or an
 * account switch does so because the store reset its parent.
 *
 * The alternative — hoisting gate calls into the surfaces to keep players free
 * of the name — would make the surfaces into players and is worse design, not
 * better discipline.
 */
const PROP_GATE_CONSUMERS = [
  'components/PracticePlayer.tsx',
  'components/ExamPlayer.tsx',
  'components/FlashcardPlayer.tsx',
];

/**
 * Pitch-visibility consumers (M6): the mock run and its results block.
 * `isPaid` enters as a prop from the store-connected MockSurface and is read
 * for exactly ONE purpose — whether the post-run results render the premium
 * pitch (`MockPlayer` only forwards it; `MockResults` branches on it). Never
 * a gate (the mock run is a zero-nudge surface, pinned by
 * test/mockPlayer.test.tsx's source scan), never a scoring branch (a mock is
 * always scored over its paper), never a source: the per-category test below
 * proves no Firestore import, no store access, and no derivation.
 */
const PROP_PITCH_CONSUMERS = ['components/MockPlayer.tsx', 'components/MockResults.tsx'];

const ALLOWED = [
  ...ENTITLEMENT_SOURCE,
  ...PURE_PARAMETER_CONSUMERS,
  ...SEAM_PARAMETER_CONSUMERS,
  ...DELIVERY_CONSUMERS,
  ...UI_CONSUMERS,
  ...PROP_GATE_CONSUMERS,
  ...PROP_PITCH_CONSUMERS,
];

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

  /**
   * Shared proof for every module allowed to NAME `isPaid`: each occurrence is
   * a caller-supplied parameter or a destructure of one — never an assignment,
   * a default, or a local derivation of entitlement.
   */
  function expectNeverDerivesEntitlement(code: string): void {
    for (const line of code.match(/^.*isPaid.*$/gm) ?? []) {
      expect(line).not.toMatch(/isPaid\s*[:=]\s*true/);
      expect(line).not.toMatch(/isPaid\s*\?\?/);
      expect(line).not.toMatch(/isPaid\s*\|\|/);
      expect(line).not.toMatch(/isPaid\s*\+\+/);
    }
  }

  it('the entitlement store is the only module that reads the isPaid FIELD', () => {
    // Historical note worth keeping: an M4 draft added lib/progressBackend.ts
    // here, because a ported `ensureUserDocument` wrote `isPaid: false` on
    // creation. Codex M4-B1 rejected that as a §0.9 violation and it was
    // removed, so the write site names the field nowhere at all.
    //
    // M5 groups the list BY CATEGORY (see the constants above the suite). The
    // list stays exhaustive — a new file naming `isPaid` still fails here until
    // someone consciously classifies it — but each category now carries the
    // proof that fits it, so the list cannot be widened without also earning
    // the matching guarantee.
    const mentions = FILES.filter((f) => /isPaid/.test(f.code)).map((f) => f.rel);
    expect(mentions.sort()).toEqual([...ALLOWED].sort());
  });

  it.each(PURE_PARAMETER_CONSUMERS)(
    '%s receives isPaid as a pure parameter and imports no Firestore at all',
    (rel) => {
      const mod = FILES.find((f) => f.rel === rel)!;
      expect(mod.code).not.toMatch(/from\s*['"]firebase/);
      expect(firestoreImports(mod.code)).toEqual([]);
      expectNeverDerivesEntitlement(mod.code);
    },
  );

  it.each(SEAM_PARAMETER_CONSUMERS)(
    '%s receives isPaid as a parameter and reaches Firestore only through the seam (M6)',
    (rel) => {
      const mod = FILES.find((f) => f.rel === rel)!;
      // No direct SDK handle — every Firestore touch is an injected method
      // call, which is what lets the port tests observe them all. Never reads
      // the field off a document and never consults the store.
      expect(mod.code).not.toMatch(/from\s*['"]firebase/);
      expect(firestoreImports(mod.code)).toEqual([]);
      expect(mod.code).not.toMatch(/entitlementStore/);
      expect(mod.code).not.toMatch(/useEntitlement/);
      expect(mod.code).not.toMatch(/\.isPaid\b/);
      expectNeverDerivesEntitlement(mod.code);
    },
  );

  it.each(DELIVERY_CONSUMERS)(
    '%s consumes isPaid but can never become a source of it (M5)',
    (rel) => {
      const mod = FILES.find((f) => f.rel === rel)!;

      // It legitimately imports Firestore — it issues the reads. What it must
      // never do is take entitlement FROM Firestore or from the store.
      expect(mod.code).not.toMatch(/entitlementStore/);
      expect(mod.code).not.toMatch(/useEntitlement/);

      // Never reads the field off a document, and never queries it.
      expect(mod.code).not.toMatch(/\.isPaid\b/);
      expect(mod.code).not.toMatch(/isPaid['"]/);
      expect(mod.code).not.toMatch(/where\(\s*['"]isPaid['"]/);

      expectNeverDerivesEntitlement(mod.code);
    },
  );

  it.each(PROP_GATE_CONSUMERS)(
    '%s only forwards a prop isPaid into the pinned gates (M5)',
    (rel) => {
      const mod = FILES.find((f) => f.rel === rel)!;

      // It must not source entitlement itself — not from Firestore, not from
      // the store. Its only legitimate isPaid is the one handed down to it.
      expect(firestoreImports(mod.code)).toEqual([]);
      expect(mod.code).not.toMatch(/entitlementStore/);
      expect(mod.code).not.toMatch(/useEntitlement/);

      expectNeverDerivesEntitlement(mod.code);
    },
  );

  it.each(PROP_PITCH_CONSUMERS)(
    '%s reads isPaid ONLY as a handed-down prop, never as a source (M6)',
    (rel) => {
      const mod = FILES.find((f) => f.rel === rel)!;

      // Same containment as the gate consumers: not from Firestore, not from
      // the store — the only isPaid it can hold is the one handed down.
      expect(firestoreImports(mod.code)).toEqual([]);
      expect(mod.code).not.toMatch(/entitlementStore/);
      expect(mod.code).not.toMatch(/useEntitlement/);

      expectNeverDerivesEntitlement(mod.code);
    },
  );

  it('the mock RUN never branches on entitlement — only the results block may (M6)', () => {
    // The zero-nudge contract, structurally: strip MockPlayer of its
    // MockResults hand-off and no isPaid-driven branch may remain. The
    // player's permitted occurrences are the props type, the destructure,
    // and the forwarding prop — never a conditional.
    const player = FILES.find((f) => f.rel === 'components/MockPlayer.tsx')!.code;
    for (const line of player.match(/^.*isPaid.*$/gm) ?? []) {
      expect(line).not.toMatch(/isPaid\s*\?/);
      expect(line).not.toMatch(/if\s*\(.*isPaid/);
      expect(line).not.toMatch(/!isPaid/);
    }
    // The results block branches on it for exactly one thing: the pitch.
    const results = FILES.find((f) => f.rel === 'components/MockResults.tsx')!.code;
    expect(results).toMatch(/isPaid\s*\?/);
  });

  it('entitlement enters the component tree ONLY at a store-connected root (M5)', () => {
    // This is what makes PROP_GATE_CONSUMERS safe rather than a loophole. If any
    // file outside UI_CONSUMERS could pass isPaid={...} down, a player could be
    // handed `true` by something that never consulted the store — and would keep
    // it across a sign-out, because no reset reaches a hard-coded prop.
    //
    // M6 adds ONE forwarding passer: MockPlayer hands its received prop on to
    // MockResults. Forwarding preserves the invariant — the player can only
    // pass what the store-connected MockSurface gave it, and it is itself
    // pinned (PROP_PITCH_CONSUMERS) as unable to source or derive the value.
    const FORWARDING_PASSERS = ['components/MockPlayer.tsx'];
    const allowed = [...UI_CONSUMERS, ...FORWARDING_PASSERS];
    const passers = FILES.filter((f) => /isPaid=\{/.test(f.code)).map((f) => f.rel);
    expect(passers.sort()).toEqual(passers.filter((p) => allowed.includes(p)).sort());
    // A forwarding passer forwards the identifier it received — never a
    // literal: `isPaid={true}` anywhere is an immediate failure.
    for (const f of FILES) {
      expect(f.code, `${f.rel} hard-codes entitlement`).not.toMatch(/isPaid=\{\s*(true|false)\s*\}/);
    }
  });

  it.each(UI_CONSUMERS)(
    '%s takes entitlement ONLY from the store, never from Firestore (M5)',
    (rel) => {
      const mod = FILES.find((f) => f.rel === rel)!;

      // The single sanctioned route into a component.
      expect(mod.code).toMatch(/useEntitlement/);

      // A surface must never reach past the store to Firestore for entitlement,
      // nor accept it as a prop or route parameter — either would let paid
      // state travel a path the store cannot reset on sign-out or an account
      // switch, which is the cross-account bleed the epoch guard exists to stop.
      expect(firestoreImports(mod.code)).toEqual([]);
      expect(mod.code).not.toMatch(/isPaid\s*[?]?:\s*boolean/);

      expectNeverDerivesEntitlement(mod.code);
    },
  );

  it('the free-tier query keeps the isFree filter that enforces the paywall (M5)', () => {
    // Defense in depth, and the reason this lives beside the isPaid rules:
    // the deployed Firestore rules let an unpaid user read `questions` ONLY
    // because their query is provably restricted to isFree == true. Drop that
    // filter and the read is either denied outright or — for a paid user's
    // rule branch — becomes a paywall bypass. A regression here is silent in
    // the UI, so it is pinned in source.
    const delivery = FILES.find((f) => f.rel === 'lib/questionDelivery.ts')!;
    expect(delivery.code).toMatch(/where\(\s*['"]isFree['"]\s*,\s*['"]==['"]\s*,\s*true\s*\)/);
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

  it('the write site never names isPaid at all (M4-B1)', () => {
    // The strongest possible form of §0.9 for this module: not "isPaid is only
    // ever written as false" but "no code path here can name the field".
    const backend = FILES.find((f) => f.rel === WRITE_SITE)!.code;
    expect(backend.match(/isPaid/g)).toBeNull();
  });

  it('the only users-root write anywhere is the mock append, in the write site (M6)', () => {
    // M4-B1's conclusion stands: the web never CREATES the root document — a
    // client create must send `isPaid: false`, which §0.9 forbids, so creation
    // is server-side (the app repo's ensureUserDocument callable). What M6
    // adds, deliberately and narrowly, is the app's own mock-attempt UPDATE:
    // `mockHistory` arrayUnion + `freeMockConsumed: true`, merged — the exact
    // shape the deployed `mockHistoryUpdateIsValid()` rule polices. This test
    // pins that the write site holds exactly that one root write and nothing
    // else in src/ holds any.
    const rootWrite =
      /(setDoc|updateDoc|transaction\.set)\(\s*(doc\(\s*\w+\s*,\s*)?['"`]?users['"`]?\s*,\s*\w+\s*\)/;
    const offenders = FILES.filter((f) => f.rel !== WRITE_SITE && rootWrite.test(f.code)).map(
      (f) => f.rel,
    );
    expect(offenders).toEqual([]);

    const backend = FILES.find((f) => f.rel === WRITE_SITE)!.code;
    // The one root write present is the mock append, with exactly the two
    // rule-policed fields and merge semantics.
    expect(backend).toMatch(
      /setDoc\(\s*doc\(db,\s*'users',\s*uid\),\s*\{\s*mockHistory:\s*arrayUnion\(record\),\s*freeMockConsumed:\s*true\s*\},\s*\{\s*merge:\s*true\s*\},?\s*\)/,
    );
    // And nothing anywhere runs a transaction on the users root.
    const txns = FILES.filter((f) => /runTransaction/.test(f.code)).map((f) => f.rel);
    expect(txns).toEqual([]);
  });
});
