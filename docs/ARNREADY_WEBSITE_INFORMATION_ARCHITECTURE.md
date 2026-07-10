# ARNReady Web — Information Architecture

**Status:** IA v2.1 (10 July 2026 consistency pass). Firestore is the
single content source; web checkout becomes the primary conversion in W3; web
build starts independently of app launch. Every route of ARNReady Web is
covered: public SEO/course hub + client-rendered product.
Phases: **MVP** = Web-1 (buildable now) · **W2** = laptop-exam-hall phase ·
**W3** = web-checkout phase — merchant KYC is approved; remaining gates are
integration proof + the arch §10 policy review, NOT app launch (see PRD §8).
Copy rules: `ARNREADY_WEBSITE_COPY_SCAFFOLD.md`. Prompts to generate page
content: `ARNREADY_WEBSITE_PROMPT_LIBRARY.md`.

Conventions: every public page ends with ONE primary CTA; footer
(compliance links + independence disclaimer) on everything; Arnie the
panda at most once per page; no emojis.

---

## 1. Public routes

| Route | Purpose | User intent | Access | Primary CTA | Phase |
|---|---|---|---|---|---|
| `/` | Ecosystem front door: app + web + course + book | "what is ARNReady?" | public | Start free (no Google sign-in required) · Get the app | MVP |
| `/nism-series-v-a` | The exam explained honestly (format, fees, registration, validity) | "what is this exam?" | public | Start the free course / practice | MVP |
| `/syllabus` | 12 chapters + weightage table + how to prioritise | "what do I study?" | public | Practise chapter N free | MVP |
| `/chapters` | Index of the 12 chapter pages | navigation | public | per-chapter links | MVP |
| `/chapters/[chapter]` | THE workhorse ×12: what the chapter covers, weightage, key concepts, 2–3 sample questions, lecture embed | "explain chapter N" / search | public | Practise this chapter free · Watch the lecture | MVP (skeleton) → W2 (lecture embeds) |
| `/mock-test` | Why laptop mocks mirror the real exam; how ours works | "NISM V-A mock test" (highest intent) | public | Take your free mock | MVP page; links live in W2 |
| `/flashcards` | What the flashcard decks are; always free | "NISM V-A flashcards / notes" | public | Open the flashcards | MVP |
| `/questions` | PDF-hunter intercept: why dumps fail, how our bank works, sample Qs | "NISM V-A questions PDF" | public | Practise real questions free | MVP |
| `/pricing` | The one honest pricing page: free vs ₹250-once table | "is it free? what's paid?" | public | Unlock for ₹250 — web checkout, unlocks the app too (until W3 ships: Start free) | MVP page; buy button W3 |
| `/book` | The KDP book: what it is, what it isn't, buy link | "NISM V-A book" | public | Buy on Amazon · sample pages | when KDP live |
| `/youtube-course` | Course hub: playlist map, chapter-by-chapter index of lectures | "free NISM V-A course" | public | Watch chapter 1 · Practise alongside | with course launch |
| `/about` | Anusha, ASM Tech, the honesty philosophy, Arnie the panda | trust check | public | soft: start free | MVP |
| `/faq` | Objections answered; FAQPage schema | specific doubts | public | contextual | MVP |
| `/privacy` | Privacy policy (Play Console URL — path immutable) | compliance | public | — | pre-submission |
| `/delete-account` | Deletion instructions (Play Console URL — path immutable) | compliance | public | — | pre-submission |
| `/support` | Support contact + SLA | help | public | mailto | pre-submission |

**Content/data needs (public) — CORRECTED 9 Jul (Anusha):** Firestore is
the SINGLE source of truth for all content, public pages included — no
hand-maintained duplicates in the repo. A reviewed correction propagates
to the app, the web product AND the public pages from one place. Public
pages should still be served pre-rendered/cached for SEO, but generated
FROM Firestore (build-time or server-render), never hardcoded.

**Access model — CORRECTED 9 Jul (Anusha):** unlike the app (sign-in
mandatory), the web serves the FULL free-tier content to unsigned
visitors — real free questions and flashcards, not curated samples.
Sign-in (Google) is prompted at natural moments but always cancellable;
cancel → keep studying free, nothing persisted. Sign-in buys
*persistence and identity*, not access: progress, the mistakes deck,
baseline, `isPaid`, and the one-free-mock-EVER counter are per-account
(locked rules), so those surfaces require sign-in — an unsigned visitor
cannot take the free mock or the counter breaks. Implementation options
for unsigned reads (architecture doc decides; deployed rules SEMANTICS
are not touched casually — Opus moment): Firebase anonymous auth
(satisfies the signed-in rules, upgrades cleanly to Google sign-in) or
server-side delivery with admin credentials. `/chapters/[chapter]`
needs, per chapter: summary, key-concept list, weightage, `isFree`
sample questions, lecture video ID (when it exists). `/syllabus` needs
the weightage table (from `CONFIG.MOCK_CHAPTER_WEIGHTS` values, restated
as content, marked [VERIFY] against the official outline). `/pricing`
needs the canonical free-vs-paid feature table (copy scaffold owns it).

