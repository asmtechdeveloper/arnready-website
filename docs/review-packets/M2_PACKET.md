# M2 Evidence Packet — Nudge + gate decision layer + wall

**Milestone:** M2 (manual §2 M2, review protocol §4 M2).
**Branch:** `web-product`. **Executor:** Opus orchestrating Sonnet sub-agents,
one atomic step (S1–S7) per the approved plan
`docs/ARNREADY_WEBSITE_M2_EXECUTION_PLAN.md`, with an Opus diff+gate review
between every step. **Prepared:** 15 Jul 2026.

---

## 1. Scope

M2 delivers the freemium **nudge/gate machinery** — pure decision layer,
`<PremiumNudge>`, `<UpgradeWall>`, and fixtures — NOT wired-up players. There are
no `/app/*` product routes in the repo (auth is M3, question delivery M3+,
progress writes M4, and §0.5 + the leak gate forbid question text in the export),
so M2 cannot make "nudges live in real players." This bounding is the plan's §1
scope reframe. What ships:

- A pure decision layer (`src/lib/nudgeGates.ts`): the practice gate ported from
  the app's `gateBeforeQuestion` (ad→nudge mapping), the synthesized flashcard and
  exam gates, the Q21+ wall predicate, and a distinct-reveal counter. Deterministic,
  total (no input throws), fully unit-tested against a committed golden.
- `<PremiumNudge>` (three variants: practice / exam / flashcard) and `<UpgradeWall>`,
  WORKING copy per the nudge law, one-tap continue, dual CTA.
- Fixture + wiring tests pinning the decisions to app values and the no-nudge
  invariants provable without players.
- Screenshots of all nudge points + the wall at 375px and 1440px.

**Full changed-file list (the M2 commit):**

_Modified:_
- `src/lib/copy.ts` — appended `nudge` + `upgradeWall` WORKING copy (plan §3).
- `vitest.config.ts` — `server.fs.allow: ['..']` (declared deviation, see §4/D7).

_New — decision layer, components, fixtures, tests:_
- `src/lib/nudgeGates.ts`
- `src/components/PremiumNudge.tsx`
- `src/components/UpgradeWall.tsx`
- `scripts/gen-nudge-golden.mjs`
- `test/fixtures/nudgeGates.golden.json`
- `test/nudgeGates.test.ts`
- `test/nudgeInvariants.test.ts`
- `test/premiumNudge.test.tsx`
- `test/upgradeWall.test.tsx`

_New — docs/evidence:_
- `docs/ARNREADY_WEBSITE_M2_EXECUTION_PLAN.md` (the decision-free execution plan)
- `docs/review-packets/M2_PACKET.md` (this file)
- `docs/review-packets/screenshots/M2/nudge-surfaces-1440.png`
- `docs/review-packets/screenshots/M2/nudge-surfaces-375.png`

_Tooling (committed separately, NOT part of the M2 product diff):_
- `.claude/agents/m2-executor.md` — reusable guardrailed Sonnet executor.
- `.claude/settings.local.json` (gitignored) — hardened review-log write-denial.

---

## 2. Gate outputs (final tree)

```
$ npm run typecheck
> tsc --noEmit
(clean — no errors)

$ npm run lint
> eslint . --max-warnings=0 && node scripts/check-no-raw-hex.mjs
Raw-hex guard PASSED — no hex colour literals outside src/styles/tokens.ts.
(eslint: 0 errors, 0 warnings)

$ npm test
 Test Files  25 passed (25)
      Tests  993 passed (993)

$ npx next build        # see §4 build caveat
├ ● /chapters/[chapter]            (12 paths)
├ ● /chapters/[chapter]/[subtopic] (169 paths)
├ ○ /  /about /faq /pricing /privacy /syllabus /support /delete-account
      /nism-series-v-a /robots.txt /sitemap.xml
   (all routes prerendered; NO /nudge-preview route — harness removed)

$ node scripts/check-paid-leak.mjs
Paid-content leak gate PASSED — 1927 artefact(s) scanned against 4596 paid ids
+ 21458 content-scope/21772 public-scope text fingerprints; exported question
files structurally free-only; zero questions and an exact canonical flashcard
sampler confirmed in the public export.
(exit 0)
```

Test-count provenance: 177 pre-M2 baseline + 632 (`nudgeGates.test.ts`, one
`it()` per golden row + simulations + totality) + 164 (`nudgeInvariants.test.ts`)
+ 11 (`premiumNudge.test.tsx`) + 9 (`upgradeWall.test.tsx`) = 993.

---

## 3. Screenshots

`docs/review-packets/screenshots/M2/nudge-surfaces-1440.png` and
`…-375.png` — full-page captures of every surface at both widths: practice nudge,
exam pre-start nudge, flashcard nudge variants 1/2/3 (15/30/45), and the Q21+
upgrade wall. Captured from `next dev` via a temporary preview route
(`src/app/nudge-preview/page.tsx`) fed synthetic placeholder props; the route was
deleted before this commit and is confirmed absent from the tree and the export
(see §4/D6).

---

## 4. Deviations (Codex verifies)

