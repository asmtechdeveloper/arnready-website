# ARNReady Website — M2 Execution Plan (decision-free, for Sonnet)

**Author:** Opus (senior architect / orchestrator), 14 Jul 2026.
**Status:** PLAN — not yet authorized to execute. Do not start until Anusha
says "go" AND M1 is signed off (see §0 Preconditions).
**Executor:** Sonnet, one atomic step at a time, driven and diff-reviewed by
Opus between steps. Sonnet makes **no** design or product decisions — every
decision is pinned below with a rationale so Codex can audit it.

**Canon hierarchy (unchanged):**
1. `docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md` — wins over everything.
2. `docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md` — how M2 is reviewed (§3 generic,
   §4 M2 checklist).
3. `../ARNReady-App` — source of truth for LOCKED rules. The two M2 sources are
   `services/quizEngine.ts` and `documents/adgate-logic.md`.

This plan **interprets** the manual's M2 spec into buildable steps. Where the
manual's wording assumes surfaces that do not yet exist, §1 (Scope reframe)
records exactly how M2 is bounded and why. That reframe is Opus's architectural
call, declared here so it reads as a deliberate decision, not scope drift.

---

## 0. Preconditions (Opus verifies before any step runs)

M2 **must not begin executing** until all of the following hold. This is a gate,
not a suggestion.

1. **M1 is signed off by Anusha.** As of this writing the review log carries
   OPEN against M1: **M1-B10** (BLOCKER), **M1-S1…M1-S6** (SHOULD-FIX), **M1-N1**
   (NIT). Manual §2: "Do not start M(n+1) before M(n) is approved." Review
   protocol §6.3: a milestone cannot pass with any OPEN BLOCKER/SHOULD-FIX.
   → **M2 execution is blocked on M1 closeout.** Writing this plan now is fine;
   running it is not.
2. **Branch is `web-product`.** Never `main`. One commit for M2:
   `M2: nudge + gate decision layer + wall`.
3. **Baseline gates are green** on the M1-signed-off tree: `npm run lint`,
   `npm run typecheck`, `npm test`, `npm run build`, `node scripts/check-paid-leak.mjs`.
   Record the baseline in the packet so any M2 regression is attributable.
4. **Stop conditions (manual §0.10) still bind.** M2 adds NO npm dependency (the
   single allowed config touch is a vitest `server.fs.allow` line — see D7 — and
   even that is optional and declared), touches NO `firestore.rules`, NO app-repo
   `functions/`, NO scoring/gate constants in the app repo, runs NO deploy.
   If any step seems to require one of these, Sonnet STOPS and reports to Opus.

---

## 1. Scope reframe (Opus's architectural decision — read first)

The manual's M2 goal reads: "the §1 free-tier rhythm live in `/app` practice,
exam, flashcards." **There are no `/app/*` product routes in the repo** (no
practice player, exam player, flashcard player, or mock — they exist only in
`pre-reset-snapshot`). They also cannot fully exist at M2: auth is M3, question
delivery is M3+, progress writes are M4, and global rule §0.5 + the leak gate
forbid question text in the export. Therefore M2 delivers the **machinery**, not
wired-up players:

**In scope for M2:**
- A pure decision layer (`src/lib/nudgeGates.ts`) — the ported practice gate, the
  synthesized flashcard/exam gates, and the Q21+ wall predicate. Pure functions,
  no React, deterministic, fully unit-tested against pinned goldens.
- `<PremiumNudge>` — one shared component, three variants (practice, exam,
  flashcard), WORKING copy per the nudge law, one-tap continue, dual CTA.
- `<UpgradeWall>` — the Q21+ wall / upgrade screen with `returnTo` back to chapter.
- Copy additions in `src/lib/copy.ts`, all marked WORKING.
- Fixture + wiring tests pinning the decisions to app values and pinning the
  no-nudge invariants that CAN be proven without players.
- Screenshots of all four nudge points + the wall (via a temporary, uncommitted
  preview harness — see D6).

