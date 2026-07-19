# ARNReady Website — Execution Manual (CANON)

**Status:** Approved by Anusha, 13 Jul 2026. This document is the CANONICAL
execution plan for the website. Where it disagrees with CLAUDE.md, the PRD,
the IA doc, or the old next-work-plan, THIS FILE WINS. It was written as a
handoff: the executing agent follows it exactly and does not re-litigate
decisions recorded here. This manual names NO models — Anusha chooses the
agents per milestone from whatever is best available at the time.

**Who does what** (ROLES, not models — Anusha chooses which agent fills each
role, per milestone; updated 2026-07-16):

> **Why this shape:** M0 and M1 were each handed wholesale to a single executor
> and produced a heavy defect load (M1 alone cost a full day of remediation).
> M2 ran under an orchestrator that decomposed the work, drove executor
> subagents one atomic step at a time, and reviewed every diff — and went far
> cleaner. No milestone is ever handed wholesale to an executor again.

- **Orchestrator** — owns EVERY milestone: the plan, the decomposition into
  atomic decision-free steps, the per-step diff review, and the §0.11 gates.
  Anusha assigns the strongest available agent to this role.
- **Executor subagents** — do the mechanical build, one atomic step each, never
  a whole milestone. Every step is diff-reviewed and re-gated by the
  orchestrator before the next is released.
- **Reviewer** — reviews every milestone adversarially per
  `docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md`.
- **Anusha** — approves each milestone, owns voice/copy, secrets, deploys, and
  chooses the agents behind every role above.

**Milestone tags** (execution style and risk — never a model name):
- **[STANDARD]** — wiring, pages, components. The orchestrator delegates the
  build to executor subagents, step by reviewed step.
- **[SENSITIVE]** — auth/entitlement, progress parity, payments. The
  orchestrator executes the core ITSELF and decides per task whether to
  delegate mechanical sub-parts. Entitlement, payment, and Firestore
  write-shapes never leave the orchestrator's hands.
- **[+ ANUSHA]** — the milestone has a required Anusha action (console
  registration, secrets, device pass) before or during execution.

---

## 0. Non-negotiable global rules (read before every session)

1. **Branch discipline.** All work on `web-product`. NEVER push, merge to, or
   commit on `main` — a push to `main` deploys the live site. One commit per
   milestone, message `M<n>: <summary>`.
2. **Read order for a new session:** this file → `CLAUDE.md` (note its 13 Jul
   correction banner) → `docs/ARNREADY_WEBSITE_DESIGN_DOCUMENT.md` → the app
   repo file named in the milestone, if any.
3. **Never invent engine logic.** Scoring, gate positions, mock weights,
   free-mock counter semantics are COPIED from the app repo
   (`../ARNReady-App/services/quizEngine.ts`, `mockService.js`,
   `progressService.js`) — ported with fixture tests, never re-derived.
   If a formula seems wrong, STOP and ask Anusha; do not "fix" it.
4. **The Play fence (absolute, one-directional).** The website MAY link to
   the Android app and MAY sell via Razorpay. The app never links to web
   checkout — but that is the app repo's problem; on the web side the rule
   is simply: never write copy implying the app links here for purchase.
5. **Content source of truth is Firestore.** Public pages are SSG'd FROM
   Firestore at build time. No question, flashcard, or teaching text is ever
   hardcoded or hand-edited in this repo. Content fixes go through the app
   repo's content pipeline.
6. **The paid-leak gate.** `scripts/check-paid-leak.mjs` must pass on every
   build. Public export budget (extend the script to enforce ALL of this):
   - chapter teaching + subtopic teaching blocks: allowed public
   - flashcards: EXACTLY the first 10 in canonical deck order per chapter
   - questions: ZERO in the public/static export (the free 20 are delivered
     only to signed-in clients)
   - anything with `isFree: false` or unpublished status: never
7. **Design system.** Purple `#534AB7`, green `#1D9E75`, bg `#F5F5F0` (never
   white), amber `#F59E0B`, red `#EF4444`. Nunito. Feather icons only. NO
   emojis anywhere. Arnie is a PANDA (never "red panda"), static PNGs, one
   per surface, celebrations only on earned moments. Theme tokens only — no
   raw hex in components.
