# M5 Execution Plan — Signed-in study surfaces

**Status:** orchestrator plan, 20 Jul 2026. Subordinate to
`docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md` (canon). This file exists so every
executor step is DECISION-FREE: each decision below is either pinned by the
manual, ported from the app repo with a line citation, or recorded as an
Anusha decision with its date. An executor that hits a question this file does
not answer STOPS and reports — it never chooses.

**Milestone tag:** [STANDARD] → the orchestrator decomposes and reviews; executor
subagents build one atomic step each, diff-reviewed with §0.11 gates re-run
before the next is released.

**Inherited obligation:** `M2-B1` (DEFERRED, review log) lands here — the M2
machinery must be consumed VERBATIM at real render sites. The mock-results
premium pitch stays in M6.

---

## 1. Anusha decisions for this milestone (2026-07-20)

| id | Decision |
|---|---|
| A1 | **Paid path is in M5's scope.** No other milestone owns it: M5 is the only one naming `orderPracticeSet` / `drawExamSet` / `capFreeQuestionSet` (manual:288), M6 owns `mockService.js`, M8 owns the isPaid WRITE chain. The paid branches live inside the three ported functions, so excluding them would ship untested dead code with no later owner. M5 READS `isPaid` via the M3 entitlement store only. |
| A2 | **Route shape is the orchestrator's call, with one hard constraint from Anusha: a free user must never be able to select a question they are not entitled to see.** See D1/D7. |
| A3 | **A minimal results screen ships in M5** so a run can be verified end to end, and it records through the M4 service. Richer progress surfaces remain M6. |
| A4 | **A test-only sign-in hook is authorized** for capturing the authenticated screenshots. See D13. |
| A5 | **`anushamurthy@gmail.com` (uid `jyJS3YL39cUpQwSiyyTlhjBePV32`) may be flipped to `isPaid: true`** for paid-path evidence. ANUSHA performs the flip in the Firebase console; no agent writes that field (§0.9). Reverted after the evidence pass. |
| A6 | **`arnready-dev` only.** Never `arnready`. All M4 test-account grants carry over: uid `FKmOTJdC2sTjoqQHM811cR515vz1` (`arnreadytest@gmail.com`) may receive real session/progress/mistakes writes. |

## 2. Verified preconditions (checked by the orchestrator, 2026-07-20)

- **No new dependency required** — §0.10 not triggered. React state + installed
  `firebase` + existing vitest/testing-library cover M5.
- **No `firestore.rules` change required.** Deployed rules already grant:
  signed-in read of `questions` where `isFree == true`; full-bank read where
  `exists(users/{uid}) && isPaid == true`; `flashcards` read to any signed-in
  user. A rules diff in this milestone is an automatic BLOCKER.
- **No Firebase console index step required.** All four queries M5 issues were
  run read-only against `arnready-dev` and returned without a missing-index
  error: `chapter+isSeed+isFree` → 20 (ch07), `chapter+isSeed` → 75,
  `chapter` → 424, `flashcards chapter` → 15.
- **`.env.local` is already complete** for dev; no secrets needed.
- **`scripts/lib/canonicalDeck.mjs` is browser-safe** (its only import is
  `src/lib/flashcardOrder.json`), so `buildCanonicalDeck` is reusable at
  runtime for the flashcard player.
- **Node imports the app's real `quizEngine.ts` directly** (native type
  stripping, verified). M5 fixtures are therefore GENERATED FROM the app
  service, not re-stated by citation.

## 3. Pinned decisions (D1–D14)

### D1 — Routes and parameters
Three new routes, all static-exportable, all signed-in-only:

- `/app/practice?chapter=<1-12>&q=<1-based>` (`q` defaults to 1)
- `/app/exam?chapter=<1-12>`
- `/app/flashcards?chapter=<1-12>`

Parameters are read client-side (`useSearchParams`, inside a `Suspense`
boundary as the App Router requires under `output: 'export'`). Path segments
were rejected: `generateStaticParams` would bake a route per chapter for
surfaces that are already client-rendered behind auth, for no gain.

A missing or non-integer `chapter` outside 1–12 renders the `/app` launcher's
"pick a chapter" state rather than throwing or guessing a chapter.

### D2 — `/app` launcher
The signed-in `/app` state gains a chapter × mode launcher (12 chapters ×
practice / exam / flashcards). No progress, resume, or Prepometer data — those
are M6. The existing unconfigured / loading / signed-out states of
`AppShell.tsx` are preserved exactly as M3 shipped them.