**Explicitly NOT in scope for M2 (forward obligations, do not build now):**
- Any `/app/*` route or interactive player. (M3 auth → M5 mock/mistakes/progress.)
- Any Firestore read/write, auth, or entitlement code. (M3/M4.)
- Any real question or flashcard content in the tree. (Never — §0.5.)
- The runtime wiring test "no `<PremiumNudge>` renders on the mock run / mistakes
  deck" — those screens do not exist yet. M2 pins the *decision-layer* half of
  that guarantee (no mock/mistakes gate exists); the *render* half is an **M5
  obligation** recorded in §6.

This bounding is honest about what M2 can prove. The review protocol rewards that
over a packet that claims more than the code supports (the M1-B10 lesson).

---

## 2. Pinned decisions (Sonnet implements these verbatim; makes none of its own)

**D1 — Practice gate is a port of `quizEngine.gateBeforeQuestion` with an
ad→nudge mapping.**
App source (`../ARNReady-App/services/quizEngine.ts:100-108`), verbatim rule:
`gateBeforeQuestion(nextIndex,{isPaid,adsWatched,gate1=10})` → `'ad'` iff
`!isPaid && nextIndex===gate1 && adsWatched===0`, else `null`.
Web mapping (LOCKED here): **`'ad'` → `'nudge'`**, and **`adsWatched` →
`nudgesShownThisRun`**. Rationale: the web has no ads, so the app's "an ad was
already watched this run" state (`adsWatched>0` suppresses the gate) is exactly
the web's "this nudge already fired this run" state — the nudge law's "same nudge
never twice per run." Same index (10 = Q11), same one-shot semantics.

**D2 — Free cap / wall boundary.** Free practice = 20 questions = 0-based indices
0…19 (Q1…Q20). The wall stands before index ≥ 20 (Q21+) for free users. Constant
`FREE_QUESTIONS_PER_CHAPTER = 20` (mirrors app `CONFIG.FREE_QUESTIONS_PER_CHAPTER`,
adgate-logic.md:51). The wall is a **hard boundary**, not a nudge — it is allowed
to block, because the free tier genuinely ends at 20. Its purpose at M2 is the
defense described in review protocol §4 M2: "deep-link to Q21 while free → wall."