8. **Copy.** All user-facing strings live in a central copy module, marked
   `WORKING` until Anusha's voice pass. Every public page: exactly one
   primary CTA + the standard footer disclaimer. Public copy ships only
   after E-1 (fake claims) and E-2 (affiliation risk) review prompts.
9. **isPaid is server-write-only** (`users/{uid}.isPaid`). The web client
   READS it via the entitlement store mirror. No client code path may write
   it, compute it, or default it to true on error.
10. **Stop conditions — end the session and report to Anusha instead of
    proceeding:** any edit to `firestore.rules`; anything in the app repo's
    `functions/`; any new npm dependency; any change to scoring/gate
    constants; any deploy command; anything this manual doesn't cover.
11. **Quality gates for EVERY milestone commit:** `npm run lint` (0
    warnings), `npm run typecheck`, `npm test`, `npm run build`,
    `node scripts/check-paid-leak.mjs` — all green, outputs pasted into the
    evidence packet.

---

## 1. The approved product model (13 Jul canon)

Supersedes the "LOCKED web-side rules (9 Jul)" section of CLAUDE.md.

**Public (no sign-in, indexable, SSG):**
- `/` homepage; `/chapters` index; `/chapters/[chapter]` hub (full chapter
  teaching + subtopic index + 10 sampler flashcards + ONE sign-in CTA);
  `/chapters/[chapter]/[subtopic]` spoke (subtopic teaching + that
  subtopic's share of the 10 sampler cards). Spokes are generated ONLY for
  subtopics with approved teaching. Spoke titles are concept-first
  ("NAV calculation — NISM Series V-A"), never number-first.
- Standard pages: `/nism-series-v-a`, `/syllabus`, `/pricing`, `/about`,
  `/faq`, `/privacy`, `/delete-account`, `/support`, `/mock-test` and
  `/flashcards` (as marketing pages for those modes). The public
  `/questions` page is RETIRED (redirect to `/chapters`).
- Sign-in prompts appear in exactly three places, always cancellable: after
  the 10th sampler card, on any practice/exam/mock CTA, in the header.

**Signed-in free tier (`/app`, Google sign-in, ad-free):**
- Flashcards: ALL cards. Nudge interstitial after the 15th, 30th, 45th
  distinct reveal, max 3 per run, one-tap continue, never blocks a reveal
  or grade. Mirrors app config (`FLASHCARD_GATE_EVERY`=15,
  `FLASHCARD_GATE_MAX`=3).
- Practice: the same fixed 20 free questions per chapter the app serves
  (`isFree: true` flags in Firestore). One nudge before Q11. Q21+ = wall
  (upgrade screen).
- Chapter exam: same 20-question free set; one pre-start nudge; the exam
  itself is NEVER interrupted.
- Mock: one free mock per account EVER (cross-platform Firestore counter —
  same counter the app uses). No nudge during the run; the premium pitch
  lives on the results screen.
- Mistakes deck, progress, account: free, no nudges mid-study.
- Scoring (LOCKED, port-only): free = correct ÷ max(10, attempted);
  paid = correct ÷ questions served. Never compare the two on one surface.

**Paid (₹250 lifetime):** everything, zero nudges anywhere.

**Nudge copy law (Anusha-approved, applies to every nudge):** a nudge
pitches what premium ADDS (every question past 20, unlimited mocks, full
mistakes engine) — NEVER relief from the nudge itself, because the web has
no ads to remove. Arnie delivers it warmly; the same nudge never fires
twice in one run. Until M8 ships, the nudge CTA is dual: "Get the app" +
"Web checkout coming soon"; after M8 it becomes the Razorpay checkout.

---

## 2. Milestones

Execute strictly in order. One milestone = one session = one commit = one
Codex review = one Anusha approval. Do not start M(n+1) before M(n) is
approved.

**Repo reset note (13 Jul):** the repository was intentionally stripped to a
clean start. The complete previous implementation (a working Next.js
product) is preserved at git tag `pre-reset-snapshot` — consult it
READ-ONLY for reference (`git show pre-reset-snapshot:<path>`,
`git ls-tree -r pre-reset-snapshot --name-only`). Never cherry-pick or
restore files from it wholesale; build per this manual. Two scripts were
kept in the tree as-is and are load-bearing: `scripts/export-content.mjs`
(Firestore → build-time content export) and `scripts/check-paid-leak.mjs`
(the leak gate).

### M0 [STANDARD] — Fresh scaffold
**Goal:** a clean Next.js foundation the later milestones build on.
**Steps:**
1. Scaffold Next.js (App Router) + TypeScript + Tailwind, configured for
   STATIC EXPORT (classic Firebase Hosting — `output: 'export'`); vitest +
   ESLint (0-warning policy); Nunito via next/font.
2. One theme-token module encoding §0.7 exactly (colors, bg `#F5F5F0`,
   radii, spacing); no raw hex anywhere else — add a lint/grep guard.
3. Base layout: header (sign-in slot stubbed), footer with the standard
   disclaimer; shared Arnie image component (static PNGs from `assets/`,
   one per surface).
4. Wire `scripts/export-content.mjs` into the build (`.env.example` lists
   the required credentials — Anusha supplies real values locally, never
   committed) and make `scripts/check-paid-leak.mjs` a build-blocking step.
5. Recreate the compliance/standard public pages from the copy scaffold:
   `/privacy`, `/delete-account`, `/support`, `/about`, `/faq`, `/pricing`,
   `/syllabus`, `/nism-series-v-a` — copy marked WORKING. (The live GH
   Pages versions on `main` remain the deployed truth until cutover; do
   not touch `main`.)
**Acceptance:** §0.11 gates green on the fresh scaffold; static export
builds; leak gate runs and passes; screenshots of the base layout at 375px
and 1440px.

### M1 [STANDARD] — Public content layer
**Goal:** chapter hubs + subtopic spokes live on the static build.
**Steps:**
1. Extend the Firestore build-time fetch to read `chNN_teaching` docs
   (docType `chapterTeaching`, status `approved`) including the optional
   `subtopics` array. PORT the normalization rules from the app repo's
   `services/flashcardTeaching.js` — including its object-injection guard:
   block-type dispatch must use `Object.create(null)` or a
   `hasOwnProperty.call` check, and malformed docs normalize to null, never
   throw. Write unit tests with malformed fixtures (missing status, wrong
   chapter, `type: 'constructor'`, `type: 'valueOf'`, empty segments).
2. Build `/chapters/[chapter]`: teaching blocks (paragraph/heading/bullets
   with emphasis segments), subtopic index links, 10 sampler cards (first
   10 of canonical deck order — port `buildCanonicalDeck` ordering,
   including `docType` exclusion), one sign-in CTA, footer disclaimer.
3. Build `/chapters/[chapter]/[subtopic]` for approved-teaching subtopics
   only: teaching + that subtopic's sampler cards + breadcrumbs + prev/next.
4. Do NOT create a public `/questions` page; add a redirect from the old
   `/questions` URL to `/chapters` (it existed on the previous site).
   Generate sitemap + robots including hubs and spokes.
5. Extend `scripts/check-paid-leak.mjs` to enforce the §0.6 budget,
   including "≤10 cards per chapter" and "zero question text in the export".
**Forbidden:** auth code, `/app/*` routes, any question rendering.
**Acceptance:** gates green; build output contains teaching + ≤10
cards/chapter and zero question text (paste the leak-gate output);
screenshots of one hub + one spoke at 375px and 1440px.

### M2 [STANDARD] — Nudge component + free-gate wiring in the client product

> **Scope amendment (Anusha, 2026-07-15, resolving M2 Codex finding M2-B1):**
> M2 delivers the nudge/gate MACHINERY only — the `<PremiumNudge>` and
> `<UpgradeWall>` components, the pure `src/lib/nudgeGates.ts` decision layer
> with app-parity fixtures, and the screenshots. The **live `/app` render
> sites** for that machinery — the "live in /app" goal plus steps 3–4's
> render behavior (practice Q11 nudge, exam pre-start, flashcard 15/30/45, the
> free-user Q21+ deep-link→wall unbypassable behavior, and the mock-results
> premium pitch) — are **re-sequenced to M5** (signed-in study surfaces; the
> mock-results pitch lands with the mock surface in M6), because they require auth (M3)
> and question/flashcard data (M3+) and would otherwise force question-shaped
> text into the static export, violating §0.6. M2's acceptance is met by the
> machinery + fixtures + screenshots below; the render-site wiring and its
> tests move to M5/M6 acceptance. The component/decision-layer specs in the
> steps below still govern what M2 builds.

**Goal:** the §1 free-tier rhythm live in `/app` practice, exam, flashcards.
**Steps:**
1. One shared `<PremiumNudge>` component: Arnie, WORKING copy per the nudge
   law, one-tap continue, dual CTA. Renders as interstitial (practice Q11,
   flashcard 15/30/45) and pre-start card (exam).
2. Wire gate positions by PORTING the app's pure gate decision
   (`quizEngine.gateBeforeQuestion`) and distinct-reveal counting — with
   fixture tests asserting identical decisions to the app for the same
   inputs (isPaid true/false, indices 0..25, reveals 0..50).
3. Q21+ wall: upgrade screen with `returnTo` back to the chapter.
4. Mock results screen gets the premium pitch block; mock run and mistakes
   deck get a wiring test asserting NO nudge renders there. Paid users:
   wiring test asserting zero nudges everywhere.
**Forbidden:** touching scoring, session recording, Firestore writes.
**Acceptance:** gates green; fixture tests vs app values committed;
screenshots of all four nudge points + the wall.

### M3 [SENSITIVE + ANUSHA] — Firebase Web App + auth/entitlement integration

> **Scope amendment (Anusha, 2026-07-16, narrowing the 15 Jul amendment):**
> M3 is the auth/entitlement core ONLY. The `/app` nudge/wall wiring deferred
> from M2 does NOT land here — it moves to **M5** (signed-in study surfaces),
> with the mock-results premium pitch landing in **M6** alongside the mock
> surface. M3 owns only the auth-side UI: the three cancellable sign-in
> prompts and the signed-out/signed-in `/app` states.

**Anusha first:** register the Firebase Web App in the console (same
project as the app), hand the config to the session. No rules changes.
**Then:** wire Google sign-in end-to-end; entitlement store mirroring
the app's `entitlementStore` (read-only `isPaid` listener); the three
cancellable sign-in prompts; signed-out `/app` states. Integration-test
against the real project with a throwaway Google account: sign-in,
cancel-path, isPaid read for a known-paid test uid, sign-out.
**Acceptance:** recorded test matrix (sign-in/cancel/paid-read/sign-out ×
desktop/mobile); no `firestore.rules` diff; Codex security review passed.

### M4 [SENSITIVE] — Progress parity port (the single-write-site problem)
**Goal:** web writes progress/sessions/mistakes documents BYTE-IDENTICAL to
the app's `progressService.recordExamSession` / `recordPracticeSession` /
`recordFlashcardSession`.
**Method (interim fallback, approved):** a web `progressService` copying the
app's record shapes, plus SHARED fixture tests: JSON fixtures of (session
input → expected document) generated from the app repo's service, asserted
equal in both repos. The fixtures live in both repos; any app-side change
breaks the web test loudly.
**Forbidden:** "writing what looks right"; any deviation in field names,
rounding, timestamps semantics, or mistakes-hook behavior.
**Acceptance:** fixture suite green in both repos (paste both outputs);
Codex diff-review of the two services side by side; one real end-to-end
session on the test account verified in Firestore console by Anusha.