### D3 — Question and flashcard delivery (`src/lib/questionDelivery.ts`)
Browser-only, signed-in-only, and it NEVER imports `content/questions/*` or
`content/flashcards/*` — the build-time export must not reach a client bundle
(§0.5, §0.6). Queries ported verbatim from
`../ARNReady-App/screens/QuizScreen.js`:

| surface | tier | query | post-processing |
|---|---|---|---|
| practice | free | `chapter == N, isSeed == true, isFree == true` | `capFreeQuestionSet(docs, FREE_QUESTIONS_PER_CHAPTER)` → `orderPracticeSet(_, {isPaid:false})` |
| practice | paid | `chapter == N, isSeed == true` | `orderPracticeSet(docs, {isPaid:true})` |
| exam | free | `chapter == N, isSeed == true, isFree == true` | `capFreeQuestionSet(docs, 20)` → `drawExamSet(_, {isPaid:false, examSize:30})` |
| exam | paid | `chapter == N` | `drawExamSet(docs, {isPaid:true, examSize:30})` |
| flashcards | both | `flashcards where chapter == N` | `buildCanonicalDeck(rawDocs, N)` |

A failed read is an ERROR state, never an empty set — ported from
`QuizScreen.js`'s `loadFailed` policy. Signed-out access to these routes
renders the sign-in prompt, never a partial player.

### D4 — Engine port (`src/lib/quizEngine.ts`)
Verbatim port of `../ARNReady-App/services/quizEngine.ts`: `shuffle`,
`capFreeQuestionSet`, `orderPracticeSet`, `drawExamSet`, `computeExamScorePct`,
`computePracticePct`. Never re-derived; if a formula looks wrong it is raised
with Anusha, not fixed (§0.3).

**No constant is redefined.** `FREE_SCORE_FLOOR` is imported from
`src/lib/progressService.ts` (M4) and `FREE_QUESTIONS_PER_CHAPTER` from
`src/lib/nudgeGates.ts` (M2). M5 edits neither file — re-homing a scoring
constant would touch §0.10 territory for no benefit, and a second definition
is exactly what the parity discipline exists to prevent.

`gateBeforeQuestion` is deliberately NOT ported here: `src/lib/nudgeGates.ts`
already owns that mapping (M2 D1). A second gate definition anywhere in `src/`
is a BLOCKER by the protocol's own M5 checklist.

