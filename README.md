# ARNReady Website — README

The arnready.com codebase. Two lives:
1. **Today:** static compliance site (pre-Play-submission stopgap).
2. **Next:** ARNReady Web — the full app in the browser, Next.js.

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

1. **Privacy policy** — the current file is a skeleton. Finish the
   text (drafted via a reputable generator + a human pass); remove its
   `noindex`. Draft this with a Claude session using the copy scaffold
   §12 spec.
2. **Delete-account page** — the copy claims must match what the actual
   `deleteAccount` Cloud Function does (already deployed in the app
   repo, asia-south1). A Claude session cross-checks the CF behaviour
   against the copy.
3. **Support email** — decide: dev Gmail (`asmtechdeveloper@gmail.com`)
   or `support@arnready.com` forwarding. This is ANUSHA-DECIDE.
4. **Deploy** — Firebase Hosting from this repo. Never bare
   `firebase deploy` (the app's `verifyPurchase` deploy is embargoed);
   always `firebase deploy --only hosting`.
5. **DNS** — connect `arnready.com` in Firebase Console → Hosting.
   Update your domain registrar's records as Firebase instructs.
6. **Paste the three URLs into Play Console** —
   `arnready.com/privacy`, `arnready.com/delete-account`,
   support email.

Once these six items are done, this repo has done its
launch-gating job for the APP.

### Step 2 — Razorpay onboarding (you own this — start early, KYC takes days)

Kicked off 9 Jul. This is independent of the code — the outputs are
API keys + webhook secrets that Claude will need at Web-3 build time.

1. Sign up at razorpay.com with the ASM Tech business identity.
2. Complete KYC (PAN, business proof, bank details). Days, not hours.
3. Enable UPI, cards, netbanking, wallets in the dashboard.
4. When approved, share test keys with the next Claude session so
   webhook CF work can begin.

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

### Step 4 — the ARNREADY_WEB_ARCHITECTURE.md v2 pass

`docs/ARNREADY_WEB_ARCHITECTURE.md` predates the 9 Jul corrections and
carries a v2-pass flag at the top. It needs a rewrite before Web-1
coding starts so it doesn't send a future session down the wrong path.
Tell Claude:

> "Rewrite `docs/ARNREADY_WEB_ARCHITECTURE.md` to v2, using the flag at
> the top for the known stale spots. PRD/IA/execution plan win any
> conflict."

### Step 5 — first content sessions

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