**D3 — Exam: one pre-start nudge, never mid-run.** `examNudgeBeforeStart({isPaid,
nudgeShown})` → `'nudge'` iff `!isPaid && !nudgeShown`, else `null`. There is
**deliberately no exam per-question gate function** — its absence is the guarantee
that the exam is never interrupted (adgate-logic.md:80-82: "Exam mode never
consults `gateBeforeQuestion`"). Forward obligation (M3/M5 exam player): call
`examNudgeBeforeStart` once before Q1, bound to the drawn set, and consult no gate
mid-run.

**D4 — Flashcard nudge is synthesized (no atomic app function exists).** The app's
reveal gate is smeared across `FlashcardScreen` state; only the constants are
canonical: `FLASHCARD_GATE_EVERY = 15`, `FLASHCARD_GATE_MAX = 3`
(adgate-logic.md:89). Web rule, per manual §1 ("after the 15th, 30th, 45th
distinct reveal, max 3 per run"), **run-scoped** (NOT the app's per-subtopic
reset — that app nuance intentionally does not port):
`flashcardNudgeAfterReveal(distinctReveals,{isPaid,gatesShownThisRun,every=15,
max=3})` → `'nudge'` iff `!isPaid && gatesShownThisRun < max && distinctReveals>0
&& distinctReveals % every === 0`, else `null`. This fires at 15/30/45 and never
again (at 60/75, `gatesShownThisRun` is 3 → null). **This is a declared deviation
from the manual's "PORT" wording** (there is nothing atomic to port) and MUST be
listed in the packet's Deviations section.

**D5 — "Distinct reveals" means unique card ids.** Revisiting a card already
revealed does not increment the count. Helper: `countDistinctReveals(revealedCardIds:
Iterable<string>): number` = `new Set([...ids]).size`. The caller (a future player)
tracks the set; the gate takes the resulting count.

**D6 — "Same nudge never twice" reconciled with "max 3 flashcard nudges."** The
manual asks for up to 3 flashcard nudges per run AND that the same nudge never
fires twice. Reconciliation (Opus decision): the three flashcard nudges use
**three distinct copy variants** (rotation index = `gatesShownThisRun` → 0/1/2 at
reveals 15/30/45). Practice and exam nudges fire at most once per run, so they need
no rotation. Rationale: honors both statements literally — three nudges, none a
repeat of another.

**D7 — Gate-parity oracle.** The practice gate is pinned by a committed, exhaustive
golden fixture `test/fixtures/nudgeGates.golden.json`, produced by
`scripts/gen-nudge-golden.mjs`. The generator imports the **real** app function
`gateBeforeQuestion` from `../ARNReady-App/services/quizEngine` (true provenance)
for the practice matrix, and encodes the manual-§1 flashcard/exam/wall rules (D2–D4,
which have no single app function) with explicit doc citations in comments. The
committed golden makes CI self-contained (the app repo may be absent in a clean
website checkout). **The golden test always runs and is never skipped** (the M1-B10
lesson — no `skipIf` on core coverage). A SEPARATE, additional live cross-repo
parity test MAY be `skipIf(appRepoAbsent)`-guarded; when it skips it must `console.warn`
loudly, and it adds coverage rather than replacing the golden. If the live test's
cross-repo TS import is blocked by vitest fs restrictions, adding
`server: { fs: { allow: ['..'] } }` to the vitest config is the ONE permitted config
change — declared in Deviations. (If it proves flaky, drop the live test; the golden
is the guaranteed oracle.)

**D8 — Arnie moods (one per surface, from the existing `public/arnie/*.png` set).**
Practice nudge → `checks-in`. Exam pre-start nudge → `setting-the-scene`.
Flashcard nudge → `makes-it-stick`. Upgrade wall → `proud`. All four already exist
in `src/components/Arnie.tsx` and `arnieAlts` in `copy.ts`; no new assets. Never
more than one Arnie per surface.

**D9 — Dual CTA + the app URL slot.** Every nudge and the wall show, until M7:
primary one-tap continue (surface-specific label), plus "Get the app" and "Web
checkout — coming soon" (informational, non-functional, matching the existing
`pricing.premium.checkoutLabel` pattern). "Get the app" needs the Play listing URL,
which is **Anusha's to supply** — do not invent it. Add `nudge.getApp = { href:
'/pricing', label: 'Get the app' }` with a `// [ANUSHA: Play Store listing URL —
interim points to /pricing]` marker, matching the repo's existing `[VERIFY]` /
`[ANUSHA-DECIDE]` slot convention.

**D10 — No-nudge invariants that M2 CAN prove.** (a) Every gate returns `null` for
`isPaid` (short-circuit). (b) The decision layer exports gate entry points ONLY for
practice, exam, flashcard, plus the wall predicate — there is **no mock gate and no
mistakes gate**; their absence is the guarantee (adgate-logic.md:18-20: "Mistakes
deck… Mock… carry zero ads"). A test asserts the exact exported surface set. (c)
`<PremiumNudge>` has no self-scheduling timer/effect — it renders only when a parent
passes it props, so it cannot appear on a screen that never invokes a gate.

**D11 — Design system (manual §0.7, design doc §6).** Theme tokens only, no raw hex
(the `check-no-raw-hex` guard will catch violations). Feather icons via
`src/components/Icon.tsx`, no emoji. Card surfaces may be white; page canvas is
`#F5F5F0`. Every interactive control has default/hover/focus-visible/active/disabled
states and a ≥44px tap target. Copy strings all marked WORKING.

---

## 3. Nudge-law copy (WORKING — Sonnet pastes verbatim into `copy.ts`)

