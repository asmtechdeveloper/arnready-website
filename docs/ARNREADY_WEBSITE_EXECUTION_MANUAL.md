# ARNReady Website — Execution Manual (CANON)

**Status:** Approved by Anusha, 13 Jul 2026. This document is the CANONICAL
execution plan for the website. Where it disagrees with CLAUDE.md, the PRD,
the IA doc, or the old next-work-plan, THIS FILE WINS. It was written by
Fable as a handoff: the executing model (Sonnet/Opus) follows it exactly and
does not re-litigate decisions recorded here.

**Who does what:**
- **Sonnet** executes milestones marked [SONNET]. Wiring, pages, components.
- **Opus** executes milestones marked [OPUS]. Auth, entitlement, progress
  parity, Razorpay. Sonnet must STOP and tell Anusha to open an Opus session
  if a task drifts into [OPUS] territory.
- **Codex** reviews every milestone per `docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md`.
- **Anusha** approves each milestone, owns voice/copy, secrets, deploys.

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
twice in one run. Until M7 ships, the nudge CTA is dual: "Get the app" +
"Web checkout coming soon"; after M7 it becomes the Razorpay checkout.

---

## 2. Milestones

Execute strictly in order. One milestone = one session = one commit = one
Codex review = one Anusha approval. Do not start M(n+1) before M(n) is
approved.

### M1 [SONNET] — Public content layer
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
4. Retire `/questions` (redirect to `/chapters`); update sitemap.
5. Extend `scripts/check-paid-leak.mjs` to enforce the §0.6 budget,
   including "≤10 cards per chapter" and "zero question text in the export".
**Forbidden:** auth code, `/app/*` routes, any question rendering.
**Acceptance:** gates green; build output contains teaching + ≤10
cards/chapter and zero question text (paste the leak-gate output);
screenshots of one hub + one spoke at 375px and 1440px.

### M2 [SONNET] — Nudge component + free-gate wiring in the client product
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

### M3 [ANUSHA + OPUS] — Firebase Web App + auth/entitlement integration
**Anusha first:** register the Firebase Web App in the console (same
project as the app), hand the config to the session. No rules changes.
**Opus then:** wire Google sign-in end-to-end; entitlement store mirroring
the app's `entitlementStore` (read-only `isPaid` listener); the three
cancellable sign-in prompts; signed-out `/app` states. Integration-test
against the real project with a throwaway Google account: sign-in,
cancel-path, isPaid read for a known-paid test uid, sign-out.
**Acceptance:** recorded test matrix (sign-in/cancel/paid-read/sign-out ×
desktop/mobile); no `firestore.rules` diff; Codex security review passed.

### M4 [OPUS] — Progress parity port (the single-write-site problem)
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

### M5 [SONNET] — Free mock + mistakes + progress surfaces
**Goal:** wire `/app/mock` (assembly ported from app `mockService.js` with
fixture tests; one-free-ever counter read/write through the M4 service
only), `/app/mistakes`, `/app/progress` to live data.
**Acceptance:** gates green; mock draw fixture test vs app; counter
verified cross-platform by Anusha (use the free mock on web test account →
app shows it consumed).

### M6 [SONNET] — Visual/voice polish pass
Homepage per the design document; empty/error/loading states; keyboard
operation; 375/1440 sweep; Anusha's voice pass replaces WORKING copy;
E-1/E-2 prompts run on all public copy. **Acceptance:** screenshot set +
copy diff for Anusha.

### M7 [OPUS] — Razorpay checkout (HIGH RISK — the strictest review)
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

### M8 [SONNET + ANUSHA] — Preview, release review, cutover
Full gates; deploy to the approval-gated Firebase preview channel (runbook
already in repo); Anusha device pass (phone + laptop); Codex release
review; the Play "Payments" policy re-read side by side with the app's
paywall copy (HUMAN step, every time); production cutover only on Anusha's
explicit go, as its own approval.

---

## 3. Session prompts for Anusha (paste verbatim)

**Sonnet milestone session:**
> Read `docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md` in full, then CLAUDE.md
> and the design document. Execute Milestone M<n> EXACTLY as written —
> respect every global rule in §0, especially the stop conditions. When
> done, run all §0.11 gates, commit as `M<n>: <summary>` on `web-product`,
> and produce the evidence packet defined in
> `docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md` §2 as
> `docs/review-packets/M<n>_PACKET.md`.

**Codex review session:** see the review protocol §1 for its paste-prompt.

**Remediation session (after Codex review):**
> Read the manual, then `docs/review-packets/M<n>_PACKET.md` and the Codex
> findings I paste below. Fix every finding marked BLOCKER and SHOULD-FIX
> exactly as scoped; do not expand scope. Re-run all gates, amend the
> packet with a remediation log, commit as `M<n>-r: remediation`.

---

## 4. Standing corrections to older docs

- CLAUDE.md "LOCKED web-side rules (9 Jul)": the access model (unsigned
  full free tier) and ad-gate description (Q11+Q16, banner ads) are
  SUPERSEDED by §1 of this manual. The app's canonical ad policy is
  `../ARNReady-App/documents/adgate-logic.md` (13 Jul).
- `docs/ARNREADY_WEBSITE_NEXT_WORK_PLAN.md`: superseded by §2.
- Razorpay is APPROVED for integration (13 Jul) — "checkout coming soon"
  copy is required only until M7 ships.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