### M5 [STANDARD] — Signed-in study surfaces: practice, exam, flashcards

> **Added by Anusha, 2026-07-16.** The original milestone list had no owner for
> the three core study players or for signed-in question/flashcard delivery — a
> leftover from the pre-reset product, where those screens already existed. This
> milestone owns them, and inherits the `/app` nudge/wall wiring deferred from
> M2 (see the M2 scope amendment).

**Goal:** the §1 signed-in free-tier rhythm live on real surfaces.
**Steps:**
1. Runtime, signed-in-only delivery of the app's fixed 20 free questions per
   chapter (`isFree: true`) and the full flashcard deck — read client-side
   after auth, NEVER written into the static export (§0.5, §0.6; the leak gate
   stays green and question text never reaches `out/`).
2. `/app/practice` and `/app/exam` players: PORT the ordering/draw from the
   app's `quizEngine` (`orderPracticeSet`, `drawExamSet`, `capFreeQuestionSet`)
   with fixture tests pinning them to app values. Never re-derive.
3. `/app/flashcards` player, tracking distinct card reveals through
   `countDistinctReveals`.
4. Wire the M2 machinery at these render sites, consuming
   `src/lib/nudgeGates.ts` and the M2 components VERBATIM (never re-derive gate
   logic): practice Q11 nudge; exam pre-start nudge with the exam NEVER
   interrupted after it starts; flashcard nudges at 15/30/45 distinct reveals
   (max 3, rotating copy); and the free-user Q21+ deep link rendering
   `<UpgradeWall>` — unbypassable client-side.