### D5 — Fixture provenance
`scripts/gen-quizengine-golden.mjs` imports the APP's real
`../ARNReady-App/services/quizEngine.ts` and writes
`test/fixtures/quizEngine.golden.json` — inputs, seeded rng, and the app's own
outputs. `test/quizEnginePort.test.ts` replays those fixtures through the WEB
port and asserts equality. The golden test is **never skipped** and needs no
app repo present in CI (M1-B10's lesson). An additional live cross-repo test
may import the app module directly, `skipIf`-guarded, strictly additive.

Rng is injected and deterministic in every fixture — no `Math.random` reaches a
fixture.

### D6 — Gate consumption
Render sites import from `src/lib/nudgeGates.ts` and use `<PremiumNudge>` /
`<UpgradeWall>` unchanged. No gate arithmetic (no `=== 10`, no `>= 20`, no
`% 15`) appears in any player. A test greps `src/` for a second gate
definition.

### D7 — Practice player
Run state: the ordered question array, current 0-based index, per-question
pick, correct count, `nudgesShownThisRun`.

- Before rendering index `i`: `practiceWallBeforeQuestion(i, {isPaid})` →
  `'wall'` renders `<UpgradeWall returnTo={{chapter}}/>`, checked BEFORE the
  nudge and before any question text is put on screen.
- Then `practiceNudgeBeforeQuestion(i, {isPaid, nudgesShownThisRun})` →
  `'nudge'` renders `<PremiumNudge variant="practice">`; continuing increments
  `nudgesShownThisRun` so it can never fire twice in a run.
- **A1/A2 constraint:** the free question array is already capped at 20 by
  `capFreeQuestionSet`, and no control (Next, palette, or link) ever offers a
  free user an index ≥ the cap. The `?q=` deep link is the ONLY route to a
  higher index, and it renders the wall. Entitlement is enforced by the data
  (the question was never fetched) as well as by the wall.

### D8 — Exam player
One pre-start nudge via `examNudgeBeforeStart({isPaid, nudgeShown})`. Once the
exam starts, NO gate function is called at any point — structurally guaranteed
by `nudgeGates.ts` exporting no exam per-question gate (M2 D3). Untimed, as the
app's chapter exam is. `examScope` is captured immutably when the set is drawn
(`'sample'` free, `'full'` paid), per the app and M4's contract.

### D9 — Flashcard player
Canonical deck order only. The app's shuffle-from-landing and mid-run reorder
(`flashcardRun.js`) are NOT ported — the manual asks only for "ALL cards" plus
distinct-reveal tracking, and porting the reorder machinery is unrequested
scope (orchestrator default, stated to Anusha 2026-07-20).

Distinct reveals are tracked as a `Set` of stable `cardId`s and reduced by
`countDistinctReveals`. A revisit never double-counts. After a reveal,
`flashcardNudgeAfterReveal(distinct, {isPaid, gatesShownThisRun})` decides;
`rotation = gatesShownThisRun` selects the 15/30/45 copy variant, so the same
nudge never fires twice. The nudge never interrupts a reveal or a grade.

### D10 — Results screens (A3)
Minimal, one per mode. Exam uses `computeExamScorePct`, practice uses
`computePracticePct`, flashcards report the self-graded "knew" count. Free and
paid denominators are NEVER shown on one surface (§1, LOCKED).

Recording goes through the M4 service and nothing else:
`recordPracticeSession`, `recordExamSession`, `recordFlashcardSession`.
`test/singleWriteSite.test.ts` already pins that no other module writes these
collections; M5 must keep it green.

### D11 — Copy
Every new user-facing string goes in `src/lib/copy.ts`, marked WORKING. No
string literal in a player or results component. Nudge copy is reused from M2's
`copy.nudge` unchanged.

### D12 — Leak discipline
Zero question text in `out/`. The leak gate stays green with no weakening of
`scripts/check-paid-leak.mjs` (the protocol diffs the script). A test asserts
no module reachable from a page imports `content/questions`.

### D13 — Test-only sign-in hook (A4)
`src/lib/firebaseClient.ts` exposes the auth handle and
`signInWithCustomToken` on `window.__arnreadyDevAuth` **only when
`process.env.NODE_ENV !== 'production'`**, so it is dead-code-eliminated from
the static export. Screenshots are captured against `next dev`; the token is
minted locally from the dev service-account key, exactly as
`test/m4LiveSession.test.ts` already does. No password is ever handled.

A test asserts the production build (`out/`) contains no occurrence of
`__arnreadyDevAuth`. This is a DECLARED DEVIATION and is recorded in the
packet.

### D14 — Forbidden in M5
Writing progress/sessions/mistakes by any path other than the M4 service; any
question text in the static export; re-deriving gate logic; any
`firestore.rules` diff; any change to scoring or gate constants; the mock,
mistakes, or progress surfaces (M6); any new dependency.

## 4. Atomic steps

Each step is one executor invocation, one diff review, one §0.11 gate run.

| step | scope |
|---|---|
| S1 | `src/lib/quizEngine.ts` port (D4) + `scripts/gen-quizengine-golden.mjs` + `test/fixtures/quizEngine.golden.json` + `test/quizEnginePort.test.ts` (D5). No UI. |
| S2 | `src/lib/questionDelivery.ts` (D3) + unit tests with a faked Firestore layer. No UI. |
| S3 | Routes, `/app` launcher, and the shared player chrome (D1, D2, D11). No gate wiring yet. |
| S4 | Practice player + wall + Q11 nudge (D7). |
| S5 | Exam player + pre-start nudge (D8). |
| S6 | Flashcard player + 15/30/45 nudges (D9). |
| S7 | Results screens + M4 recording (D10). |
| S8 | Wiring/invariant tests (D6, D12): zero nudges for paid, no nudge twice per run, no second gate definition, no `content/questions` import, no dev hook in `out/`. |
| S9 | Test-only sign-in hook (D13), live evidence, screenshots at 375px and 1440px, packet. |

## 5. Stop conditions for executors

Stop and report to the orchestrator — never decide — on: any urge to edit
`firestore.rules`, `scripts/check-paid-leak.mjs`, `src/lib/nudgeGates.ts`,
`src/lib/progressService.ts`, `src/lib/mistakesService.ts`, or
`src/lib/progressBackend.ts`; any new dependency; any formula that looks wrong;
any question this plan does not answer.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
