# M5 evidence packet — Signed-in study surfaces: practice, exam, flashcards

**Milestone:** M5 [STANDARD] (execution manual §2). Inherits the DEFERRED
`M2-B1` obligation (review log): the M2 nudge/wall machinery is consumed
verbatim at real render sites here; the mock-results pitch remains M6.

**Commit:** `0022eed` — `M5: signed-in study surfaces — practice, exam, flashcards`, on `web-product`.

**Orchestration:** decomposed into nine atomic steps (S1–S9) per
`docs/ARNREADY_WEBSITE_M5_EXECUTION_PLAN.md`. S1–S6 and S8 were built by
executor subagents, one reviewed diff at a time; S7 (the write-wiring core) and
S9 (auth-adjacent dev hook + live evidence) were executed by the orchestrator
itself. Every step re-ran the §0.11 gates before the next was released, and
each security/parity-critical guard was mutation-verified (a deliberate defect
injected, the guard observed to fail, the file restored byte-identical).

---

## 1. Scope

M5 makes `/app` do something behind sign-in for the first time. It delivers the
§1 signed-in free-tier rhythm on real surfaces:

- a signed-in-only **runtime delivery layer** that fetches the free-20 / full
  bank / flashcard deck from Firestore and never writes question text into the
  static export;
- a verbatim **port of the app's `quizEngine`** draw/ordering/scoring, pinned by
  fixtures generated FROM the app service;
- three **routes + players** — `/app/practice`, `/app/exam`, `/app/flashcards` —
  plus a chapter×mode launcher on `/app`;
- the M2 **nudge/wall machinery wired at real render sites** (practice Q11 nudge,
  exam pre-start nudge, flashcard 15/30/45 nudges, the free Q21+ wall), consumed
  verbatim from `src/lib/nudgeGates.ts`;
- **minimal per-mode results screens** that record once through the M4 service;
- a **dev-only test sign-in hook** dead-code-eliminated from the production build.

### Changed files (36) — all `web-product`, all inside M5's allowed area

**New source**
- `src/lib/quizEngine.ts` — engine port (S1)
- `src/lib/questionDelivery.ts` — runtime delivery (S2)
- `src/lib/useRecordOnce.ts` — record-once latch (S7)
- `src/app/app/practice/page.tsx`, `src/app/app/exam/page.tsx`, `src/app/app/flashcards/page.tsx` — routes (S3)
- `src/components/StudySurface.tsx`, `src/components/StudySurfaceFallback.tsx`, `src/components/ChapterModeLauncher.tsx` — surface chrome + launcher (S3)
- `src/components/PracticeSurface.tsx`, `src/components/ExamSurface.tsx`, `src/components/FlashcardsSurface.tsx` — per-mode surfaces (S3/S5/S6)
- `src/components/PracticePlayer.tsx`, `src/components/ExamPlayer.tsx`, `src/components/FlashcardPlayer.tsx` — the three players (S4/S5/S6)
- `src/components/ResultsCard.tsx` — shared results surface (S7)
- `scripts/gen-quizengine-golden.mjs`, `scripts/lib/seededRng.mjs`, `scripts/lib/seededRng.d.mts` — fixture generator + shared seeded rng (S1)

**Modified source**
- `src/components/AppShell.tsx` — signed-in state now renders the launcher (S3)
- `src/components/AuthProvider.tsx` — installs the dev-only sign-in hook (S9)
- `src/lib/firebaseClient.ts` — `installDevAuthHook` (S9, D13)
- `src/lib/copy.ts` — `studyLauncher`, `studySurface`, `practicePlayer`, `examPlayer`, `flashcardPlayer`, `results` (all WORKING)

**Tests**
- New: `quizEnginePort.test.ts`, `questionDelivery.test.ts`, `studySurfaces.test.tsx`, `practicePlayer.test.tsx`, `examPlayer.test.tsx`, `flashcardPlayer.test.tsx`, `resultsRecording.test.tsx`, `useRecordOnce.test.tsx`, `studyLeakAndNudgeInvariants.test.tsx`, `devAuthHookAbsent.test.ts`, `test/fixtures/quizEngine.golden.json`
- Modified: `test/isPaidDiscipline.test.ts` (see §5), `test/examPlayer.test.tsx` / `test/flashcardPlayer.test.tsx` (added the required `chapter` prop to render calls in S7)