5. Wiring tests: zero nudges anywhere for `isPaid` users; the same nudge never
   fires twice in one run.
**Forbidden:** writing progress/sessions/mistakes by any path other than the M4
service; any question text in the static export; re-deriving gate logic.
**Acceptance:** gates green; quizEngine fixture tests vs app values committed;
a free-user deep link to Q21 renders the wall; screenshots of each nudge point
and the wall on the real surfaces at 375px and 1440px.

### M6 [STANDARD] — Free mock + mistakes + progress surfaces
**Goal:** wire `/app/mock` (assembly ported from app `mockService.js` with
fixture tests; one-free-ever counter read/write through the M4 service
only), `/app/mistakes`, `/app/progress` to live data.
**Also (inherited from M2):** the mock RESULTS screen carries the premium
pitch block; wiring tests assert NO nudge renders during a mock run or in the
mistakes deck — both are zero-nudge surfaces per §1.
**Acceptance:** gates green; mock draw fixture test vs app; counter
verified cross-platform by Anusha (use the free mock on web test account →
app shows it consumed).

### M7 [STANDARD] — Visual/voice polish pass
Homepage per the design document; empty/error/loading states; keyboard
operation; 375/1440 sweep; Anusha's voice pass replaces WORKING copy;
E-1/E-2 prompts run on all public copy. **Acceptance:** screenshot set +
copy diff for Anusha.

