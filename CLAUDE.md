# ARNReady Website — CLAUDE.md

> **⚠ 13 Jul 2026 CORRECTION (Anusha-approved):** the product model changed.
> `docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md` is now the CANONICAL execution
> plan and product model; where this file's "LOCKED web-side rules (9 Jul)"
> section (access model, ad gates, checkout timing) disagrees with the
> manual, THE MANUAL WINS. The app's ad policy also changed: canonical is
> `../ARNReady-App/documents/adgate-logic.md` (rewarded-only, single Q11
> practice gate, exam pre-start gate, zero banners). Razorpay is approved
> for integration now. Reviews follow
> `docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md`.

> **This file owns STABLE, LOCKED knowledge for the WEBSITE project.**
> Current state and roadmap live in `docs/ARNREADY_WEBSITE_EXECUTION_PLAN.md`.
> On *current state* the execution plan wins; on *locked rules* this file
> wins.
>
> **Cross-project canon.** The APP repo
> (`../ARNReady-App/CLAUDE.md`) is the ultimate source of truth for
> LOCKED PRODUCT RULES (scoring formulas, gate sequence, mock weights,
> engine rules, entitlement model, brand tokens, content pipeline). Read
> it any time you're touching parity, entitlement, or engine logic. It
> outranks this file wherever they disagree.
>
> **New session? Read in this order:** (1) this file, (2)
> `docs/ARNREADY_WEBSITE_EXECUTION_PLAN.md`, (3) the app repo's
> `CLAUDE.md`, (4) `docs/ARNREADY_WEB_PRODUCT_PRD.md`, (5)
> `docs/ARNREADY_WEBSITE_DESIGN_DOCUMENT.md`, then (6) the doc you need
> for the current task (IA, copy scaffold, architecture, prompt library,
> or the shared strategy/repurposing docs).

## What this is

The arnready.com website and browser study product. The repository currently
has two implementations with different deployment states:

1. **Live on `main`:** the static GitHub Pages compliance/holding site.
   A push to `main` is a production deploy; never merge or push casually.
2. **Built on `web-product`:** the Next.js public site and `/app` study
   product: practice, chapter exams, flashcards, a laptop mock, mistakes,
   progress, account, and upgrade surfaces. It is not yet the live site.
   Firebase Hosting config and an approval-gated preview/cutover runbook exist.

Web checkout (Razorpay) remains a later Web-3 milestone. Until it ships,
pricing and upgrade copy must say that checkout is coming soon.

Developer: Anusha Murthy (ASM Tech). Deployed at arnready.com.
Registry/remote: `github.com/asmtechdeveloper/arnready-website` (this
folder IS the git repo — separate from the app repo).

## Architecture — CURRENT `web-product` branch

One **Next.js (App Router)** codebase, TypeScript, React, Tailwind CSS,
Firebase Web SDK, Zustand, and a static export for classic Firebase Hosting.
Build-time exported content contains free questions/flashcards only and is
guarded by `scripts/check-paid-leak.mjs`. Route groups:
- **Public (SSG, generated FROM Firestore):** `/`, `/nism-series-v-a`,
  `/syllabus`, `/chapters`, `/chapters/[chapter]`, `/mock-test`,
  `/flashcards`, `/questions`, `/pricing`, `/about`, `/faq`, `/privacy`,
  `/delete-account`, `/support`. `/book` and `/youtube-course` remain planned.
- **Product (client-rendered; not every route requires Google sign-in):**
  `/app`, `/app/flashcards`, `/app/flashcards/[chapter]`,
  `/app/practice`, `/app/practice/[chapter]`, `/app/exam/[chapter]`,
  `/app/mock`,
  `/app/mistakes`, `/app/progress`, `/app/account`, `/app/upgrade`.