Every string below pitches what premium **ADDS** (questions past 20, unlimited
mocks, full mistakes engine, full answer review) and **never** sells relief from
the nudge/pauses (the web has no ads to remove — selling relief is a §3.7 BLOCKER).
Add as a new `export const nudge = {…}` block in `src/lib/copy.ts`, styled like the
existing exports.

```ts
// ── Premium nudges + upgrade wall (manual §1 nudge law) ──────────────────
// WORKING until Anusha's voice pass. Every string pitches what premium ADDS,
// never relief from the nudge itself (the web is ad-free — there is nothing to
// remove). Dual CTA until M7 ships web checkout.
export const nudge = {
  // Interim: "Get the app" points at /pricing until the Play listing URL lands.
  getApp: { href: '/pricing', label: 'Get the app' }, // [ANUSHA: Play Store listing URL]
  webSoon: { label: 'Web checkout — coming soon' },   // informational, non-functional

  practice: {
    mood: 'checks-in' as const,
    title: 'You’re flying through these.',
    body: 'The free set runs to 20 questions per chapter. Premium opens every question beyond them — plus unlimited mock tests and the full mistakes engine, on the app today and the web soon.',
    continue: 'Keep practising',
  },

  exam: {
    mood: 'setting-the-scene' as const,
    title: 'One honest run, coming up.',
    body: 'This exam uses your 20 free questions for the chapter and won’t interrupt you once it starts. Premium adds the complete question bank, unlimited mocks, and full answer review — on the app today, the web soon.',
    continue: 'Start the exam',
  },

  // Three variants, shown at distinct reveals 15 / 30 / 45 (rotation = gatesShownThisRun).
  // Distinct copy each time honors "the same nudge never fires twice per run".
  flashcard: {
    mood: 'makes-it-stick' as const,
    continue: 'Keep flipping',
    variants: [
      {
        title: 'Fifteen cards deep.',
        body: 'The full deck is yours, free forever. Premium is for the exam side — every practice question past 20, unlimited mocks, and full answer review. On the app now, the web soon.',
      },
      {
        title: 'Thirty, and still going.',
        body: 'Flashcards stay free. When you’re ready to test yourself hard, premium opens the complete question bank and unlimited mock tests — app today, web soon.',
      },
      {
        title: 'Forty-five. That’s real work.',
        body: 'Every card is free. Premium adds the full mistakes engine and unlimited mocks, so the testing keeps up with your recall — app today, web soon.',
      },
    ],
  },
};

// ── Q21+ upgrade wall (hard boundary, not a nudge) ───────────────────────
export const upgradeWall = {
  mood: 'proud' as const,
  title: 'That’s all 20 free questions for this chapter.',
  body: 'You’ve used the full free practice set. Premium opens every remaining question in this chapter — and every chapter — plus unlimited mock tests and full answer review. On the app today; web checkout is coming soon.',
  primaryCta: { href: '/pricing', label: 'See premium' },
  backToChapter: 'Back to the chapter', // href built by the caller from returnTo
};
```

Note: `arnieAlts` already contains `checks-in`, `setting-the-scene`,
`makes-it-stick`, and `proud` — no copy change needed there.

---

## 4. Atomic steps

Each step is one Sonnet sub-agent task. Opus reviews the diff and reruns the
relevant gates **before** authorizing the next step. The exact prompt to hand the
Sonnet sub-agent is in the fenced "PROMPT" block. Sonnet does only what the prompt
says; if blocked or tempted to decide anything, it stops and reports.

