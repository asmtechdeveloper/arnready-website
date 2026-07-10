# ARNReady Website — Execution Plan

**Status:** v1.1 (10 July 2026) — the website track extracted from the
retired combined `ARNREADY_WEB_YOUTUBE_EXECUTION_ROADMAP.md` when the
three tracks (website / YouTube / book) became separate projects.
Sequencing truth (Anusha, 9 Jul): **the website builds NOW and launches
independently while the app awaits Play approval. Once the app is live,
revenue ships on the app first (app war room §19 G), then focus returns
here.** The app's critical path owns ANUSHA'S OWN HOURS; this track is
the sanctioned parallel track for build sessions.

Doc set (this folder): `ARNREADY_WEB_PRODUCT_PRD.md` (WHAT) ·
`ARNREADY_WEB_ARCHITECTURE.md` (HOW — v2 rewrite complete 9 Jul) ·
`ARNREADY_WEBSITE_INFORMATION_ARCHITECTURE.md` (every route) ·
`ARNREADY_WEBSITE_COPY_SCAFFOLD.md` (copy rules + wire copy) ·
`ARNREADY_WEBSITE_PROMPT_LIBRARY.md` (lower-model prompts) ·
`ARNREADY_WEBSITE_AND_CONTENT_STRATEGY.md` +
`ARNREADY_CONTENT_REPURPOSING_PLAYBOOK.md` (ecosystem-wide — this
project hosts them; YouTube and Book projects reference them).
The APP repo (`../ARNReady-App`) owns: locked product rules (CLAUDE.md),
config values, the content pipeline, Firestore rules, Cloud Functions.

**Decisions locked 9 Jul:** web checkout = **Razorpay**, the site's
primary conversion CTA once Web-3 ships · domain shape = **`arnready.com/app`** (path,
not subdomain) · web mimics the app in ALL respects (PRD §7) · Firestore
is the single content source, public pages included · unsigned visitors
get the FULL free tier; sign-in buys persistence, not access.

---

## 1. Gate checklists

### Play-submission duties (the only APP-launch-gating web work)
- [ ] `/privacy` substantive draft reconciled with real data flows (including
      the current Formspree signup) + Anusha/legal accuracy pass (it already
      has no `noindex`)
- [ ] `/delete-account` rewritten to make the deployed in-app flow primary;
      claims verified against the actual deleteAccount CF behaviour and
      device QA completed on a throwaway account
- [ ] Support email decided (dev Gmail vs support@arnready.com forwarding)
- [ ] `/support` page created with approved contact/SLA wording
- [ ] Hosting deploy path decided (this repo is the canonical static source; the
      app repo also holds a `website/public/` scaffold — consolidate to ONE),
      then `firebase.json` / `.firebaserc` established in the canonical repo
- [ ] arnready.com DNS connected (Anusha, registrar + hosting console)
- [ ] The three URLs pasted into Play Console fields
- [ ] Privacy policy re-check when real AdMob IDs go in

### Before Web-1 build starts ("read + practise")
- [x] Content in Firestore (done 8 Jul — web reads the same collections)
- [x] Domain shape decided — `arnready.com/app` (9 Jul)
- [ ] Shared-core extraction plan approved — **Opus session** (arch §7;
      touches app imports; coordinate with the app repo)

### Before laptop mocks (Web-2)
- [ ] Web-1 shipped and stable (auth, flashcards, practice, progress writes proven)
- [ ] Shared-core fixture tests proving progress-record parity with the app
- [ ] Free-mock-ever counter verified cross-platform (one mock per ACCOUNT)

### Before web paid access (Web-3) — every box, no exceptions
- [x] V2 fence formally lifted by Anusha — DONE 9 Jul (web checkout is the
      site's primary conversion; provider: Razorpay)
- [ ] **Play policy review** (arch §10) done against the CURRENT policy text — human eyes
- [ ] App paywall audited: zero web-checkout mentions/links anywhere in the app
- [x] Razorpay onboarding — KYC APPROVED 10 Jul (account activated;
      test-mode keys available; live-mode webhook secret generated
      when the CF is deployed)
- [ ] Webhook CF designed: signature verification, idempotency, uid binding,
      asia-south1, and cross-source refund/revocation semantics — **Opus
      moment** (writes entitlement state; the CF lives in the app repo's
      `functions/` workspace alongside verifyPurchase)
- [ ] /pricing live; refund policy written (ANUSHA-DECIDE)

## 2. Time-boxed plan

### 2 weeks (the app-approval window)
| When | What | Who |
|---|---|---|
| Days 1–3 | Reconcile privacy + delete-account copy; support email/page; establish hosting config; deploy; DNS; URLs into Play Console | lower model drafts + one session + Anusha |
| Days 3–14 | Web-1 build: shared-core extraction plan (**Opus session** first), then Next.js shell → auth → unsigned free access → flashcards → practice | sessions |
| Done 10 Jul | Razorpay merchant KYC approved; test mode available | Anusha |

### 30 days
Website launched independently (before or regardless of app approval):
public pages (Firestore-sourced), unsigned free practice + flashcards,
sign-in for persistence, progress sync, isPaid read — app-paid users get
web access as the sync proof. Launch announcement (E-7 WhatsApp pack +
LinkedIn post).

### 90 days
Web-2 laptop mocks + exam mode; **Web-3 checkout live** (Razorpay +
webhook CF — Opus moment) once the policy review is done — web unlock
becomes the primary conversion. Chapter pages grow lecture embeds as the
YouTube course ships.

## 3. Who does what

**Lower models (with the prompt library):** draft all page copy, FAQ
batches, CTA sets, metadata, WhatsApp packs; run E-1/E-2/E-3 reviews;
build static page additions and scheduled Web-1 features under the
architecture doc.

**Anusha personally:** verify exam facts ([VERIFY] set); voice pass on
every public page before it's linked; DECIDE support email, refund
policy, GA4 or not; own Razorpay production activation/secrets, all
Play-policy calls, and anything near isPaid.

**Code sessions, in order:** compliance-page finish + deploy (small) →
static chapter/SEO page additions (small) → shared-core extraction
(**Opus**) → Web-1 Next.js build (multi-session) → Web-2 mock engine UI →
Web-3 checkout + webhook CF (**Opus**).

## 4. Standing rules for every session in this project

1. The app war-room critical path owns ANUSHA'S hours until the app is
   live; build sessions advance this track in parallel.
2. Ship Web-1 properly, don't sprawl.
3. Every public artefact passes E-1 + E-2 review before it ships.
4. The Android app never links to or mentions web checkout (Play policy —
   absolute). The site may sell freely; web pages may say "also available
   in the app".
5. Locked engine rules (scoring, gates, mock weights/draw, free-mock-ever)
   are imported from the shared core, never re-derived. The app repo's
   CLAUDE.md is the canon for all locked rules.
6. Arnie is a panda. The scoring is honest. The practice is the product.

*ARNReady · ASM Tech · arnready.com*
