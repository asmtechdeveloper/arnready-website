# ARNReady Web — Architecture

**Status:** ARCHITECTURE v1 (7 July 2026, Fable — corrected direction).
Replaces the retired static-site architecture doc: requirements changed
from "compliance pages + brochures" to a real authenticated product
(`ARNREADY_WEB_PRODUCT_PRD.md`), so the stack answer changes too. The
existing static compliance pages remain valid AS the pre-submission
stopgap; ARNReady Web absorbs those URLs unchanged when it ships.

> **v2 PASS NEEDED (flagged 9 Jul).** This doc predates Anusha's 9 Jul
> corrections and contradicts the v2 PRD/IA in places. Known stale spots —
> the PRD/IA win wherever they disagree:
> - §3 "public-page sample questions: a static set baked into the repo" —
>   OVERRULED: Firestore is the single content source for ALL content,
>   public pages included (IA doc §1); public pages are pre-rendered FROM
>   Firestore. The unsigned-read problem is real — solve via anonymous
>   auth or server-side rendering with admin credentials (IA doc access
>   model), an Opus decision.
> - §7.1 / §15 "after app launch" gates — RETIRED: Web-1 builds NOW
>   (`ARNREADY_WEBSITE_EXECUTION_PLAN.md`); the shared-core extraction is
>   still the first Opus session.
> - §10 web checkout: fence LIFTED 9 Jul; provider DECIDED — Razorpay.
>   The policy warning itself stands, every word.
> - §13 GA4 remains ANUSHA-DECIDE. Domain: `arnready.com/app` decided 9 Jul.
> The stack recommendation (§1), parity strategy (§7), entitlement model
> (§8), and mock reuse (§9) remain current. Do the full v2 rewrite before
> Web-1 coding starts.

---

## 1. Stack recommendation