### S1 — Pure decision layer + goldens + unit tests
**Creates:** `src/lib/nudgeGates.ts`, `scripts/gen-nudge-golden.mjs`,
`test/fixtures/nudgeGates.golden.json`, `test/nudgeGates.test.ts`.
**Exact API (`src/lib/nudgeGates.ts`):**
```ts
export const PRACTICE_GATE_INDEX = 10;          // Q11, 0-based (app CONFIG.AD_GATE_1)
export const FREE_QUESTIONS_PER_CHAPTER = 20;   // wall boundary (Q21+)
export const FLASHCARD_GATE_EVERY = 15;
export const FLASHCARD_GATE_MAX = 3;

export function practiceNudgeBeforeQuestion(
  nextIndex: number,
  opts: { isPaid: boolean; nudgesShownThisRun: number; gateIndex?: number },
): 'nudge' | null;                               // D1

export function practiceWallBeforeQuestion(
  nextIndex: number,
  opts: { isPaid: boolean; freeCap?: number },
): 'wall' | null;                               // D2

export function examNudgeBeforeStart(
  opts: { isPaid: boolean; nudgeShown: boolean },
): 'nudge' | null;                              // D3

export function flashcardNudgeAfterReveal(
  distinctReveals: number,
  opts: { isPaid: boolean; gatesShownThisRun: number; every?: number; max?: number },
): 'nudge' | null;                              // D4

export function countDistinctReveals(revealedCardIds: Iterable<string>): number; // D5
```
Every function is total (no input throws) and cites its source in a doc comment
(D1→quizEngine.ts:100-108; D2/D4→adgate-logic.md + manual §1; D3→adgate-logic.md:80-82).
`test/nudgeGates.test.ts` asserts each function equals `nudgeGates.golden.json`
across the full matrix (practice: nextIndex 0…25 × isPaid{t,f} × nudgesShownThisRun
{0,1,2}; flashcard: distinctReveals 0…50 × isPaid{t,f} × gatesShownThisRun{0,1,2,3};
exam: isPaid{t,f} × nudgeShown{t,f}; wall: nextIndex 0…25 × isPaid{t,f}), plus a
run-simulation test proving exactly three flashcard nudges fire (at 15/30/45) over a
60-distinct-reveal run, and a practice-run test proving the nudge fires once at Q11
and not again. Optional live cross-repo parity test per D7, `skipIf`-guarded with a
loud warn; the golden test is never skipped.

```
PROMPT (S1):
Read docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md §0–§1, docs/ARNREADY_WEBSITE_M2_EXECUTION_PLAN.md
§0–§4 (especially D1–D7 and this step S1), and ../ARNReady-App/services/quizEngine.ts
lines 100-108 and ../ARNReady-App/documents/adgate-logic.md. Create ONLY these files
exactly as S1 specifies: src/lib/nudgeGates.ts (the five exports with the exact
signatures and the pinned rules D1–D5, every function total, each citing its source
in a comment), scripts/gen-nudge-golden.mjs (generates the golden per D7 — import the
real app gateBeforeQuestion for the practice matrix; encode D2/D3/D4 rules with doc
citations for the others), test/fixtures/nudgeGates.golden.json (the generator's
committed output), and test/nudgeGates.test.ts (asserts each function equals the
golden across the full matrix in S1, plus the flashcard 15/30/45 max-3 run simulation
and the practice once-only simulation; optional skipIf-guarded live parity per D7 with
a loud warn — never skip the golden test). Do NOT create components, copy, routes, or
touch any other file. Make NO product or design decision — every rule is pinned in
D1–D5. Run: npx vitest run test/nudgeGates.test.ts, npm run typecheck, npm run lint.
Paste all three outputs and the golden JSON. If anything is ambiguous or would need a
decision, STOP and report to Opus instead of guessing.
```
**Opus checkpoint:** verify the golden matches D1–D4 by hand for the boundary rows
(Q11 free/paid, reveal 15/30/45/60, Q21 wall); confirm no `skipIf` on the golden test;
confirm totality (a poison input like `NaN`/`undefined` returns null, not throw);
rerun the three gates.

### S2 — Copy additions
**Edits:** `src/lib/copy.ts` (append the `nudge` and `upgradeWall` blocks from §3
verbatim). No other file.
```
PROMPT (S2):
Read docs/ARNREADY_WEBSITE_M2_EXECUTION_PLAN.md §3 and D6/D8/D9. Append the `nudge`
and `upgradeWall` export blocks to src/lib/copy.ts EXACTLY as printed in §3, including
the [ANUSHA: Play Store listing URL] marker. Change nothing else in copy.ts and no
other file. Do not reword any string — this is WORKING copy Anusha will voice-pass
later. Run npm run typecheck and npm run lint; paste both. STOP and report if the file
shape differs from what §3 assumes.
```
**Opus checkpoint:** diff is additive only; strings byte-match §3; no raw hex; typecheck/lint green.

