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

---

## 8. M2-r remediation log

Addresses the three M2 initial-review BLOCKERs (`b34f341`, verdict REJECT) per
Anusha's decisions of 2026-07-15.

**Additional changed files in M2-r** (beyond §1):
- `docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md` — dated scope amendment under M2
  and M3 (B1).
- `test/canvasBackground.test.ts` — canvas-never-white regression (B3).
- `docs/review-packets/M2_PACKET.md` — this remediation log.
This section supersedes §5's build caveat.

### M2-B1 — client-product wiring absent → RESOLVED by scope re-sequence (Anusha, 2026-07-15)
The live `/app` render sites for the M2 machinery are **re-sequenced to M3**,
recorded as a dated scope amendment in the manual under both M2 and M3. Rationale:
those render sites require auth (M3) and question/flashcard data (M3+), and
building them now would force question-shaped text into the static export,
violating §0.6 ("zero questions in the export, ever"). M2's delivered scope is the
machinery — `<PremiumNudge>`, `<UpgradeWall>`, `src/lib/nudgeGates.ts` + app-parity
fixtures, screenshots. The render-site wiring (practice Q11, exam pre-start,
flashcard 15/30/45, the free-user Q21+ deep-link → wall unbypassable, mock-results
pitch) and its tests are now **M3 acceptance items** — the M2 forward-obligations
(§6) already scoped them there. No code change; the decision layer + components are
ready for M3 to consume verbatim.

### M2-B2 — full `npm run build` not reproduced → RESOLVED with credentialed build
Run from the final M2-r tree with the Firestore service-account key at the export
script's default path (`../ARNReady-App/scripts/serviceAccountKey.json`; the
build's prebuild is plain `node` and reads that key file directly, not
`.env.local`). Full lifecycle green — live Firestore pull, both leak gates, and
the 195-page static export:

```
$ npm run build
> prebuild → export-content
Exported 240 free questions across 12 chapters, 732 flashcards, paid manifest:
21458 content-scope + 21772 public-scope field-level text fingerprints …
> prebuild → check-paid-leak
Paid-content leak gate PASSED — 1927 artefact(s) scanned … zero questions and an
exact canonical flashcard sampler confirmed in the public export.
> next build
✓ Compiled successfully in 1979ms
✓ Generating static pages using 9 workers (195/195) in 545ms
> postbuild → check-paid-leak
Paid-content leak gate PASSED — 1927 artefact(s) scanned … zero questions and an
exact canonical flashcard sampler confirmed in the public export.
```
This supersedes §5 (which noted the build could not run in the original session).

### M2-B3 — cards use `bg-white` → engaged on merit; rule pinned correctly, components unchanged (Anusha, 2026-07-15)
`bg-white` is a **theme token** (`white: '#FFFFFF'` in `src/styles/tokens.ts`; the
raw-hex guard passes) and is the card-surface pattern used by **every signed-off
M0/M1 card**: `src/components/ContentCard.tsx:16`,
`src/components/FlashcardSampler.tsx:17`, the chapter hub/spoke, pricing, faq,
homepage, syllabus — all `rounded-card bg-white shadow-card`, all Codex-approved in
M0/M1. The design document §4.1 states explicitly: "White is allowed for cards and
contained surfaces, not as the page canvas." The manual §0.7 "never white" governs
the page **canvas**, which is `#F5F5F0` via `src/app/globals.css`
(`body { @apply bg-bg … }`). `<PremiumNudge>` and `<UpgradeWall>` match this
sanctioned pattern exactly; changing only them would make them the *only* non-white
cards in the product — a visual regression, not a fix.

The underlying concern (a white page canvas) is legitimate and is now pinned by
`test/canvasBackground.test.ts`: the canvas `bg` token is distinct from white, and
neither `globals.css` nor the root layout `<body>` paints the canvas white. If
Codex maintains that white *cards* violate the manual, that is a product-wide
question touching all M0/M1 cards and is Anusha's to adjudicate — not a unilateral
M2-only change.

### Gates after M2-r (non-build)
```
$ npm run typecheck   → clean
$ npm run lint        → clean (eslint 0 warnings; raw-hex guard PASSED)
$ npm test            → 996 passed (25→26 files; +3 canvasBackground)
```
Full `npm run build` + leak gate: see M2-B2 above.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
