# ARNReady — Ecosystem & Content Strategy

**Status:** v2.2 (10 July 2026 — current-state consistency pass). v2.1
updated the doc map when the tracks became separate projects; sequencing is
superseded by §3. v2 (7 Jul)
corrected v1's framing: **ARNReady Web is a product; YouTube is a free
course.** This doc is the strategic overview for the WHOLE ecosystem —
it lives in the Website project (the hub at arnready.com) and is
referenced by the YouTube and Book projects. The weight lives in the
per-project execution sets:

| Doc | Where | Owns |
|---|---|---|
| `ARNREADY_WEB_PRODUCT_PRD.md` | here | ARNReady Web as a product: journeys, sync, scope ladder |
| `ARNREADY_WEB_ARCHITECTURE.md` | here | stack, shared engine, entitlement, payments + the Play-policy gate (v2 rewrite complete) |
| `ARNREADY_WEBSITE_INFORMATION_ARCHITECTURE.md` | here | every route, phased |
| `ARNREADY_WEBSITE_COPY_SCAFFOLD.md` | here | copy rules, wire copy, claims blacklist |
| `ARNREADY_WEBSITE_EXECUTION_PLAN.md` | here | web gates + time-boxed plans |
| `ARNREADY_WEBSITE_PROMPT_LIBRARY.md` | here | website/content prompts (W/C/D-1/E set) |
| `ARNREADY_CONTENT_REPURPOSING_PLAYBOOK.md` | here | one unit → every channel |
| `ARNREADY_YOUTUBE_COURSE_ARCHITECTURE.md` | `../ARNReady-YouTube/docs/` | the free V-A course: playlists, 94-video plan |
| `ARNREADY_YOUTUBE_VIDEO_TEMPLATES.md` | `../ARNReady-YouTube/docs/` | 8 reusable video templates |
| `ARNREADY_YOUTUBE_EXECUTION_PLAN.md` | `../ARNReady-YouTube/docs/` | production-approach decision + course gates |
| `ARNREADY_YOUTUBE_PROMPT_LIBRARY.md` | `../ARNReady-YouTube/docs/` | video prompts (Y/D/E set) |
| `ARNREADY_BOOK_EXECUTION_PLAN.md` | `../ARNReady-Book/docs/` | KDP book: interior, cover, publishing |
Locked product rules stay in the app repo (`../ARNReady-App/CLAUDE.md`).

## 1. The ecosystem (canonical)

| Pillar | Job | Money |
|---|---|---|
| **Mobile app** | daily practice, flashcards, mocks, mistakes deck, nudges | ₹250 once, Play Billing |
| **ARNReady Web** | the same study product in a browser — laptop mocks are the flagship — plus the SEO/course hub | same single ₹250 entitlement; web checkout (Razorpay) becomes the site's PRIMARY conversion in Web-3 |
| **YouTube** | the FREE complete NISM V-A course — chapter lectures (30–60 min where earned), explainers, revision, Shorts | none; trust + funnel |
| **Book** | physical question bank + revision companion (KDP) | book sale |

One account, one progress record, one `isPaid` — across the APP and the
WEB (pay on either; both unlock). The book and YouTube sit OUTSIDE the
entitlement: the book unlocks nothing digital and the ₹250 doesn't
include it. The free course + free tier is the generosity; **practice
depth is the product.**
"Knowledge is free. Mastery is earned" is now literally the architecture.

## 2. Positioning (unchanged, sharpened)

**The honest NISM V-A prep ecosystem.** Differentiators, in Priya's order
(persona: PRD §3): honest strict scoring · built to mirror the real
100Q/120min paper · genuinely free start (and a genuinely free full
course) · ₹250 once, never a subscription · Arnie the panda — warmth in a
grim category. Independent — never affiliated with NISM/SEBI/AMFI, and we
say so visibly.

## 3. Sequencing truths (RESEQUENCED 9 Jul — Anusha)

1. **The website builds NOW and launches independently** while the app
   awaits Play approval. Once the app is live, revenue ships on the app
   first, then focus returns to the web. Compliance URLs remain the only
   PLAY-SUBMISSION-gating web work.
2. **Nothing web/YouTube outranks the app's critical path for ANUSHA'S
   OWN HOURS** (content review → device QA → submission); build sessions
   run the web track in parallel.
3. **The course is the long-tail track** — AI-produced, faceless,
   "top-notch or not at all"; it starts after app+web ship and takes as
   long as it takes. The book track starts NOW, fully independent.
4. **Web checkout fence LIFTED 9 Jul** (Razorpay; the site's primary
   conversion) — but the Play-policy review (arch doc §10) gates it
   always, and the app never links to or mentions web checkout.

## 4. SEO strategy (now product-led)

The cornerstone pages ARE product doors: `/chapters/[n]` (the workhorses),
`/mock-test`, `/syllabus`, `/nism-series-v-a`, `/questions` (the
PDF-hunter intercept: convert, don't scold), `/flashcards`, `/pricing`.
Each page answers its query genuinely, then offers practice in the same
tab — stronger than v1's "install the app" dead-end. E-E-A-T levers:
named founder, cited sources (workbook edition, SEBI circulars), dated
pages, visible corrections policy, the YouTube course embedded on matching
pages. Never: doorway pages, scraped questions, AI-sludge volume.

## 5. Trust strategy

Named human founder on site and on camera · the free tier and free course
stated plainly · the strict-scoring story told proudly · the independence
disclaimer displayed, not buried · real screenshots only · corrections
pinned and credited on YouTube · no testimonials until real ones exist.

## 6. Brand voice everywhere

Anusha's voice: first person, honest, warm, lightly funny, Indian, calm;
never fear-based; candidates are smart professionals. No emojis. Arnie —
**a panda** — appears once per surface, celebrations rationed; he is a
companion, not a salesman. Countdown framing stays factual. All public
copy is WORKING until her voice pass; all facts [VERIFY] until she
confirms.

## 7. Content pillars (all channels)

1. Exam mechanics · 2. Concept clarity (the course's spine) ·
3. Traps & honesty · 4. Builder story (sparing). Every piece maps to one
pillar; the repurposing playbook turns one Concept Unit into flashcard,
page section, lecture segment, Short, post, and book callout with
identical facts.

## 8. Opinionated recommendations (v2)

1. Build the course backbone (12 lectures) before polishing anything else
   on YouTube — enrichment trails the spine by months, and that's fine.
2. Ship Web-1 with app-paid users getting web access FREE — sync as the
   first, most credible feature; checkout later.
3. Keep the book on its war-room priority (highest ₹/hour) — web/YouTube
   work fills the gaps around it, not the reverse.
4. No paid ads, no email marketing, no community features until real
   conversion data exists post-launch.
5. WhatsApp forwarding remains the dark-social channel that matters —
   every content batch includes one forwardable message (prompt D-4).
6. Protect Anusha's energy as a design constraint: weekly cadence, batch
   recording, templates for everything, lower models drafting everything
   draftable.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