- **Scope reframe (plan §1):** M2 is machinery, not wired players. The manual's
  "nudges live in `/app` practice/exam/flashcards" cannot be satisfied pre-auth;
  the render-side halves are forward obligations in §6.
- **D4 — flashcard gate is SYNTHESIZED, not ported.** No atomic app function
  exists (the app smears the reveal gate across `FlashcardScreen`); only the
  constants are canonical (`FLASHCARD_GATE_EVERY=15`, `FLASHCARD_GATE_MAX=3`,
  adgate-logic.md:89). `flashcardNudgeAfterReveal` implements the manual-§1 rule
  (15/30/45, max 3, **run-scoped** — the app's per-subtopic reset intentionally
  does not port). Pinned by fixtures.
- **D7 — gate-parity oracle + one config change.** Practice gate pinned by the
  committed exhaustive `test/fixtures/nudgeGates.golden.json` (generated by
  `scripts/gen-nudge-golden.mjs`, which re-states `gateBeforeQuestion`'s logic with
  a verbatim `quizEngine.ts:100-108` quote + citation). The golden test is **never
  skipped**. An additional live cross-repo parity test imports the real app
  function and is `skipIf(appRepoAbsent)`-guarded with a loud warn (additive, not a
  replacement). `vitest.config.ts` gained `server.fs.allow: ['..']` so that live
  import can cross the sibling-repo boundary — the one permitted config change.
- **D6 — temporary preview harness.** `src/app/nudge-preview/page.tsx` existed only
  to capture §3 screenshots from `next dev`; deleted before commit; confirmed absent
  from `git status`, the source tree, and the static export.
- **Two orchestrator review-fixes to `test/nudgeInvariants.test.ts` (S5).** The S5
  sub-agent was interrupted (session limit) before running its gates; Opus's review
  caught two defects it never ran and fixed them minimally: (1) the single-write-site
  guard regex omitted the wall predicate (`WallBefore` didn't match) — broadened to
  `/(Nudge|Gate|Wall)Before|NudgeAfterReveal/`; (2) `match[1]` is `string | undefined`
  under `noUncheckedIndexedAccess` — added an `undefined` guard. Both are test-guard
  corrections, not implementation changes.

**No other deviations.** No new npm dependency; no `firestore.rules` change; no
app-repo `functions/` change; no scoring/gate constant change; no deploy; `main`
untouched.

---

## 5. Build caveat (one gate not run in this session)

`npm run build` runs a `prebuild` hook (`export-content` → Firestore) that needs
credentials absent from this session (no `.env.local`). M2 touches **no** content
pipeline, route generation, or Firestore code, so instead of the Firestore
re-export this session ran **`npx next build`** against the existing M1-exported
`content/` (all 181 content routes + standard pages prerendered successfully) and
then the standalone `node scripts/check-paid-leak.mjs` against the fresh `out/`
(PASSED). Recommendation: Anusha (or a creds-bearing session) runs the full
`npm run build` before Codex sign-off; it is expected green because nothing M2
changed feeds the export.

---

## 6. Known limitations / forward obligations (not built at M2)

1. **M3/M5 exam player:** call `examNudgeBeforeStart` once before Q1 (bound to the
   drawn set); consult NO gate mid-run. (M2 proved the decision-layer half: no exam
   mid-run gate function exists.)
2. **M5 mock + mistakes screens:** carry the runtime wiring test asserting NO
   `<PremiumNudge>` renders on the mock run or mistakes deck. (M2 proved the
   decision-layer half: no mock/mistakes gate exists — `nudgeInvariants.test.ts`.)
3. **M5 practice/exam/flashcard players:** feed the gates their run state
   (`nudgesShownThisRun`, `gatesShownThisRun`, the distinct-reveal set) and render
   `<PremiumNudge>` / `<UpgradeWall>` at the returned decision. Client-side
   unbypassability of the Q21+ wall (deep-link to Q21 → wall) is enforced where the
   player reads the route.
4. **M6:** the nudge/wall WORKING copy gets Anusha's voice pass + E-1/E-2 review.
5. `PremiumNudge` is a shared component that adopts its importer's environment; the
   future players are client components, so it renders fine. If a server component
   ever needs it, add `'use client'`.

---

## 7. Fixture-milestone evidence (protocol §2.6)

- **Fixture file:** `test/fixtures/nudgeGates.golden.json` — 156 practice + 52 wall
  + 4 exam + 408 flashcard rows.
- **App-side provenance:** practice rows encode `gateBeforeQuestion`
  (`../ARNReady-App/services/quizEngine.ts:100-108`, quoted verbatim in
  `nudgeGates.ts` and `gen-nudge-golden.mjs`); flashcard/exam/wall rows encode the
  manual-§1 rules (no single app function exists — D4).
- **Web-side output:** `test/nudgeGates.test.ts` asserts every function equals every
  golden row (632 cases) + the flashcard 15/30/45×max-3 run simulation + the
  practice once-at-Q11 simulation + totality; the optional live cross-repo parity
  test passed locally (app repo present). All green (§2).

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