## 2. Product routes (`/app/**`)

These are client-rendered product surfaces, not uniformly authenticated.
Unsigned visitors receive the full free study tier. A Google-linked account is
required only where identity is part of the locked rule: persisted progress,
mistakes, baseline, entitlement, account settings, purchase binding, and the
one-free-mock-ever counter.

| Route | Purpose | Access | Primary CTA | Data | Phase |
|---|---|---|---|---|---|
| `/app` | Signed-in home: continue studying, chapter grid, progress glance | free+paid | Continue where you left off | progress aggregates, isPaid | MVP |
| `/app/flashcards` | Chapter → subtopic decks, keyboard flip/grade | unsigned + signed; all free (locked) | next deck | flashcards collection | MVP |
| `/app/practice` | Chapter picker for practice | unsigned + signed free/paid | pick chapter | progress per chapter when signed in | MVP |
| `/app/practice/[chapter]` | Practice session, explanations after answers, engine rules verbatim | unsigned + signed; free tier caps apply (PRD §7) | at cap: upgrade / get-the-app | questions (rules-gated), session writes only with identity | MVP |
| `/app/exam/[chapter]` | Exam mode: no explanations mid-run, strict scoring | free = isFree set; paid = full draw | see results | questions, session writes | W2 |
| `/app/mock` | Pre-mock instructions → 100Q/120min laptop mock, palette + keyboard | free = ONE ever (cross-platform); paid unlimited | begin mock | mock assembly, mock history | W2 |
| `/app/mock/[attempt]` | The running attempt (navigate/flag/change until submit) | as above | submit | attempt state (local until submit) | W2 |
| `/app/results/[session]` | Score, delta, weak areas; paid exam-mode review where the locked rules allow (mocks NEVER reviewable) | unsigned local result or signed session; free/paid views differ | free: upgrade · paid: next step | local state or session record | MVP (practice) / W2 (exam+mock) |
| `/app/mistakes` | The mistakes deck, same join/advance/retire rules | free+paid (conversion surface) | clear your deck | mistakes collection | W2 |
| `/app/progress` | Cross-platform progress: per-chapter bars, mock history; the "it knew me" page | free+paid | app cross-link (calm, once) | aggregates, mock history | MVP-lite → W2 |
| `/app/account` | Profile, sign-out, delete-account link, entitlement status (payment-agnostic wording) | free+paid | — | user doc | MVP |
| `/app/upgrade` | The web paywall: honest free-vs-paid, ₹250-once; "maybe later" always visible (locked rule) | visible to free users; Google-linked account required before purchase | Unlock for ₹250 — THE primary conversion CTA once W3 is live (unlocks web AND app) | isPaid, checkout (W3) | page W2, checkout W3 |

**Locked-rule notes for builders:** scoring formulas, gate order, mock
weights/draw, free-mock-ever, non-reviewable mocks, mistakes retire-streak
— all identical to the app, imported from the shared core (architecture
§7), never re-derived. `/app/upgrade` never uses urgency; Arnie celebrates
on results only per the app's rationing rules (76%+).

**Ads on web (9 Jul, Anusha):** mirrors the app — free users see ads,
paid users see none (the web AdBanner equivalent renders nothing when
`isPaid`; no ads on the upgrade/paywall page, same as the app). The web
free tier mirrors the app's gate sequence in full (PRD §7). Open
technical item for the architecture doc: the web equivalent of the
rewarded-ad unlock at Q11/Q16 (Google's rewarded web ad formats are
narrower than AdMob's) — resolve at Web-1 build time, never by weakening
the gate order.

## 3. Cross-linking map (the ecosystem in nav form)

- Header (public): Chapters · Mock Test · Pricing · the Course → sign-in.
- Every `/chapters/[chapter]` ↔ its lecture (`/youtube-course` anchor +
  embed) ↔ "practise free" (`/app/practice/[chapter]`) ↔ book mention.
- YouTube descriptions → `/chapters/[chapter]` (not just the homepage).
- Book QR → `/` (printed once, never changes — keep `/` stable forever).
- App → web: ONLY payment-agnostic, non-checkout surfaces (e.g. support/
  delete-account links). The app NEVER links to `/pricing` or
  `/app/upgrade` — architecture §10 policy warning.

## 4. Redirect / stability rules

- `/privacy`, `/delete-account`, `/support`, `/` are printed/submitted
  URLs — never move, never rename.
- Static-scaffold → Next.js migration must preserve every public path 1:1.
- Chapter slugs: `/chapters/1` … `/chapters/12` (numeric — stable, matches
  the app's chapter numbering; add human-readable aliases later via
  redirects if SEO demands).

*ARNReady · ASM Tech · arnready.com*