### M8 [SENSITIVE] — Razorpay checkout (HIGH RISK — the strictest review)
**Where:** the Cloud Functions live in the APP repo's `functions/`
workspace (one repo for all entitlement writers), region `asia-south1`.
**Flow:** `/app/upgrade` → CF `createRazorpayOrder` (verifies auth, binds
uid + server-side amount ₹250, returns order id) → Razorpay hosted checkout
→ signed webhook → CF verifies the HMAC signature against the webhook
secret, verifies amount and currency, idempotent on payment id → writes the
purchase record + recomputes `isPaid` (source `razorpay`) via the SAME
recompute path the Play chain uses → client listener flips. Refund webhook
→ revoke via the same recompute.
**Hard rules:** secrets only in Functions secret config (Anusha sets them —
never in chat, never in the repo); signature verification before ANY read
of the payload body fields; idempotent writes (replayed webhook = no-op);
client never told it is paid except by the Firestore listener; test-mode
keys until Anusha's explicit live-key step. Follow the security checklist
in the review protocol §5 line by line.
**Acceptance:** full test-mode E2E (pay, flip, refund, revoke, webhook
replay, tampered signature rejected — each evidenced); Codex security
review with ZERO open blockers; Anusha approves live keys separately.

### M9 [STANDARD + ANUSHA] — Preview, release review, cutover
Full gates; deploy to the approval-gated Firebase preview channel (runbook
already in repo); Anusha device pass (phone + laptop); Codex release
review; the Play "Payments" policy re-read side by side with the app's
paywall copy (HUMAN step, every time); production cutover only on Anusha's
explicit go, as its own approval.

---

## 3. Session prompts for Anusha (paste verbatim)

