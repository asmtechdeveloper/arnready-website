# ARNReady Web — Architecture

**Status:** ARCHITECTURE v2 (9 July 2026). Full rewrite on Anusha's
9 Jul corrections — v1's "post-launch, static-baked content, fenced
payments" model is retired. This doc pairs with `ARNREADY_WEB_PRODUCT_
PRD.md` (WHAT), `ARNREADY_WEBSITE_INFORMATION_ARCHITECTURE.md` (WHERE),
`ARNREADY_WEBSITE_EXECUTION_PLAN.md` (WHEN), and the sibling app
repo's `CLAUDE.md` (locked product canon — always wins).

**What changed from v1**, in one sentence per section: §1 stack
unchanged, hosting decided (Firebase); §2 routes now under one domain
(`arnready.com/app`, not a subdomain); §3 content source rewritten
(Firestore, single, public included); §7 shared-core extraction is the
FIRST engineering task (not the post-launch one); §10 fence LIFTED,
Razorpay decided; §14 deployment updated for path-based `/app`; §15
build order un-gated from app launch.

---

## 1. Stack recommendation

**One Next.js (App Router) codebase** in this repo, replacing the
static scaffold when Web-1 starts:

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js, App Router | public pages pre-rendered (SEO), authed `/app/**` client-rendered — one repo, one deploy, one mental model for a solo founder |
| Auth/data | Firebase **Web** SDK (`firebase` npm pkg) | same project, same Auth/Firestore as the app; NOT `@react-native-firebase` |
| Styling | Tailwind (recommended) with tokens mirroring `theme.js`; CSS Modules is fine if the builder prefers | tokens must match the app; no design-system dependency; keep it boring |
| State | zustand (matches app's `entitlementStore` pattern) | familiarity across codebases |
| Hosting | **Firebase Hosting** (web-frameworks support for Next.js) — DECIDED 9 Jul | one console with the app's Firestore/Auth/Functions; one billing surface; the domain-shape decision (`arnready.com/app`, §2) makes Vercel's edge advantages moot since there's no subdomain to split |

Rejected: separate Astro-marketing + SPA-app split (two codebases,
styling drift); any CMS (Firestore IS the content store, §3);
Remix/SvelteKit (fine tech, unfamiliar stack = maintenance risk for a
solo team).

## 2. Route groups

**Domain shape (DECIDED 9 Jul, Anusha):** `arnready.com/app` — path,
not subdomain. One domain, one deploy, one SSL cert, no
cross-subdomain cookie/auth fuss. SEO authority concentrates: every
share of `arnready.com/app/mock` reinforces the same domain the
chapter pages, book QR, and YouTube descriptions build.

- **Public (pre-rendered):** `/`, `/nism-series-v-a`, `/syllabus`,
  `/chapters`, `/chapters/[chapter]`, `/mock-test`, `/flashcards`,
  `/questions`, `/pricing`, `/book`, `/youtube-course`, `/about`,
  `/faq`, `/privacy`, `/delete-account`, `/support`.
- **Authenticated (client):** `/app`, `/app/flashcards`,
  `/app/practice`, `/app/practice/[chapter]`, `/app/exam/[chapter]`,
  `/app/mock`, `/app/mock/[attempt]`, `/app/results/[session]`,
  `/app/mistakes`, `/app/progress`, `/app/account`, `/app/upgrade`.

Per-route detail: `ARNREADY_WEBSITE_INFORMATION_ARCHITECTURE.md`.
Compliance URLs (`/privacy`, `/delete-account`, `/support`) are in
Play Console once launched — never rename or move.

## 3. Content source of truth (REWRITTEN 9 Jul)

**Firestore is the single source for ALL content, public pages
included.** No hand-maintained duplicates in the repo, no CMS, no
"curated static set". A reviewed correction propagates to the app, the
web product AND the public pages from one place. Content review /
upload pipeline (`../../ARNReady-App/docs/CONTENT_REVIEW_AND_UPLOAD_
RUNBOOK.md`) is unchanged and stays the ONLY way content ships.

**Public pages are pre-rendered FROM Firestore.** Two supported
implementations (either is fine — pick at Web-1 build time based on how
often content changes vs how fast the build must be):

1. **Build-time SSG with revalidation.** `generateStaticParams` +
   Next.js `revalidate` (ISR). Fresh at build; refreshes on a schedule
   without a full redeploy.
2. **Server-side rendering with the Firebase Admin SDK.** Public pages
   read via admin credentials at request time (bypassing client rules).
   Fresher, more infra, and the read cost lands on every request —
   viable if content changes daily, not weekly.

Marketing copy stays in page files (per the copy scaffold rules).

### 3.1 Unsigned reads — the real problem

Client-side Firebase reads from a public page fail today because
deployed rules require auth for `questions` (§4). Two supported
solutions (Opus decision — rules semantics are LOCKED, mirror-edit
discipline only):

- **Firebase anonymous auth.** Each unsigned visitor gets an anon uid
  that satisfies the "signed-in" rules and upgrades cleanly to Google
  sign-in when they choose. Cleanest for a client-heavy Next.js app;
  matches the IA doc §1 access model.
- **Server-side delivery with the Admin SDK.** Public pages render on
  the server with elevated credentials; the client never touches
  Firestore for public content. No client SDK for public routes at all.

The IA doc §1 access model wins the tie unless the shared-core
extraction (§7) surfaces a reason to prefer the other. Per-account
surfaces still require sign-in (progress, mistakes deck, baseline,
`isPaid`, one-free-mock-EVER counter — those are per-account by locked
rule).

## 4. Data model assumptions (web consumes, never redefines)

- Questions: JSON v3 (10 fields) + `isSeed`/`seedId` in Firestore. All
  engine rules (seed groups, never seed+variation together, no
  `id == seedId` Firestore queries) apply verbatim on web.
- Flashcards: grouped by subtopic, `cardType` concept|quick_recall|
  wisdom, always free.
- User tree `users/{uid}`: progress aggregates, session log, mistakes,
  baseline, mock history, `isPaid`. **Web writes the exact shapes
  `progressService` writes — see §7.**

## 5. Firebase Auth usage

- **Google provider** (parity with the app), via `signInWithPopup`
  with a `signInWithRedirect` fallback.
- **Anonymous auth** for unsigned visitors (§3.1 option 1), upgraded
  to Google via `linkWithPopup` when they sign in — same uid
  survives, so any progress the anon user accumulated persists.
- Same uid appears on both platforms once signed in — sync is free.
- Web sign-out clears the Firebase session and any cached local state
  (mirroring the app's both-sessions discipline in spirit).
- Session persistence: local (default). No email/password, no phone
  OTP (V2 fence in the app repo CLAUDE.md).

## 6. Firestore progress sync

Nothing to "sync" — both clients read/write the same documents. The
work is **schema fidelity**, not synchronisation plumbing. Web needs
live `isPaid` (snapshot listener, mirroring `entitlementStore`) and
progress reads for `/app/progress`.

**Offline:** web sessions require connectivity (state this in UI). No
Firestore web persistence in MVP — complexity vs benefit is a bad
trade at this stage, and mock tests running offline is a nightmare
we do not need.

## 7. The single-write-site invariant on web (the hardest problem — read twice)

The app's LOCKED rule: `progressService.recordExamSession` /
`recordPracticeSession` are the ONLY writers of progress (aggregates +
session log + mistakes hook). A web client writing slightly different
shapes silently corrupts the app's Prepometer, stats, and mistakes
deck.

**Strategy, in order of preference:**

1. **Extract the pure core into a shared package** (`packages/
   arnready-core/` in a workspace — either the app repo, this repo, or
   a new monorepo; Anusha decides): `quizEngine.ts` (already pure and
   tested), scoring functions, mock assembly weights/draw logic,
   progress-record *shape builders*. App and web both import it;
   Firestore I/O stays platform-specific (RN Firebase vs Web SDK)
   behind the same function names. **This is the FIRST Web-1
   engineering task — an Opus moment; do NOT do it casually.** It
   touches app imports, so plan it with the app's SOU + CLAUDE.md
   open.
2. Interim fallback (only if 1 is blocked): a web `progressService`
   that copies the record shapes, with **shared fixture tests**
   asserting both implementations produce byte-identical documents
   from the same session input. Drift caught by CI or not at all.

Never: option 3, "just write what looks right".

**9 Jul change:** v1 gated §7.1 on "after app launch"; that gate is
retired. Web-1 builds NOW; §7.1 is the sequencing constraint (do it
FIRST inside the Web-1 build), not a launch prerequisite.

## 8. Paid entitlement model

Unchanged and non-negotiable: `users/{uid}.isPaid`,
**server-write-only**, written exclusively by verification Cloud
Functions:
- Today: `verifyPurchase` (Play Billing) — written, held on Play
  Console setup.
- Web-3: a Razorpay webhook CF (see §10) — the ONLY other allowed
  writer.

The web client reads `isPaid` via a store mirroring `entitlementStore`.
No web code path may write `isPaid`. No second entitlement flag may
exist. Any change here is an **Opus moment** requiring Anusha's
explicit sign-off. Both CFs live in the app repo's `functions/`
workspace — one deploy pipeline for all `isPaid` writers.

## 9. Mock engine reuse

Mock rules are LOCKED (100Q/120min, `MOCK_CHAPTER_WEIGHTS`,
one-per-seedId, free-one-ever, non-reviewable, unanswered=0, no
negative marking). `mockService.js` assembly logic goes into the
shared package (§7.1); web adds only presentation: question palette,
keyboard nav, flag UI, timer.

**Free-mock-ever counter (cross-platform):** derived from the SHARED
Firestore mock history — one free mock per ACCOUNT across both
platforms, not one per platform. This is why the mock surface
REQUIRES sign-in on web even though other free content doesn't (§3.1
and IA doc §1 access model).

Incomplete web attempts are silently discarded, same as the app.

## 10. Payments — Razorpay web checkout, and the policy warning

> **⚠️ POLICY WARNING — read before any payments work. Unchanged from v1.**
> The Android app MUST continue using **Google Play Billing** for its
> in-app digital unlock. That is locked, and Play policy — not
> preference. A web checkout that unlocks the same entitlement is the
> Spotify/Netflix pattern and is generally permissible, **but only if
> the app behaves**:
> - The app must NEVER link to, mention, or steer users toward the web
>   checkout or web pricing (no "cheaper on our website", no URL in
>   the paywall, no "manage purchases on the web").
> - The app's paywall keeps exactly one purchase path: Play Billing.
> - Restore/entitlement language in-app stays payment-agnostic
>   ("your unlock is linked to your Google account").
> - Play's anti-steering rules shift with regulation (India CCI
>   rulings, user-choice billing programs). **Before building web
>   checkout, a human re-reads the current Play "Payments" policy and
>   the app's paywall copy side by side.** This is an Opus moment AND
>   an Anusha decision, every time the policy landscape moves.
> Getting this wrong risks app removal — the whole business. Treat
> this section as a gate, not advice.

### 10.1 Provider decision — Razorpay (LOCKED 9 Jul)

| Option | Verdict |
|---|---|
| **Razorpay → webhook → CF writes `isPaid`** | **DECIDED.** Built for exactly this: self-serve merchant onboarding in days, modern REST APIs + signed webhooks, hosted checkout with UPI/cards/netbanking/wallets native, solid docs, standard for Indian solo devs. |
| Cashfree | Runner-up if Razorpay onboarding ever stalls. |
| BillDesk | Enterprise/bank-oriented, sales-led onboarding, older integration surface — no. Its slowness on the Play payout approval for this account is itself the argument. |
| Stripe | Weaker UPI story for Indian consumers — no. |
| Payment links (no integration) + manual flip | Breaks server-write-only discipline with human hands in prod data — no. |

### 10.2 Flow

`/app/upgrade` → CF creates a Razorpay order bound to `uid` →
Razorpay hosted checkout → Razorpay webhook (signature-verified) → CF
validates → writes `isPaid = true` + a purchase record `{source:
"razorpay", orderId, paymentId, at, price}` → client `isPaid` listener
flips → user sees premium immediately.

**Non-negotiable properties of the webhook CF (Opus moment):**
- HMAC signature verification with the webhook secret from Functions
  config (never in client code).
- **Idempotent writes** — Razorpay retries webhooks; the CF must
  handle the same `paymentId` arriving N times without re-writing or
  double-recording.
- Region `asia-south1` (parity with `verifyPurchase`, `deleteAccount`).
- Secrets in Functions config, rotated on schedule.
- Refund path: webhook handles `refund.processed` → sets `isPaid =
  false` + logs the refund; the same idempotency rule applies.
- Error paths log to Cloud Logging with the `paymentId` for support
  reconciliation.

The webhook CF lives in the app repo's `functions/` workspace
alongside `verifyPurchase` — one CF codebase, one deploy pipeline for
all `isPaid` writers (§8).

### 10.3 The V2 fence

Lifted 9 Jul. Web checkout is the site's primary conversion CTA once
Web-3 ships. The policy review (this section, plus the app's paywall
audit) still gates every deploy — the fence lifted, the gate did not
retire.

## 11. Admin / content review

No admin web UI. Content review stays `npm run review:app` (in the app
repo) + the runbook. The only future admin candidate is a read-only
"content coverage" page, and even that is a nice-to-have. Resist the
admin-panel temptation — it's a second product.

## 12. Security rules considerations

- **Deployed rules already fit web reads:** users per-user; questions
  `isFree` OR `isPaid` (server-enforced); flashcards any signed-in
  user. The web client changes NOTHING here for MVP. Any rules change
  follows the locked mirror-edit discipline (`firestore.rules` ↔
  Console, same session) and is an Opus moment.
- **Anonymous auth users** (§3.1, §5) satisfy the "signed-in" clause
  in the current rules — no rules change needed to serve unsigned
  visitors via that path. Verify this on the deployed rules before
  committing to option 1.
- **App Check:** add for web (reCAPTCHA v3 provider) at Web-1 launch,
  and enforce across Firestore. Coordinate with the app repo — App
  Check enforcement is a project-wide setting.
- Accept honestly: a paid web user can scrape the bank from devtools
  (as a rooted phone can today). Mitigations (per-session fetch
  shapes, no bulk endpoints) are v2 hardening, not MVP blockers.
- Web checkout CFs: signature verification, idempotent writes, region
  `asia-south1`, secrets in Functions config — never in client code.

## 13. Analytics

**Web-1: ANUSHA-DECIDE — GA4 or nothing.** If yes, exactly four
events: `page_view`, `sign_in`, `session_completed` (params: mode,
chapter), `upgrade_view`. Web-3 adds `purchase`. Nothing else; no
session recording; privacy page discloses. The app keeps its
no-analytics stance — analytics here is WEB-only. **Decision default
in the absence of a call from Anusha: no analytics until Web-3
ships**, when purchase-attribution actually pays for the complexity.

## 14. Deployment

- **Stopgap (now):** the static site in the root of this repo
  (`index.html`, `privacy.html`, `delete-account.html`, chapter
  redirect stubs) on Firebase Hosting — `firebase deploy --only
  hosting` (NEVER bare `firebase deploy`; the app repo's
  `verifyPurchase` deploy is embargoed).
- **Web-1 onwards:** Next.js on Firebase Hosting (web-frameworks
  support). Same command, richer output. Preview channels for review
  (`firebase hosting:channel:deploy`).
- **Domain:** `arnready.com` apex serves one codebase; `/app/**`
  routes to the authed shell; compliance URLs keep their exact paths
  forever (they'll be — or already are — in Play Console).
- **CI:** lint + typecheck + shared-package tests + build must pass
  before deploy; gates never weakened (house rule mirrored from the
  app repo).
- **Firebase project:** same as the app. One `.firebaserc`, one
  Console, one billing surface.

## 15. Recommended build order (maps to the execution plan)

**No app-launch gate.** Web-1 builds now (Anusha, 9 Jul); the app's
content-review + QA critical path still owns Anusha's own hours.

| Step | Scope | Gate to start |
|---|---|---|
| 0 | Finish + deploy static compliance pages (privacy, delete-account, support) | before Play submission (this is the only APP-launch-gating web work) |
| 1 | **Shared-core package extraction** (`quizEngine`, scoring, mock assembly, record shape builders) + fixture tests | Opus session; touches app imports; do FIRST inside Web-1 |
| 2 | Next.js shell: public pages (IA doc MVP set), migrate compliance URLs 1:1 | step 1 not required (public pages don't touch the engine) |
| 3 | Auth (Google + anonymous) + `/app` + flashcards | steps 1–2 |
| 4 | Chapter practice + progress writes + `isPaid` read (app-paid users get web) | step 3 + fixture tests green |
| 5 | Exam mode + laptop mock + results | step 4 |
| 6 | Web checkout | Razorpay onboarding done (Anusha) + §10 policy review done (Opus + Anusha) |

*ARNReady · ASM Tech · arnready.com*