**Docs**
- `docs/ARNREADY_WEBSITE_M5_EXECUTION_PLAN.md` — the orchestrator plan

No `firestore.rules` diff. Nothing in the app repo's `functions/`. No new npm
dependency. No change to any scoring or gate constant.

---

## 2. Gate outputs (final commit `0022eed`)

### `npm run lint`
```
> eslint . --max-warnings=0 && node scripts/check-no-raw-hex.mjs
Raw-hex guard PASSED — no hex colour literals outside src/styles/tokens.ts.
```
(0 errors, 0 warnings.)

### `npm run typecheck`
```
> tsc --noEmit
```
(clean, no diagnostics.)

### `npm test`
```
 Test Files  46 passed (46)
      Tests  1299 passed | 5 skipped (1304)
```
Baseline before M5 was 36 files / 1136 passed. The 5 skips are pre-existing
credential-gated live tests (`m4LiveSession`, the cross-repo blocks) — never
core coverage.

### `npm run build` (prebuild live export → build → postbuild leak gate)
Static export succeeds; the three new routes are present and static:
```
├ ○ /app/exam
├ ○ /app/flashcards
├ ○ /app/practice
```

### `node scripts/check-paid-leak.mjs`
```
Paid-content leak gate PASSED — 1968 artefact(s) scanned against 4596 paid ids
+ 21451 content-scope/21765 public-scope text fingerprints; exported question
files structurally free-only; zero questions and an exact canonical flashcard
sampler confirmed in the public export.
```
The script itself is unchanged from M1 (diff it — not weakened). Artefact count
rose 1937 → 1968 with the three new routes; still zero question text in `out/`.

---

## 3. Engine parity — the fixtures (review protocol §2.6 and §4 M5)

### Provenance: generated FROM the app service, not hand-written
`scripts/gen-quizengine-golden.mjs` `import()`s the app's real
`../ARNReady-App/services/quizEngine.ts` and calls its actual exported functions
to produce every `expected` value in `test/fixtures/quizEngine.golden.json`
(19 cases). Node's native TypeScript type-stripping loads the app module
directly — verified working. Nothing is re-stated by citation as M2's
`nudgeGates` golden had to be; this is genuine cross-repo provenance, which the
M4 lesson requires.

The seeded rng lives in `scripts/lib/seededRng.mjs` and is imported by BOTH the
generator and `test/quizEnginePort.test.ts` — a fixture whose two sides each
carried their own copy of the random source would pin nothing.

### The 19 cases
`capFreeQuestionSet` (limit ≤ 0, limit > length, mixed/missing ids for the
numeric localeCompare); `orderPracticeSet` free (difficulty sort incl.
missing/unknown difficulty) and paid (seeded shuffle); `drawExamSet` free
(seeded whole-set shuffle) and paid (one-per-seedId, capped at
min(examSize, seedGroups), incl. a narrow-chapter case); `computeExamScorePct`
across paid/free × below/at/above the floor of 10 and zero-denominator;
`computePracticePct` incl. attempted = 0.

### The port is verbatim
Mechanical diff of all eight ported functions against the app source (comments
stripped): six byte-identical; `shuffle` and `onePerSeedGroup` differ ONLY by
`as T` / `as Question` assertions this repo's `noUncheckedIndexedAccess`
requires. `DIFFICULTY_ORDER` identical. No scoring or gate constant is
redefined: `FREE_SCORE_FLOOR` is imported from `progressService` (M4),
`FREE_QUESTIONS_PER_CHAPTER` from `nudgeGates` (M2).

### The parity suite has teeth (mutation-verified)
Three defects injected into `quizEngine.ts` — free floor `max`→`min`,
difficulty order reversed, exam cap off-by-one — each failed the golden suite
(3/2/3 failures); file restored byte-identical.

### `gateBeforeQuestion` deliberately NOT ported into quizEngine.ts
It is already owned by `src/lib/nudgeGates.ts` (M2). `nudgeInvariants.test.ts`'s
D10c source scan confirms no second gate-like function is declared anywhere in
`src/`, including the new players.

---

## 4. Live evidence on the real surfaces (manual M5 acceptance)

