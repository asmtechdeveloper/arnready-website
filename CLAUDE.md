# ARNReady Website — CLAUDE.md

> Rewritten clean on 13 Jul 2026 alongside the repo reset.
>
> **Canon hierarchy:**
> 1. `docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md` — THE canonical product
>    model and execution plan. Milestones, free-tier rules, nudge law,
>    global rules, stop conditions. If any doc (including this one)
>    disagrees with it, the manual wins.
> 2. `docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md` — how every milestone is
>    reviewed (Codex) before Anusha approves.
> 3. The APP repo (`../ARNReady-App/CLAUDE.md`) — ultimate source of truth
>    for LOCKED PRODUCT RULES: scoring formulas, gate positions, mock
>    weights, entitlement model, content pipeline. Its canonical ad policy
>    is `../ARNReady-App/documents/adgate-logic.md` (13 Jul: rewarded-only,
>    zero banners, single Q11 practice gate, exam pre-start gate,
>    flashcard reveal gates).
>
> **New session? Read:** (1) the execution manual in full, (2) this file,
> (3) `docs/ARNREADY_WEBSITE_DESIGN_DOCUMENT.md`, (4) whatever app-repo
> file the current milestone names.

## What this repository is

The arnready.com website and browser study product. Developer: Anusha
Murthy (ASM Tech). Remote: `github.com/asmtechdeveloper/arnready-website`
(separate repo from the app).

- **`main` is LIVE.** It serves the current GitHub Pages compliance/holding
  site (privacy, delete-account, support pages that Play Console links to).
  A push to `main` is a production deploy. Never commit to, merge to, or
  push `main` — cutover is a separate explicit Anusha approval (manual M9).
- **`web-product` is the working branch**, reset to a clean start on
  13 Jul 2026. The complete previous implementation is preserved READ-ONLY
  at git tag `pre-reset-snapshot` (`git show pre-reset-snapshot:<path>`).
  Consult it for reference; never restore from it wholesale.
- Target stack (built fresh per manual M0): Next.js App Router, TypeScript,
  Tailwind, static export on Firebase Hosting, Firebase Web SDK (Google
  sign-in), Zustand entitlement mirror. `scripts/export-content.mjs` and
  `scripts/check-paid-leak.mjs` are kept as-is and load-bearing.

## Product model (summary — manual §1 is the full canon)

Knowledge is free; mastery is earned; the web is ad-free.

- **Public, indexable:** chapter hubs (full chapter teaching from Firestore
  + 10 sampler flashcards) and concept-titled subtopic pages, plus standard
  pages. No questions in the public export — ever.
- **Signed in (Google), free:** all flashcards (gentle nudges at 15/30/45
  reveals, max 3/run); the app's fixed 20 free questions per chapter, same
  set for practice and exam (nudge before Q11, pre-start nudge on exam,
  wall at Q21+); one free mock per account EVER (cross-platform counter);
  mistakes deck and progress, nudge-free.
- **Paid (₹250 lifetime):** everything, zero nudges. Razorpay is approved
  for integration (manual M8); until it ships, premium CTAs say web
  checkout is coming soon and may point to the app.
- **Nudge law (Anusha, 13 Jul):** nudges pitch what premium ADDS — never
  relief from the nudge itself. Arnie delivers warmly; same nudge never
  twice per run.

## Non-negotiables (stable)

1. **The Play-policy fence (one-directional, absolute):** the website may
   sell freely and may link to the app; the Android app never links to or
   mentions web checkout. Before web checkout ships, a human re-reads the
   Play Payments policy beside the app's paywall copy. Every time.
2. **Firestore is the single content source** — questions, flashcards,
   chapter/subtopic teaching. Public pages are SSG'd FROM Firestore. No
   content is ever hardcoded in this repo; content changes ship only via
   the app repo's review/upload pipeline.
3. **`users/{uid}.isPaid` is server-write-only.** The web reads it via the
   entitlement store; only trusted Cloud Functions (Play chain, later
   Razorpay chain — both in the app repo's `functions/`) write it.
4. **Locked engine rules are ported, never re-derived:** scoring (free =
   correct ÷ max(10, attempted); paid = correct ÷ served), gate positions,
   mock assembly, free-mock-ever semantics — pinned to the app by fixture
   tests (manual M2/M4/M5/M6). Progress documents must be byte-identical to
   the app's `progressService` output.
5. **The leak gate** (`scripts/check-paid-leak.mjs`) blocks every build:
   teaching + ≤10 canonical cards per chapter public, zero question text
   in the static export.
6. **Domain shape:** `arnready.com/app` — path, not subdomain.
7. **Firestore rules changes:** none for MVP; any change is a stop
   condition requiring Anusha and the mirror-edit discipline.

## Design system (mirrored from the app)

Purple `#534AB7`, green `#1D9E75`, background `#F5F5F0` (never white),
amber `#F59E0B`, red `#EF4444` — via theme tokens only, no raw hex in
components. Nunito. Feather icons; **no emojis anywhere**. Arnie is a
PANDA (never "red panda"), static PNGs from `assets/`, one per surface,
celebrations only on genuinely earned moments. Voice: Anusha's — first
person, honest, warm, lightly funny, Indian, calm, never fear-based. All
copy ships WORKING until her voice pass; public copy passes the E-1 and
E-2 reviews (`docs/ARNREADY_WEBSITE_PROMPT_LIBRARY.md`). Every public page:
exactly one primary CTA + the footer disclaimer.

## Working arrangement (updated 16 Jul 2026 — orchestrated execution)

- **One orchestrator owns EVERY milestone** — the plan, the decomposition into
  atomic steps, the per-step diff review, and the gates. No milestone is ever
  handed wholesale to an executor agent (that produced a heavy defect load
  across M0/M1). **Anusha chooses which agent fills each role, per milestone**,
  from whatever is best available — the manual deliberately names no models.
- **[STANDARD]** milestones: the orchestrator delegates the mechanical build to
  executor SUBAGENTS, one atomic step at a time, reviewing each diff and
  re-running the gates before releasing the next.
- **[SENSITIVE]** milestones (auth/entitlement M3, progress parity M4, payments
  M8): the orchestrator executes the core itself; entitlement, payment, and
  Firestore write-shapes never leave its hands. High-stakes work must land
  before 6 Aug 2026 (subscription end).
- **Codex reviews every milestone** per the review protocol; the orchestrator
  produces the evidence packet in `docs/review-packets/`.
- **Anusha** owns approvals, voice, secrets, deploys, and all product
  decisions. Ask her before anything architectural the manual doesn't
  already decide.
- "Opus moment" in older docs is a SEVERITY label —
  dedicated review plus Anusha's explicit sign-off — not a model booking.

## The Jeeves Protocol (mirrored from the app repo)

Anusha is the visionary founder; the assistant is the quietly competent
Jeeves. Indian-British humour, no hollow praise, celebrate wins without
cheese. "Aaram Haram Hai." "Earning your ARN should be fun" is the north
star. Arnie is a PANDA.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
