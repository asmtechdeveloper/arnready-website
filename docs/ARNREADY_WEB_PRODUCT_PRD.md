# ARNReady Web — Product PRD

**Status:** PRD v2 (9 July 2026 — Anusha's corrections). ARNReady Web is
a **product**, not a landing page: the app in the browser — flashcards,
practice, exam mode, laptop mock tests, and web purchase of the same
premium entitlement the app uses. This doc defines WHAT; the HOW is
`ARNREADY_WEB_ARCHITECTURE.md`; page-level detail is
`ARNREADY_WEBSITE_INFORMATION_ARCHITECTURE.md`; sequencing is
`ARNREADY_WEBSITE_EXECUTION_PLAN.md` (which replaced the retired
combined web+YouTube roadmap when the projects separated, 9 Jul).

**SUPERSEDED (9 Jul, Anusha):** the old rule "nothing in this PRD is built
before the app launches" is retired. The web build starts NOW and the
website launches independently, while the app awaits Play approval — it
is the sanctioned parallel track (roadmap §2 owns sequencing; the app's
content-review + QA critical path still outranks web work for Anusha's
own hours).

---

## 1. Product purpose

One sentence: **let a candidate study for NISM Series V-A wherever they
are — phone or laptop — with one account, one progress record, one ₹250
unlock.**

Why it earns its build cost:
1. **Laptop mocks.** The real exam is taken on a desktop at a test centre.
   A 120-minute, 100-question mock is *better* on a laptop — bigger screen,
   real keyboard, closer to exam-day conditions. This is the web product's
   killer use case, not an afterthought.
2. **A second door to paid.** Some users will never pay inside an app but
   will pay on a website (corporate laptops, UPI on desktop, card-in-hand
   moments). Web checkout removes the Play-only bottleneck — especially
   valuable while the Play payments profile is BillDesk-blocked.
3. **SEO that converts to product, not just installs.** Public chapter and
   syllabus pages feed signed-in practice directly — the visitor starts
   studying in the same tab.
4. **The ecosystem hub** — the place the book's QR, YouTube descriptions,
   and search all land.

## 2. The four-pillar ecosystem (canonical framing — reuse everywhere)

| Pillar | Job | Monetisation |
|---|---|---|
| **Mobile app** | Daily practice, flashcards, mocks, streaks/nudges | ₹250 unlock via Play Billing (in-app purchases are Play-only — policy) |
| **ARNReady Web** | THE FULL APP IN THE BROWSER: practice + exam modes, laptop mocks, flashcards, mistakes deck — same free/paid rules and gates as the app — plus the SEO/course hub | same ₹250 entitlement via **web checkout — the primary conversion CTA** (better margin: gateway ~2% vs Play ~15%) |
| **YouTube** | The free, detailed, chapter-by-chapter V-A course | none — trust + funnel |
| **Book** | Physical question bank + revision companion | KDP sale — **outside the entitlement** |

One account, one progress record, one `isPaid` — **the app and the web**
read the same truth: pay anywhere (web checkout or Play Billing) and both
unlock together, forever. The book and YouTube sit OUTSIDE the
entitlement: buying the book unlocks nothing digital, and the ₹250 does
not include the book. Never imply otherwise in copy.

## 3. Target users

Same primary persona as everywhere (Priya, 28, bank RM, Pune) with a web
twist: she studies on her phone during commute but does her **Sunday
2-hour mock on the family laptop**. Secondary web-specific users: office
workers who study at a desk (bankers on lunch breaks — web works where
installing apps on a work machine doesn't), and candidates who found the
YouTube course first and want to practise a concept immediately in the
browser.

## 4. Core user journeys

### 4.1 Free web user (discovery → practice)
Search/YouTube → public chapter page → "practise this chapter free" →
Google sign-in → `/app/practice/{chapter}` → free questions with
explanations → hits the free cap → sees upgrade + "get the app for daily
practice". Success = a signed-in account with progress, on any platform.

### 4.2 Paid user journey (web)
Free user hits cap or finishes the free mock → `/app/upgrade` → pays ₹250
(web checkout — the site's primary conversion) → `isPaid` flips server-side → full bank,
unlimited mocks, exam review — on web AND in the app, same account,
immediately. One purchase, both platforms, forever (locked model).

### 4.3 App user coming to web
Opens arnready.com on a laptop → signs in with the same Google account →
everything is already there: progress, mistakes, paid state, mock history.
Zero migration, zero setup — this "it just knew me" moment IS the sync
feature. Primary intent: take a full mock on the big screen.

### 4.4 Web user discovering the app
Web-first users see one calm, recurring cross-link ("daily practice is
better in your pocket — get the app") on the progress page and after
sessions. Never a nag wall; web is a full citizen, not a demo of the app.

### 4.5 Laptop mock-test use case (the flagship)
`/app/mock` → same Pre-Mock instruction screen → 100Q/120min, keyboard
navigation (arrows/number keys/F to flag), question palette always visible
(the palette is where big screens beat phones) → submit → same scoring,
same non-reviewable rule, same free-one-mock-ever rule **shared across
platforms** (one free mock TOTAL, not one per platform — the Firestore
mock history is the counter).

### 4.6 Flashcard use case
`/app/flashcards` → chapter → subtopic decks, self-graded flips, always
free (locked rule), keyboard-driven (space = flip, 1/2 = grade). Lowest
risk, first authed feature to ship.

### 4.7 Question practice use case
Same locked engine rules as the app: practice = seeds only, easy→hard for
free users; exam mode = per-chapter, same draw rules; explanations in
practice, none mid-exam. Web MUST NOT invent a third mode.

### 4.8 Payment / unlock use case
See §4.2. Constraint that shapes everything: **the Android app keeps
Google Play Billing for in-app purchase, untouched; the app never links to
or mentions web checkout** (Play policy — full treatment in the
architecture doc §10, which any payments work must read first).

## 5. Account / progress sync model

- **One identity:** the same Firebase project, same Google sign-in, same
  `uid` on web and app.
- **One store:** the same Firestore documents (`users/{uid}` tree:
  progress aggregates, session log, mistakes, baseline, mock history,
  `isPaid`). Web reads and writes the SAME schema — no parallel "web
  progress" collections, ever.
- **One entitlement:** `users/{uid}.isPaid`, server-write-only, written
  only by verification Cloud Functions (Play verifier today; web-payment
  webhook later). Web client reads it exactly like the app does.
- Conflict model: last-write-wins per session record is acceptable — a
  user isn't practising on two devices simultaneously; aggregates are
  recomputed at write time by the single write path (§6).

## 6. What MUST be shared with the mobile app (parity list)

| Shared thing | Rule |
|---|---|
| Auth + uid | same Firebase Auth, Google provider |
| Question/flashcard content | same Firestore collections; content review pipeline unchanged |
| Progress schema + single-write-site invariant | web write path mirrors `progressService` record shapes exactly — drift here corrupts the app's Prepometer/stats |
| Scoring formulas | LOCKED (free floor-10 / paid served-count) — identical on web |
| Freemium gates & free caps | same free question set; see §7 for the ad-step difference |
| Mock rules | 100Q/120min, weights, one-per-seedId, free-one-ever (cross-platform counter), non-reviewable |
| `isPaid` | one record unlocks everything everywhere |
| Brand system | theme tokens, no emojis, Arnie the panda (rationed), appCopy voice |

## 7. Web parity rule (REWRITTEN 9 Jul — Anusha overruled v1's
"web-different" list)

**The web mimics the app in ALL respects.** Same free/paid rules, same
gates (Q1–10 free → ad unlock 11–15 → ad unlock 16–20 → paywall), same
scoring, same modes (practice, exam, mock, flashcards, mistakes deck,
baseline), same Today's-Focus engine, same onboarding intent. Free users
see ads; paid users see none. The web never invents a third mode and never
offers a *lesser* product than the app.

Only two categories may legitimately differ:
- **Web-additive:** the public SEO/course pages, `/pricing`, `/book`,
  `/youtube-course`, keyboard-first mock ergonomics, the question palette
  on big screens — things a browser does better.
- **Platform-tech deltas, not product deltas:** local notifications don't
  port (web push is not planned — V2 fence); the rewarded-ad unlock needs
  a web ad format equivalent (open technical item, IA doc §2) — resolved
  at build time without weakening the gate order; unsigned visitors get
  the full free tier with nothing persisted (IA doc access model) — a
  wider front door than the app, never a narrower product.

## 8. Scope ladder (opinionated, solo-founder-sized)

### MVP (Web-1: "read + practise") — buildable NOW (9 Jul)
- Public pages (IA doc: all MVP-marked routes) with real content.
- Google sign-in; `/app` shell; **flashcards** + **chapter practice**
  (free tier only is acceptable for first ship if paid reads lag).
- Progress writes in the shared schema; `isPaid` read (paid users who
  bought in the app get their full bank on web from day one — sync
  delivered before web checkout exists).
- Compliance pages absorbed into the site.

### Web-2: "the laptop exam hall" (after Web-1 is stable — not tied to app launch)
- Exam mode per chapter; **full mock on laptop** with palette + keyboard;
  results parity; mistakes deck read/advance.
- YouTube course embeds on chapter pages as the course ships.

### Web-3: "the second till" — FENCE LIFTED 9 Jul (Anusha)
- **Web checkout — the primary conversion CTA** (Razorpay → webhook CF →
  same `isPaid`; provider decided, see §10.2). No longer gated on app
  launch. Real gates: Razorpay onboarding (Anusha), the arch §10 Play
  policy review (the app must never link to or mention web checkout),
  webhook CF design (**Opus moment** — writes isPaid), pricing page live,
  refund policy written.
- Exam review on web, progress insights, Today's-Focus port (per §7
  parity, these are catch-up items, not optional extras).

### Not yet / not ever (yet)
- No admin CMS (content pipeline stays the repo + review tool).
- No web-only content types, no community/forum, no AI features (V2 fence).
- No iOS-webview repackaging, no PWA-offline mocks (complexity trap).
- No A/B testing infra, no email marketing until there's something to send.

## 9. Success measures (honest, minimal)

MVP: weekly signed-in web sessions; % of app-paid users who sign in on web
(sync proof). Web-2: mocks completed on web. Web-3: web-checkout share of
total unlocks. Vanity metrics (pageviews, time-on-site) explicitly don't
count.

## 10. DECIDE items — status as of 9 Jul

1. ~~Web free tier = 10 free questions~~ — **OVERRULED (9 Jul): full app
   parity (§7)** — same 20-question free tier, same ad gates; plus the
   unsigned-visitor open door (IA doc access model).
2. **Web checkout provider: Razorpay (decided 9 Jul, Fable's
   recommendation, Anusha asked).** Why Razorpay over BillDesk: built for
   exactly this (self-serve merchant onboarding in days, modern REST APIs +
   signed webhooks, hosted checkout with UPI/cards/netbanking/wallets
   native, solid docs, standard for Indian solo developers/startups).
   BillDesk is an enterprise/bank-oriented aggregator: sales-led
   onboarding, older integration surface, built for banks and billers, not
   solo SaaS — and this account's BillDesk experience (weeks sitting on
   the Play payout approval) is itself the argument. Runner-up if Razorpay
   onboarding ever stalls: Cashfree. Reduced-fee Play Account Group
   enrolment stays tied to the Play payments profile (war room §4) — it is
   about Play's cut, unrelated to web checkout.
3. ~~Web-1 before/after YouTube course~~ — **SETTLED (9 Jul): web build
   starts NOW, launches independently of both the app and the course;
   YouTube is explicitly the long-tail track (roadmap §2).**
4. ~~Domain shape~~ — **DECIDED (9 Jul, Anusha): `arnready.com/app`** —
   one domain concentrates SEO authority (subdomains split link equity),
   keeps public-page → practice links same-site, and means one hosting
   deploy, one cert, no cross-subdomain auth fuss.

**The DECIDE list is now EMPTY.** Remaining external dependency: Razorpay
KYC/onboarding (Anusha, in progress).

*ARNReady · ASM Tech · arnready.com — one account, one unlock, every screen.*