Run against **`arnready-dev`** via `next dev`, signed in as the throwaway test
account `arnreadytest@gmail.com` (uid `FKmOTJdC2sTjoqQHM811cR515vz1`) with a
custom token MINTED LOCALLY from the dev service-account key (the
`test/m4LiveSession.test.ts` mechanism — no password handled), injected through
the dev-only `window.__arnreadyDevAuth` hook (D13). Anusha authorized the
test-only sign-in (2026-07-20). The account received NO writes: no run was
completed, so no session/progress/mistakes document was written; sign-in itself
creates no `users/{uid}` doc (M3/M4 discipline). `arnready-dev` is unchanged.

Each surface was rendered live with real Firestore free-tier data and captured
at **1440px and 375px**. Screenshots were taken in-session (visible to Anusha in
the orchestration transcript); their page-text is transcribed below as durable
evidence, matching the M3 precedent where some captures were Anusha's.

| Surface | URL (chapter 1) | Rendered (verbatim page text) |
|---|---|---|
| **Practice Q11 nudge** | `/app/practice?chapter=1&q=11` | "You're flying through these." → premium-ADDS copy → **Keep practising** → Get the app / Web checkout — coming soon |
| **Q21 wall** (deep-link, unbypassable) | `/app/practice?chapter=1&q=21` | "That's all 20 free questions for this chapter." → premium copy → **See premium** / Back to the chapter. **No question content in the DOM.** |
| **Exam pre-start nudge** | `/app/exam?chapter=1` | "One honest run, coming up." → "…won't interrupt you once it starts…" → **Start the exam** → dual CTA |
| **Flashcard 15-reveal nudge** | `/app/flashcards?chapter=1` (drove 15 distinct reveal+grade cycles) | "Fifteen cards deep." (rotation-0 variant) → flashcards-stay-free copy → **Keep flipping** → dual CTA |

Every surface showed the signed-in header, exactly one Arnie, one primary
action, the dual CTA / single CTA per surface, and the footer independence
disclaimer. Copy honours the nudge law throughout — each string pitches what
premium ADDS, never relief from the nudge. The Q21 wall's page text contained no
question text (checked via `get_page_text`), corroborating the static leak gate
at runtime.

**Note (not a defect):** Arnie images lazy-load via `next/image`; two captures
taken immediately after navigation caught the image mid-paint (a thin
transparent strip). A 1.5s wait and re-capture rendered the full panda — layout,
copy, and CTA were correct throughout. Flagged so a reviewer re-driving the
surfaces expects the same load timing.

**Paid users:** the "zero nudges for `isPaid`" acceptance line is routed by the
manual through the WIRING TESTS, not a live screenshot, and is pinned
credential-free and mutation-verified (see §6). Anusha offered to flip
`anushamurthy@gmail.com` to paid for confirmatory live evidence; it was not
required for acceptance and was not performed, leaving her account untouched.

---

## 5. The modified guard test — `test/isPaidDiscipline.test.ts` (review protocol §3.9)

`isPaidDiscipline.test.ts` enforces an EXHAUSTIVE allowlist of `src/` modules
permitted to name `isPaid`. M5 adds modules that legitimately consume
entitlement, so the allowlist changed. It was NOT weakened — it was restructured
into four categories, each earning its members with a proof appropriate to its
kind, and every category is mutation-verified:

- **ENTITLEMENT_SOURCE** (`entitlementStore.ts`) — the one module that reads the
  Firestore field, strictly `=== true`.
- **PURE_PARAMETER_CONSUMERS** (`nudgeGates.ts`, `quizEngine.ts`) — `isPaid` is a
  caller-supplied parameter; imports no Firestore at all.
- **DELIVERY_CONSUMERS** (`questionDelivery.ts`) — legitimately imports Firestore
  (it issues the reads) but must never read the field off a document, query it,
  or import the store. A companion test proves this, plus that the free query
  keeps the `isFree == true` paywall filter.
- **UI_CONSUMERS** (`AppShell`, `PracticeSurface`, `ExamSurface`,
  `FlashcardsSurface`) — obtain entitlement ONLY from `useEntitlement`; never a
  prop, never Firestore.