Auth: Firebase Web SDK, Google provider — same Firebase project as the
app, same uid, same Firestore documents. NOT `@react-native-firebase`.
State: Zustand (matches app's `entitlementStore` pattern). Auth and
entitlement code exists but still needs a registered Firebase Web App and
integration testing. Full architecture: `docs/ARNREADY_WEB_ARCHITECTURE.md`.
Visual and interaction contract:
`docs/ARNREADY_WEBSITE_DESIGN_DOCUMENT.md`.

## LOCKED web-side rules (9 Jul)

### Domain shape
`arnready.com/app` — path, not subdomain. One domain, one deploy, one
SSL cert, no cross-subdomain auth. SEO authority concentrates on one
domain. **Locked.**

### The Play-policy fence (ABSOLUTE — both directions)
- The **APP** (Android) never links to, mentions, or steers to web
  checkout or web pricing. Ever. Under any wording. This is a Play
  policy line — violation risks app removal. The app's paywall keeps
  exactly one purchase path: Play Billing.
- The **WEBSITE** may sell freely. Web pages MAY say "also available
  in the app". App screens NEVER say "buy on the website" or link to
  `/pricing` or `/app/upgrade`.
- Before shipping web checkout, a human re-reads the current Play
  "Payments" policy and the app's paywall copy side by side. Every
  time. This is an Opus moment AND an Anusha decision.

### Web parity with the app (locked, 9 Jul)
The web mimics the app in ALL respects:
- **Same free/paid rules**: Q1–10 free → rewarded ad → 11–15 →
  rewarded ad → 16–20 → paywall; free cap 20 questions/chapter; one
  free mock per ACCOUNT ever (cross-platform counter).
- **Same scoring** (LOCKED — the honesty core): free = `correct ÷
  max(10, attempted)`; paid = `correct ÷ questions served`. Never
  compare the two.
- **Same modes**: practice, exam, mock, flashcards, mistakes deck,
  baseline, Today's-Focus.
- **Ads**: free users see ads; paid users see none; no ads on the
  upgrade/paywall page.
- **isPaid**: `users/{uid}.isPaid`, SERVER-WRITE-ONLY. Web reads it
  via a store mirroring `entitlementStore`. Only trusted purchase-state
  Cloud Functions write it: today the deployed Play verification/revocation
  chain; later the Razorpay verification/refund chain too.

Only two categories may differ from the app: **web-additive** surfaces
(SEO/course pages, keyboard mocks, question palette on big screens)
and **platform-tech deltas** (no local notifications; the rewarded-ad
equivalent for the Q11/Q16 unlocks needs a web ad format — open item
for Web-1, never solved by weakening the gate order). Full rule:
PRD §7.

### Content source of truth
**Firestore is the single content source** — for the product AND for
public pages. Questions, flashcards, chapter meta all live in the same
Firestore collections the app reads. Public pages are pre-rendered
(SSG) FROM Firestore at build or server-render time — never
hardcoded, never duplicated in this repo. Content review pipeline
stays in the app repo (`../ARNReady-App/scripts/`, `docs/CONTENT_
REVIEW_AND_UPLOAD_RUNBOOK.md`) and is the ONLY way content ships.

### Access model (unlike the app)
Unsigned visitors get the FULL free tier — real free questions, all
flashcards, real chapter practice. Sign-in (Google) is prompted at
natural moments but always cancellable; cancel → keep studying free,
nothing persisted. Sign-in buys **persistence and identity**, not
access: progress, mistakes deck, baseline, `isPaid`, and the
one-free-mock-EVER counter are per-account (locked rules), so those
surfaces require sign-in — an unsigned visitor cannot take the free
mock or the counter breaks.

Implementation options (Opus decision, deployed Firestore rules are
LOCKED — mirror-edit discipline only): Firebase anonymous auth (each
unsigned visitor gets an anon uid that upgrades cleanly to Google
sign-in) OR server-side delivery with admin credentials.

### Web checkout (Web-3)
Provider: **Razorpay** (decided 9 Jul). Flow: `/app/upgrade` →
Razorpay order (CF creates order, binds uid) → hosted checkout → signed
webhook → CF validates → writes purchase state and recomputes `isPaid`
(source: "razorpay") → client listener flips. Signature verification, idempotent
writes, region asia-south1, secrets in Functions config. This CF is an
**Opus moment** and lives in the app repo's `functions/` workspace
alongside the Play verification/revocation Functions — one repo for all
entitlement writers, one deploy pipeline.
Runner-up if Razorpay ever stalls: Cashfree.

### The single-write-site invariant (the hardest problem)
The app's LOCKED rule: `progressService.recordExamSession` /
`recordPracticeSession` are the ONLY writers of progress (aggregates +
session log + mistakes hook). A web client writing slightly different
shapes silently corrupts the app's Prepometer, stats, and mistakes deck.

**Strategy (Opus moment; do NOT do it casually):**
1. **Preferred:** extract the pure core into a workspace package (in
   the APP repo or a new monorepo — Anusha decides): `quizEngine.ts`
   (already pure, tested), scoring functions, mock assembly, progress
   record shape builders. App and web both import. This is the first
   Web-1 engineering task.
2. **Interim fallback (only if 1 is blocked):** a web `progressService`
   that copies record shapes, with SHARED fixture tests asserting both
   implementations produce byte-identical documents from the same
   session input.
3. Never option 3: "just write what looks right".

### Firestore rules
Deployed rules already fit web reads: users per-user; questions
`isFree` OR `isPaid` (server-enforced); flashcards any signed-in user.
Web changes NOTHING here for MVP. Any rules change follows the
locked mirror-edit discipline (`firestore.rules` ↔ Console, same
session) and is an Opus moment. App Check (reCAPTCHA on web) ships
with Web-1.

## Design system (mirrored from the app — CI-enforced there)

- **Colors**: purple `#534AB7`, green `#1D9E75`, bg `#F5F5F0` (never
  white), amber `#F59E0B`, red `#EF4444`. Mirror the app's theme
  tokens; when Web-1 ships, share tokens with the app in the shared
  core package.
- **No emojis** anywhere — Feather icons only (equivalent web package).
- **Font**: Nunito, same as the app.
- **Arnie**: static PNGs (8 moods, in the app repo `assets/`); rendered
  once per surface; celebrations rationed (only on real earned moments).
  Arnie is a PANDA. Never write "red panda". The black blob was NOT Arnie.
- **Voice**: Anusha's — first person, honest, warm, lightly funny,
  Indian, calm; never fear-based. Copy scaffold (`docs/ARNREADY_
  WEBSITE_COPY_SCAFFOLD.md`) is canonical; every public artefact ships
  WORKING until her voice pass.

## Working arrangement and model policy (13 Jul, Anusha)

"Opus moment" / "Opus session" throughout this doc set is a SEVERITY
label, not a model booking. It marks the highest-stakes work — the kind
that gets a dedicated review and Anusha's explicit sign-off.

**Codex builds the website. Claude reviews Codex's completed milestones.**
Anusha owns product decisions, voice approval, policy calls, and deployment.
Codex implements and verifies; Claude returns prioritised, file-specific
findings; Codex remediates accepted findings. Do not have both agents edit the
same files concurrently. Handoffs include scope, changed files, tests,
screenshots for visual work, known limitations, and Anusha decisions.

**Fable access is limited and must be rationed.** Until the app advertising
work is complete, do not use Fable for routine website implementation, copy,
documentation, styling, or standard reviews. Afterwards, batch Fable use only
for genuinely high-risk moments: shared-core/cross-repo parity, auth and
Firestore write/rules changes, entitlement, Razorpay/payment security, hosting
cutover/final release audit, or a design-system decision Anusha explicitly
escalates. Routine website work continues with Codex plus Claude review.

## Process rules

1. Read this file + the execution plan + the app repo's CLAUDE.md before
   any task.
2. Follow `docs/ARNREADY_WEBSITE_DESIGN_DOCUMENT.md` for visual,
   interaction, accessibility, and review-handoff rules.
3. Public copy passes E-1 (fake-claims) + E-2 (affiliation-risk)
   reviews (prompt library) before ship.
4. Every public page ends with ONE primary CTA; footer disclaimer on
   every page.
5. The Android app never links to or mentions web checkout — absolute.
6. Locked engine rules (scoring, gates, mock weights/draw,
   free-mock-ever) must never be re-derived. Until shared-core extraction,
   the interim web port stays pinned to the app with cross-repo fixture tests;
   after extraction, both products import the shared core.
7. Ask Anusha before architectural decisions; flag Opus moments
   explicitly (shared-core extraction, webhook CF, rules changes,
   payments work).
8. Batch Claude review at coherent milestones; do not spend Fable merely to
   repeat a standard review.

## The Jeeves Protocol (mirrored from the app repo)

Anusha is the visionary founder; Claude is the quietly competent
Jeeves. Indian-British humour, no hollow praise, celebrate wins without
cheese. "Aaram Haram Hai." "Earning your ARN should be fun" is the
north star. Arnie is a PANDA.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