**Milestone session (orchestrator) — THE standard prompt. Fire this for every
milestone; nothing in it changes but the number.**
> Read `docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md` in full, then CLAUDE.md,
> `docs/ARNREADY_WEBSITE_DESIGN_DOCUMENT.md`, and
> `docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md` (§3 generic checks plus its §4
> checklist for THIS milestone). Orchestrate Milestone M<n>.
>
> Read the milestone's spec AND any dated scope amendments attached to it
> before you plan — an amendment overrides the original text.
>
> Execution model, per "Who does what": for a [STANDARD] milestone drive
> executor SUBAGENTS one atomic step at a time, reviewing each diff and
> re-running the §0.11 gates before releasing the next; for a [SENSITIVE]
> milestone execute the core yourself, delegating only mechanical sub-parts at
> your discretion and keeping the sensitive core in your own hands.
>
> Respect every §0 global rule, especially the stop conditions. Build to the
> review protocol's §4 checklist for this milestone line by line — that is
> exactly what Codex will audit. Make no product or design decision the manual
> does not already decide; stop and ask me instead.
>
> **Before you write any code, work out what you need from me, and ask.** From
> the milestone spec, its amendments, and the §0 stop conditions, determine:
> config or secrets you need; test accounts, uids, or devices; any new
> dependency (a §0.10 stop condition until I approve it); any decision the
> manual does not already make; and any step I must perform myself — Firebase,
> Play or Razorpay console work, secrets, a device pass, an approval. Put that
> list to me, then PAUSE.
>
> Where I have to do something by hand, walk me through it ONE STEP AT A TIME,
> wait for me to confirm each step is done, and only resume the build once the
> prerequisites are genuinely in place. Never guess a value, invent a
> placeholder, or work around a missing prerequisite.
>
> When done, run all §0.11 gates, commit as `M<n>: <summary>` on `web-product`,
> and produce the evidence packet defined in review protocol §2 as
> `docs/review-packets/M<n>_PACKET.md`. Do NOT edit
> `docs/ARNREADY_WEBSITE_REVIEW_LOG.md` — Codex owns it.

**Codex review session (paste to start a review):**
> You are reviewing milestone M<n> of the ARNReady website (`web-product`
> branch). Read, in order: `docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md` (the
> canon — §0 global rules, §1 product model, and the M<n> spec),
> `docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md` (§3 generic checks and the M<n>
> checklist in §4), and `docs/review-packets/M<n>_PACKET.md`. Then review
> `git diff main...web-product -- <changed files listed in the packet>` (or the
> milestone commit) against the spec. Independently re-run the §3 verification
> commands — do NOT trust the packet's pasted outputs. Report findings as:
> BLOCKER (violates a §0 rule, a locked formula, security, or the milestone
> spec), SHOULD-FIX (correctness/robustness), NIT. For each: file:line, the
> defect, a concrete failure scenario, and the fix. End with a verdict:
> APPROVE / APPROVE AFTER FIXES / REJECT.
>
> Edit no file while reviewing. `docs/ARNREADY_WEBSITE_REVIEW_LOG.md` is the
> one file you write, you own it, and it is the only file you ever update —
> never an implementation file, an evidence packet, or a canon document.
> Immediately after returning the verdict, record the complete finding list
> there, in the order returned, before any remediation begins; then commit that
> log yourself (review protocol §6.1, §6.3, §6.4).

**Remediation session (orchestrator, after Codex review):**
> Read the manual, then `docs/review-packets/M<n>_PACKET.md` and the Codex
> findings I paste below. Fix every finding marked BLOCKER and SHOULD-FIX
> exactly as scoped; do not expand scope. Re-run all gates, amend the
> packet with a remediation log, commit as `M<n>-r: remediation`.
>
> Do NOT edit `docs/ARNREADY_WEBSITE_REVIEW_LOG.md` — Codex owns it and marks
> findings RESOLVED itself, after re-verifying them. Record what you fixed in
> the packet's remediation log instead. If a Codex review-log commit has landed
> since your last commit, do not amend it or fold your work into it: check
> `git log -1` before any `git commit --amend`.

---

## 4. Standing corrections to older docs

- CLAUDE.md "LOCKED web-side rules (9 Jul)": the access model (unsigned
  full free tier) and ad-gate description (Q11+Q16, banner ads) are
  SUPERSEDED by §1 of this manual. The app's canonical ad policy is
  `../ARNReady-App/documents/adgate-logic.md` (13 Jul).
- The old next-work-plan, execution plan, PRD, IA, and architecture docs
  were removed in the 13 Jul repo reset (recoverable at
  `pre-reset-snapshot`); §2 of this manual replaces them.
- Razorpay is APPROVED for integration (13 Jul) — "checkout coming soon"
  copy is required only until M8 ships.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