- **PROP_GATE_CONSUMERS** (`PracticePlayer`, `ExamPlayer`, `FlashcardPlayer`) —
  forward a prop `isPaid` into the pinned gates; never source it. A separate
  invariant asserts the ONLY files that may pass `isPaid={…}` down are the
  store-connected UI consumers, so entitlement still enters the tree at exactly
  one point and can never travel a path the store cannot reset on sign-out.

Mutation checks: a UI surface taking `isPaid` as a prop fails; an unclassified
new module naming `isPaid` fails; the executor that hit this guard STOPPED and
reported rather than editing it — the orchestrator made every classification.

The `chapter` prop added to `ExamPlayer`/`FlashcardPlayer` required adding
`chapter={1}` to existing render calls in `examPlayer.test.tsx` /
`flashcardPlayer.test.tsx` (S7) — additive, no assertion changed.

---

## 6. Nudge/wall wiring — pinned and mutation-verified

- **Gate logic consumed verbatim.** Players import `practiceWallBeforeQuestion`,
  `practiceNudgeBeforeQuestion`, `examNudgeBeforeStart`,
  `flashcardNudgeAfterReveal`, `countDistinctReveals` from `nudgeGates.ts` and
  render `<PremiumNudge>` / `<UpgradeWall>` unchanged. No gate arithmetic in any
  player (per-file source scans + the global D10c scan).
- **Practice:** wall checked before the nudge and before any question reaches the
  page; the Q21 deep link renders the wall (mutation: disabling the wall check
  fails 2). Nudge one-shot via `nudgesShownThisRun` (mutation: defeating it
  fails 3). No control offers a free user an index past the cap.
- **Exam:** exactly one gate call, in a `useState` initializer (runs once);
  never consulted after start. `examScope` captured immutably (mutation: making
  it mutable fails 1; forcing the pre-start nudge fails 3). No wall imported.
  Score display follows the captured scope, not a mid-run `isPaid` flip.
- **Flashcards:** distinct reveals tracked as a `Set` of `cardId`, reduced by
  `countDistinctReveals`; revisits never double-count (mutation: a per-event key
  fails 1). Nudge fires only in `handleGrade`, never in `handleReveal`, so a
  reveal is never interrupted. `rotation = gatesShownThisRun` selects the
  15/30/45 variants; max 3 falls out of the gate (mutation: defeating the max
  fails 1 — after the sweep bound was extended past the 4th boundary in
  orchestrator review, since the original bound made the claim vacuous).
- **Paid = zero nudges everywhere:** `studyLeakAndNudgeInvariants.test.ts`
  renders all three real players with `isPaid` and asserts no nudge/wall across
  the runs; `nudgeInvariants.test.ts` (M2) pins the pure gate matrix returning
  null for paid.

---

## 7. Recording — single write site, exactly once (review protocol §4 M4/M5)

- Results screens record through `recordPracticeSession` /`recordExamSession` /
  `recordFlashcardSession` (M4) and nothing else. `test/singleWriteSite.test.ts`
  stays green: no player/results component names `sessions` / `chapterProgress`
  / `mistakes` or imports `firebase/firestore`.
