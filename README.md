# ARNReady Website — README

The arnready.com codebase. Two lives:
1. **Today:** static compliance site (pre-Play-submission stopgap).
2. **Next:** ARNReady Web — the full app in the browser, Next.js.

**Repository reality (10 Jul 2026):** the root contains the static HTML
pages, chapter redirect stubs, `CNAME`, Arnie Lottie source files, and one
legacy Chapter 1 flashcard JSON. It does **not** yet contain a Next.js app,
`package.json`, `firebase.json`, or `.firebaserc`; `/support` also does not
exist yet. Firebase Hosting is the decided target, but the deployable hosting
configuration still has to be established in one canonical repo location.

**Repo:** `github.com/asmtechdeveloper/arnready-website` (separate from
the app repo). See `CLAUDE.md` for locked rules and
`docs/ARNREADY_WEBSITE_EXECUTION_PLAN.md` for the current plan.

---

## Getting started (Anusha's steps)

### Step 0 — one-time housekeeping (10 minutes)

1. `cd /Users/anushamurthy/Projects/ARNReady/ARNReady-Website`
2. Skim `CLAUDE.md` (Play policy fence, entitlement, Razorpay, domain
   `arnready.com/app`), then
   `docs/ARNREADY_WEBSITE_EXECUTION_PLAN.md`.
3. Check `git status` — you should see the new docs untracked. Commit
   them when you're ready (or ask Claude to).

### Step 1 — finish the compliance site (this is what blocks Play submission)

The static site already exists (`index.html`, `privacy.html`,
`delete-account.html`, chapter redirect stubs, `CNAME`). What's left:

1. **Privacy policy** — a substantive draft exists and already has no
   `noindex`, but it still needs a human/legal accuracy pass against the
   app's real data collection, AdMob setup, Firebase services, the current
   Formspree email-signup processor/consent, and future Razorpay use. It must
   link `/delete-account` and use the canonical footer before it is final.
2. **Delete-account page** — rewrite the current email-only flow so the
   deployed in-app deletion path is primary. Cross-check every claim against
   the deployed `deleteAccount` Cloud Function: it recursively deletes
   `users/{uid}`, deletes the Firebase Auth user, and retains purchase-audit
   records. Device QA on a throwaway account is still pending in the app repo.
   Decide and document the email fallback separately.
3. **Support email** — decide: dev Gmail (`asmtechdeveloper@gmail.com`)
   or `support@arnready.com` forwarding. This is ANUSHA-DECIDE.
4. **Support page** — create the permanent `/support` route using the chosen
   email and the response-time wording Anusha approves.
5. **Hosting config + deploy** — consolidate the app repo's old
   `website/public/` scaffold and this repo into ONE source, then add/confirm
   the Firebase Hosting configuration here. Never run a bare
   `firebase deploy`; it would broaden scope to the app's live Functions.
   Always use `firebase deploy --only hosting`.
6. **DNS** — connect `arnready.com` in Firebase Console → Hosting.
   Update your domain registrar's records as Firebase instructs.
7. **Paste the three URLs into Play Console** —
   `arnready.com/privacy`, `arnready.com/delete-account`,
   support email.

Once these seven items are done, this repo has done its
launch-gating job for the APP.

### Step 2 — Razorpay onboarding (external gate cleared 10 Jul)

KYC was approved and the account activated on 10 Jul. Test-mode keys are
available. Live keys and the production webhook secret are created/confirmed
when the Web-3 integration is deployed; they never belong in client code or
this repository's documentation.

Remaining work is engineering and policy-gated: design the order + webhook
Cloud Functions, configure test secrets, complete the Play-policy review,
test payment/refund/idempotency paths, then configure live secrets.

### Step 3 — kick off Web-1 (the real product)

Only after Steps 1 + 2 are underway. First engineering task is the
**shared-core extraction** — an **Opus session** because it touches
app imports (`../ARNReady-App/services/quizEngine.ts`,
`progressService.js`, `mockService.js`). Tell Claude:

> "Read `ARNReady-App/CLAUDE.md`, `ARNReady-Website/CLAUDE.md`, and
> `ARNReady-Website/docs/ARNREADY_WEB_ARCHITECTURE.md` §7. Plan the
> shared-core extraction into a workspace package. Show me the plan
> before writing code."

After that, Web-1 build sessions follow the execution plan §2
(Days 3–14 track): Next.js shell → auth → unsigned free access →
flashcards → practice.

### Step 4 — first content sessions

Public pages (Firestore-sourced) — start with the workhorses:
`/chapters/[n]` × 12, `/mock-test`, `/syllabus`, `/nism-series-v-a`.
Use prompts W-1 through W-5 in `docs/ARNREADY_WEBSITE_PROMPT_LIBRARY.md`.
Anusha's voice pass gates any page going live.

---

## Locked decisions (do not revisit without a fresh session with Anusha)

- **Domain shape:** `arnready.com/app` (path, not subdomain) — 9 Jul.
- **Web checkout provider:** Razorpay — 9 Jul.
- **Content source:** Firestore, single source, public pages included.
- **Access model:** unsigned visitors get the FULL free tier.
- **Web parity:** the web mimics the app in all respects; no
  web-different rules.
- **Play policy fence:** the app never links to or mentions web
  checkout, ever. Absolute.

## Cross-project docs

- Locked product rules: `../ARNReady-App/CLAUDE.md`.
- YouTube docs: `../ARNReady-YouTube/docs/`.
- Book docs: `../ARNReady-Book/docs/`.
- Shared strategy + repurposing docs live in THIS repo's `docs/` and
  are referenced by the YouTube and Book projects.

*ARNReady · ASM Tech · arnready.com*