### S3 — `<PremiumNudge>` component + test
**Creates:** `src/components/PremiumNudge.tsx`, `test/premiumNudge.test.tsx`.
**Contract:** `PremiumNudge({ variant: 'practice'|'exam'|'flashcard', onContinue:
() => void, rotation?: number })`. Renders a card (white surface on `#F5F5F0`),
one Arnie per D8, title+body from `copy.nudge[variant]` (flashcard uses
`variants[rotation ?? 0]`), a primary one-tap "continue" button wired to
`onContinue`, and the dual CTA (`copy.nudge.getApp` as a link, `copy.nudge.webSoon`
as informational text). All interactive states + focus-visible + ≥44px targets
(D11). No timers/effects (D10c). Test: renders each variant with correct
Arnie/title/body; clicking continue calls `onContinue` exactly once; flashcard
`rotation` 0/1/2 shows variants[0/1/2]; dual CTA present; no emoji; Arnie count = 1.
```
PROMPT (S3):
Read docs/ARNREADY_WEBSITE_M2_EXECUTION_PLAN.md S3, D8–D11, and inspect existing
components src/components/FlashcardSampler.tsx, Arnie.tsx, Icon.tsx for house style.
Create ONLY src/components/PremiumNudge.tsx and test/premiumNudge.test.tsx per the S3
contract. Use copy from src/lib/copy.ts (the `nudge` block) — hardcode no prose. Use
the Arnie moods pinned in D8. Theme tokens only (the check-no-raw-hex guard will fail
on raw hex). No timers or auto-dismiss (D10c). Wire the one-tap continue button to
onContinue. Run npx vitest run test/premiumNudge.test.tsx, npm run typecheck, npm run
lint; paste outputs. Make no design decision beyond what S3/D8–D11 pin; STOP and
report if something is unspecified.
```
**Opus checkpoint:** one Arnie; copy sourced not hardcoded; continue fires once;
focus-visible present; no raw hex; tests green.

### S4 — `<UpgradeWall>` component + test
**Creates:** `src/components/UpgradeWall.tsx`, `test/upgradeWall.test.tsx`.
**Contract:** `UpgradeWall({ returnTo: { chapter: number } })`. Renders the wall
copy (`copy.upgradeWall`), Arnie `proud`, a single primary CTA to `/pricing`, and a
"Back to the chapter" link whose href is built from `returnTo.chapter` (→
`/chapters/${chapter}`). Footer disclaimer comes from the shared layout, not this
component. It is a hard boundary — no "continue"/dismiss. Test: renders title/body
from copy; primary CTA → `/pricing`; back link → `/chapters/<n>`; exactly one primary
CTA (design §3.4); no nudge continue button; no emoji.
```
PROMPT (S4):
Read docs/ARNREADY_WEBSITE_M2_EXECUTION_PLAN.md S4, D2, D8, D11. Create ONLY
src/components/UpgradeWall.tsx and test/upgradeWall.test.tsx per the S4 contract. Copy
from copy.upgradeWall; Arnie mood `proud`; build the back-to-chapter href from
returnTo.chapter as `/chapters/${chapter}`. One primary CTA to /pricing; no
dismiss/continue (this is a hard boundary, not a nudge). Theme tokens only. Run npx
vitest run test/upgradeWall.test.tsx, npm run typecheck, npm run lint; paste outputs.
STOP and report on any ambiguity.
```
**Opus checkpoint:** exactly one primary CTA; back link href correct; no dismiss
affordance; tests green.