**One Next.js (App Router) codebase** in `website/` (replacing the static
scaffold when Web-1 starts):

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js, App Router | public pages statically generated (SEO), authed `/app/**` client-rendered — one repo, one deploy, one mental model for a solo founder |
| Auth/data | Firebase **Web** SDK (`firebase` npm pkg) | same project, same Auth/Firestore as the app; NOT `@react-native-firebase` |
| Styling | plain CSS Modules or Tailwind (builder's call), tokens mirroring `theme.js` | no design-system dependency; keep it boring |
| State | zustand (matches the app's `entitlementStore` pattern) | familiarity across codebases |
| Hosting | Firebase Hosting (web frameworks support) or Vercel | Firebase keeps one console; Vercel is fine too — DECIDE at build time, both trivial |

Rejected: separate Astro-marketing + SPA-app split (two codebases, shared
styling drift); any CMS (content truth is Firestore + repo, §4); Remix/
SvelteKit (fine tech, unfamiliar stack = maintenance risk for this team).

## 2. Route groups

- **Public (SSG):** `/`, `/nism-series-v-a`, `/syllabus`, `/chapters`,
  `/chapters/[chapter]`, `/mock-test`, `/flashcards`, `/questions`,
  `/pricing`, `/book`, `/youtube-course`, `/about`, `/faq`, `/privacy`,
  `/delete-account`, `/support`.
- **Authenticated (client):** `/app`, `/app/flashcards`, `/app/practice`,
  `/app/practice/[chapter]`, `/app/exam/[chapter]`, `/app/mock`,
  `/app/mock/[attempt]`, `/app/results/[session]`, `/app/mistakes`,
  `/app/progress`, `/app/account`, `/app/upgrade`.
Per-route detail: `ARNREADY_WEBSITE_INFORMATION_ARCHITECTURE.md`.

## 3. Content source of truth

- **Questions + flashcards: Firestore, same collections the app reads.**
  Web adds no content store, no duplication, no CMS. Content review/upload
  pipeline (`CONTENT_REVIEW_AND_UPLOAD_RUNBOOK.md`) is unchanged and stays
  the ONLY way content ships.
- **Public-page sample questions: a small curated static set baked into
  the repo** (hand-picked, reviewed, `isFree` items only). Public pages
  cannot read Firestore (rules require sign-in) and should not — build-time
  content is faster, cacheable, and can't leak. Refresh it manually,
  rarely.
- Marketing copy: in the page files, per the copy scaffold rules.

## 4. Data model assumptions (web consumes, never redefines)

- Questions: JSON v3 (10 fields) + `isSeed`/`seedId` in Firestore. All
  engine rules (seed groups, never seed+variation together, no
  `id == seedId` Firestore queries) apply verbatim on web.
- Flashcards: grouped by subtopic, `cardType` concept|quick_recall|wisdom,
  always free.
- User tree `users/{uid}`: progress aggregates, session log, mistakes,
  baseline, mock history, `isPaid`. **Web writes the exact shapes the
  app's `progressService` writes — see §7.**

## 5. Firebase Auth usage

Google provider only (parity with the app), via `signInWithPopup` with a
`signInWithRedirect` fallback. Same uid appears on both platforms — sync
is free. Web sign-out mirrors the app's both-sessions discipline in
spirit: clear Firebase session + any cached local state. Session
persistence: local (default). No email/password, no phone OTP (V2 fence).

## 6. Firestore progress sync

Nothing to "sync" — both clients read/write the same documents. The work
is **schema fidelity**, not synchronisation plumbing. Web needs live
`isPaid` (snapshot listener, mirroring `entitlementStore`) and progress
reads for `/app/progress`. Offline: web sessions require connectivity
(state this in UI); no Firestore web persistence in MVP (complexity vs
benefit).

## 7. The single-write-site invariant on web (the hardest problem — read twice)

The app's LOCKED rule: `progressService.recordExamSession` /
`recordPracticeSession` are the ONLY writers of progress (aggregates +
session log + mistakes hook). A web client writing slightly different
shapes silently corrupts the app's Prepometer, stats, and mistakes deck.

**Strategy, in order of preference:**
1. **Extract the pure core into a shared workspace package**
   (`packages/arnready-core/`): `quizEngine.ts` (already pure, tested),
   scoring functions, mock assembly weights/draw logic, progress-record
   *shape builders*. App and web both import it; Firestore I/O stays
   platform-specific (RN Firebase vs Web SDK) behind the same function
   names. This is a refactor of app imports — **an Opus moment; do not do
   it casually mid-launch; schedule it as the first Web-1 engineering
   task, after app launch.**
2. Interim fallback (only if 1 is blocked): a web `progressService` that
   copies the record shapes, with **shared fixture tests** asserting both
   implementations produce byte-identical documents from the same session
   input. Drift caught by CI or not at all.
Never: option 3, "just write what looks right".

## 8. Paid entitlement model

Unchanged and non-negotiable: `users/{uid}.isPaid`, **server-write-only**,
written exclusively by verification Cloud Functions — today
`verifyPurchase` (Play), later a web-payment webhook CF. The web client
reads it via a store mirroring `entitlementStore`. No web code path may
write `isPaid`, no second entitlement flag may exist. Any change here is
an **Opus moment** requiring Anusha's explicit sign-off.

## 9. Mock engine reuse

Mock rules are LOCKED (100Q/120min, `MOCK_CHAPTER_WEIGHTS`, one-per-seedId,
free-one-ever, non-reviewable, unanswered=0, no negative marking).
`mockService.js` assembly logic goes into the shared package (§7.1); web
adds only presentation: question palette, keyboard nav, flag UI, timer.
The free-mock-ever counter derives from the SHARED Firestore mock history
— one free mock per account across both platforms, not one per platform.
Incomplete web attempts are silently discarded, same as the app.

## 10. Payments — architecture options AND THE POLICY WARNING

> **⚠️ POLICY WARNING — read before any payments work.**
> The Android app MUST continue using **Google Play Billing** for its
> in-app digital unlock. That is locked, and Play policy — not preference.
> A web checkout that unlocks the same entitlement is the Spotify/Netflix
> pattern and is generally permissible, **but only if the app behaves**:
> - The app must NEVER link to, mention, or steer users toward the web
>   checkout or web pricing (no "cheaper on our website", no URL in the
>   paywall, no "manage purchases on the web").
> - The app's paywall keeps exactly one purchase path: Play Billing.
> - Restore/entitlement language in-app stays payment-agnostic ("your
>   unlock is linked to your Google account").
> - Play's anti-steering rules shift with regulation (India CCI rulings,
>   user-choice billing programs). **Before building web checkout, a human
>   re-reads the current Play "Payments" policy and the app's paywall copy
>   side by side.** This is an Opus moment AND an Anusha decision, every
>   time the policy landscape moves.
> Getting this wrong risks app removal — the whole business. Treat this
> section as a gate, not advice.

Options for the web side (V2 fence — build only when the fence lifts):
| Option | Verdict |
|---|---|
| **Razorpay checkout → webhook → CF writes `isPaid`** | Recommended; already named in the locked payment architecture. UPI/cards native, Indian entity friendly. |
| Stripe | Viable, weaker UPI story for Indian consumers — no. |
| Payment links (no integration) + manual flip | Tempting-simple but breaks server-write-only discipline with human hands in prod data — no. |
Flow: `/app/upgrade` → Razorpay order (CF creates order, binds uid) →
checkout → Razorpay webhook (signature-verified) → CF validates → writes
`isPaid` + a purchase record (source: "razorpay") → client listener flips.
Refund path and webhook-replay idempotency are part of MVP-of-payments,
not follow-ups.

## 11. Admin / content review

No admin web UI. Content review stays `npm run review:app` + the runbook.
The only future admin candidate is a read-only "content coverage" page,
and even that is a nice-to-have. Resist the admin-panel temptation — it's
a second product.

## 12. Security rules considerations

- Current deployed rules already fit web reads: users per-user; questions
  `isFree` OR `isPaid` (server-enforced); flashcards any signed-in user.
  The web client changes NOTHING here for MVP. Any rules change follows
  the locked mirror-edit discipline (`firestore.rules` ↔ Console, same
  session) and is an Opus moment.
- **App Check:** add for web (reCAPTCHA provider) when the web app ships,
  and enforce across Firestore — revisit app + functions enforcement
  together. Schedule with Web-1, not before.
- Accept honestly: a paid web user can scrape the bank from devtools
  (as a rooted phone can today). Mitigations (per-session fetch shapes,
  no bulk endpoints) are v2 hardening, not MVP blockers.
- Web checkout CFs: signature verification, idempotent writes, region
  asia-south1, secrets in Functions config — never in client code.

## 13. Analytics

Web-1: GA4, exactly four events — `page_view`, `sign_in`,
`session_completed` (params: mode, chapter), `upgrade_view`. Web-3 adds
`purchase`. Nothing else; no session recording; privacy page discloses.
The app keeps its no-analytics stance (V2 fence) — analytics here is
WEB-only.

## 14. Deployment

- Stopgap (now): static `website/public/` on Firebase Hosting —
  `firebase deploy --only hosting` (NEVER bare `firebase deploy`;
  functions deploy embargo). 
- Web-1: Next.js on Firebase Hosting web-frameworks or Vercel (DECIDE);
  preview channels/deploys for review; `arnready.com` apex serves the one
  codebase; compliance URLs keep their exact paths forever (they'll be in
  Play Console).
- CI: lint + typecheck + shared-package tests + build must pass before
  deploy; gates never weakened (house rule).

## 15. Recommended build order (maps to roadmap doc)

| Step | Scope | Gate to start |
|---|---|---|
| 0 | Finish + deploy static compliance pages | before Play submission |
| 1 | Shared core package extraction (`quizEngine`, scoring, mock assembly, record shapes) + fixture tests | app launched; Opus session |
| 2 | Next.js shell: public pages (IA doc MVP set), migrate compliance URLs | step 1 not required |
| 3 | Auth + `/app` + flashcards | steps 1–2 |
| 4 | Chapter practice + progress writes + `isPaid` read (app-paid users get web) | step 3 + fixture tests green |
| 5 | Exam mode + laptop mock + results | step 4 |
| 6 | Web checkout | V2 fence lifted + §10 policy review done |

*ARNReady · ASM Tech · arnready.com*