- **Exactly once:** `useRecordOnce` latches on a `useRef`. Pinned directly by
  `useRecordOnce.test.tsx` under `<StrictMode>` with `done` true AT MOUNT, so
  the setup→cleanup→setup double-invoke genuinely runs the effect twice on one
  instance and the latch must still emit one call. Mutation: removing the latch
  fails 2 (the players' own tests could not exercise this — their `done` flips
  after StrictMode's mount-time double-invoke).
- **Faithful mistakes data:** the practice player now retains the full parallel
  answers array (previously only the current pick) and passes questions+answers,
  so the M4 mistakes hook fires exactly as in the app. Asserted in
  `resultsRecording.test.tsx`.
- **Fail-closed:** a null backend (signed out / Firebase unavailable) shows the
  results screen, records nothing, and never throws. Asserted.
- **Honest scoring:** free exam result is `computeExamScorePct`'s percentage,
  never the misleading raw `correct/served` fraction (mutation: a raw "7/20"
  headline fails 1). Free and paid denominators never appear on one surface.

---

## 8. Leak discipline at the import graph (§0.6 / D12)

`studyLeakAndNudgeInvariants.test.ts` scans every `src/` file and asserts: no
module statically imports the free-question export; `questionDelivery.ts` imports
neither `content/` nor `node:fs`; no `'use client'` module imports the fs-backed
content loader. Mutation: injecting a `content/questions/*.json` import into
`questionDelivery.ts` fails 2. The postbuild leak gate proves `out/` is clean;
this proves the import graph cannot reintroduce question text.

`test/devAuthHookAbsent.test.ts` scans the real `out/` for `__arnreadyDevAuth`
and finds none — the dev sign-in hook is dead-code-eliminated by Next's
production `NODE_ENV` inlining. Confirmed empirically: `grep -rl __arnreadyDevAuth out/` returns nothing after `npm run build`.

---

## 9. Deviations from the manual (review protocol §2.4)

1. **Dev-only sign-in hook (D13).** A new, declared affordance:
   `installDevAuthHook` on `window.__arnreadyDevAuth`, entirely behind
   `process.env.NODE_ENV !== 'production'` so it is eliminated from `out/`
   (§8 proves this). Anusha authorized a test-only sign-in for the M5 evidence
   (2026-07-20). No password is ever handled.
2. **Manual advance in the players (unpinned UX).** Both quiz players use an
   explicit Next/Submit control rather than the app's 300ms auto-advance timer —
   a deliberate, unpinned choice matching keyboard-first / reduced-motion (design
   doc §7/§9) and consistent across both players. Not a locked rule.
3. **Flashcard shuffle NOT ported.** The app's shuffle-from-landing + mid-run
   reorder (`flashcardRun.js`) is excluded per plan D9 — the manual asks only for
   "ALL cards" + distinct-reveal tracking. Canonical order only.
4. **Two-button flashcard grade.** "I knew it" / "Didn't know it" as the two
   forward-advance controls — a reasonable reading of D9's self-grade language;
   flagged rather than treated as pinned.
5. **Results screen Arnie mood is calm, not score-gated.** Score-gated
   celebration (the app's working/proud/celebrating ladder) is deferred to M7
   polish; a low or ordinary run is never celebrated (celebration rationing).

Everything else follows the manual and plan exactly.

---

## 10. Known limitations and deferred items

- **Chapter-title canon mismatch (RAISED — Anusha's call).** The website copy
  (`syllabus.chapters`) and the app canon (`CONFIG.CHAPTERS`) disagree: chapter 1
  is "Indian Securities Market — an overview" (web) vs "Investment Landscape"
  (app), and chapters 5/7/10 differ in punctuation. This is PRE-EXISTING (shipped
  M0/M1, live on the public chapter hubs) but M5 surfaces it in the launcher,
  where a learner picks a title and gets that chapter's questions. M5 reused the
  existing `syllabus.chapters` source rather than inventing a second one (manual
  §0.5). Which list is canonical is a content decision for Anusha — it does not
  block M5 (the players render no title), but wants an answer before the study
  product ships.
- **Voice pass pending.** All new copy is marked WORKING (manual §0.8) and awaits
  Anusha's voice pass + the E-1/E-2 reviews (M7).
- **Score-gated Arnie / richer results** deferred to M7 (see §9.5).
- **Live paid screenshot** not captured; paid coverage is via wiring tests (§6).
- **M2-B1 obligation:** the study-surface half lands here; the mock-results
  premium pitch remains M6.

---

## 11. Confirmations against the §0 global rules

- §0.1 Branch: committed on `web-product`; `main` untouched. One commit, message
  `M5: …`.
- §0.3 No invented engine logic: `quizEngine` ported verbatim, pinned to
  app-generated fixtures.
- §0.5/§0.6 Content source & leak: questions delivered at runtime from Firestore,
  never in `out/`; leak gate green; free query keeps the `isFree` paywall filter.
- §0.7 Design system: theme tokens only (raw-hex guard passed), Feather icons,
  no emojis, cream canvas / white cards, one Arnie + one primary action per
  surface, footer disclaimer present.
- §0.9 `isPaid` read-only: never written, computed, defaulted, or derived
  client-side; enforced by the restructured `isPaidDiscipline` guard.
- §0.10 Stop conditions: no `firestore.rules` diff, nothing in app `functions/`,
  no new dependency, no scoring/gate constant changed, no deploy.
- §0.11 Gates: all five green (§2).

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