### S5 — Invariants / wiring test
**Creates:** `test/nudgeInvariants.test.ts`.
**Asserts (D10):** (a) every gate in `nudgeGates.ts` returns `null` when
`isPaid:true`, across a sampled matrix; (b) the module's exported gate surface is
exactly `{ practiceNudgeBeforeQuestion, examNudgeBeforeStart,
flashcardNudgeAfterReveal }` plus `practiceWallBeforeQuestion` — i.e. **no** mock or
mistakes gate is exported (assert by reflecting over the module's exports); (c) a
grep-style guard (read `src/**/*.ts` text in-test) that no other `src/` module
defines a function named like a gate (`*NudgeBefore*`, `*GateBefore*`) — the single
write-site rule for the decision layer.
```
PROMPT (S5):
Read docs/ARNREADY_WEBSITE_M2_EXECUTION_PLAN.md S5 and D10. Create ONLY
test/nudgeInvariants.test.ts asserting: (a) all four nudgeGates functions return null
for isPaid:true across a sampled input matrix; (b) the exported gate/wall surface of
src/lib/nudgeGates.ts is exactly the four named exports and no mock/mistakes gate
exists (reflect over module exports); (c) no other file under src/ defines a
gate-like function name (read the src tree in-test and assert). Run npx vitest run
test/nudgeInvariants.test.ts, npm run typecheck, npm run lint; paste outputs. STOP and
report on ambiguity.
```
**Opus checkpoint:** paid short-circuit proven; exported surface exact; guard actually
reads the tree (not a stub).

### S6 — Screenshots via temporary preview harness (Opus drives the browser)
This step produces the required screenshots WITHOUT shipping a demo route.
1. Sonnet creates a **temporary** `src/app/nudge-preview/page.tsx` that renders, with
   synthetic props (obviously-fake placeholder strings — NEVER real Firestore
   content), all five surfaces: practice nudge, exam nudge, flashcard nudge variants
   (show all three), and `<UpgradeWall returnTo={{chapter:1}} />`.
2. Opus runs `next dev` via the Browser preview, captures 375px and 1440px screenshots
   of each surface into `docs/review-packets/screenshots/M2/`.
3. Sonnet **deletes** `src/app/nudge-preview/` and Opus verifies it is gone
   (`git status` shows no such path; `find src/app/nudge-preview` returns nothing).
The preview route is scaffolding; it is never committed. Declared in the packet's
Deviations.
```
PROMPT (S6a — create harness):
Create ONLY a TEMPORARY src/app/nudge-preview/page.tsx that renders, stacked with
clear headings, <PremiumNudge> for variant 'practice', variant 'exam', variant
'flashcard' at rotation 0/1/2, and <UpgradeWall returnTo={{chapter:1}} />. Use
synthetic placeholder props only — no real question/flashcard content. onContinue can
be a no-op. This file is temporary and will be deleted; do not import it anywhere or
add it to sitemap/nav. Run npm run dev is NOT needed from you — just create the file,
run npm run typecheck, paste output, and report ready for Opus to screenshot.

PROMPT (S6b — remove harness, AFTER Opus confirms screenshots captured):
Delete src/app/nudge-preview/ entirely. Confirm with: find src/app/nudge-preview
(should print nothing) and git status (should show no nudge-preview path). Paste both.
```
**Opus checkpoint:** screenshots exist at both widths for all five surfaces; harness
fully removed; `check-paid-leak` still clean (no preview artifacts).

### S7 — Full gates, packet, commit
1. Sonnet runs the full §0.11 gate suite from the final tree and pastes outputs:
   `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`,
   `node scripts/check-paid-leak.mjs`.
2. Sonnet writes `docs/review-packets/M2_PACKET.md` per review-protocol §2:
   scope + full changed-file list; the five gate outputs from the FINAL commit;
   the screenshots; the **Deviations** section listing D4 (synthesized flashcard
   gate — not a literal port), D6 (temporary preview harness, removed), D7 (golden
   oracle + optional live parity + any vitest `fs.allow` line), and the §1 scope
   reframe (machinery, not wired players); Known limitations + the §6 forward
   obligations; and, as a fixture-test milestone, the fixture file + both-side
   outputs (golden provenance + web test pass).
3. Commit `M2: nudge + gate decision layer + wall` on `web-product`. Do NOT touch
   `docs/ARNREADY_WEBSITE_REVIEW_LOG.md` (Codex-owned, protocol §6.3).
```
PROMPT (S7):
Read docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md §2 and §3, and M2_EXECUTION_PLAN §5–§6.
Run the full gate suite from the current tree (npm run lint, npm run typecheck, npm
test, npm run build, node scripts/check-paid-leak.mjs) and paste every output. Write
docs/review-packets/M2_PACKET.md per protocol §2 including the Deviations (D4, D6, D7,
scope reframe), the forward obligations from plan §6, and the fixture provenance +
both-side outputs. Then commit exactly the M2 files as "M2: nudge + gate decision
layer + wall" on web-product. Do NOT edit docs/ARNREADY_WEBSITE_REVIEW_LOG.md. Paste
git status and git show --stat for the commit. STOP and report if any gate is not
green — do not commit red gates.
```
**Opus checkpoint (pre-commit):** scope containment (only the M2 files changed;
nothing forbidden touched); all gates reproduce green; packet Deviations complete and
honest; leak gate clean; review log untouched.

---

## 5. Acceptance (maps to manual M2 + protocol §4 M2)

- Gate decision fixtures match app `gateBeforeQuestion` across the full matrix
  (D1/D7); reveal counting is DISTINCT (D5); flashcard fires exactly at 15/30/45,
  max 3 (D4); "same nudge never twice" honored (D6). ✔ S1
- Q21+ wall predicate returns `wall` for free deep-links to index ≥ 20 (D2); the
  `<UpgradeWall>` renders with `returnTo`. ✔ S1, S4
- Exam gate is one-shot pre-start; no mid-run gate function exists (D3). ✔ S1, S5
- No nudge for paid users anywhere; no mock/mistakes gate exists (D10). ✔ S5
- Screenshots of all four nudge points + the wall at 375px and 1440px. ✔ S6
- All §0.11 gates green from the final commit; packet complete. ✔ S7

---

## 6. Forward obligations (record in the packet; NOT built at M2)

These are the halves of the manual's M2 intent that cannot be proven without
surfaces that don't exist yet. They are logged so the later milestone owns them:

1. **M3/M5 exam player:** consult `examNudgeBeforeStart` once before Q1 (bound to the
   drawn set); consult NO gate mid-run.
2. **M5 mock + mistakes screens:** carry the runtime wiring test asserting NO
   `<PremiumNudge>` renders on the mock run or mistakes deck (protocol §4 M2 render
   half). M2 proved the decision-layer half (no such gate exists).
3. **M5 practice/exam players:** feed the gate its run state (`nudgesShownThisRun`,
   `gatesShownThisRun`, distinct-reveal set) and render `<PremiumNudge>` /
   `<UpgradeWall>` at the returned decision. The wall's client-side unbypassability
   (deep-link to Q21 → wall) is enforced where the player reads the route.
4. **M6:** the nudge/wall WORKING copy gets Anusha's voice pass + E-1/E-2 review.

---

## 7. Orchestration (how Opus drives this once Anusha says "go")

- Opus spawns one Sonnet sub-agent per step (S1→S7) using the PROMPT blocks above,
  reviews the diff + reruns the relevant gates at each checkpoint, and only then
  authorizes the next step. Any drift, ambiguity, or stop-condition trip → Sonnet
  halts and reports; Opus adjusts the prompt, never lets Sonnet decide.
- Sub-agents run in this working tree; steps are sequential (no parallel file writes).
- After S7, the milestone goes to Codex (review protocol §1 paste-prompt) and then to
  Anusha for sign-off — the human/Codex gate is preserved; Opus's per-step review is
  additional, not a replacement.
- The review log (`docs/ARNREADY_WEBSITE_REVIEW_LOG.md`) is Codex-owned; no Sonnet
  step and no Opus action writes to it (protocol §6.3). Recommend a project-local
  Claude permission denying edits to that path before execution begins.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
