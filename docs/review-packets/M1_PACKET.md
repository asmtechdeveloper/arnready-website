# M1 Evidence Packet — Public content layer

## 1. Scope

**Milestone:** M1 — chapter hubs + subtopic spokes on the static build
(`docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md` §2).

**Summary:** Extended the Firestore build-time export to pull chapter
teaching (`chNN_teaching` docs) alongside the existing flashcard/question
export. Ported the app repo's teaching normalization (`services/
flashcardTeaching.js`) and canonical-deck ordering (`services/
flashcardDeck.js`, `services/flashcardOrder.js`) into typed, unit-tested
TypeScript modules under `src/lib/`. Built `/chapters` (index),
`/chapters/[chapter]` (hub: teaching + subtopic index + first-10-canonical-
order sampler flashcards + one sign-in CTA), and `/chapters/[chapter]/
[subtopic]` (spoke: subtopic teaching + that subtopic's share of the
sampler + breadcrumbs + prev/next), generated only for chapters/subtopics
with approved teaching. Added a 301 redirect from the retired `/questions`
URL to `/chapters` (via `firebase.json`, the static-export-compatible
mechanism this repo already uses for legacy redirects) and a `sitemap.ts`/
`robots.ts` covering every hub and spoke. Extended `scripts/check-paid-
leak.mjs` to enforce the full §0.6 public-export budget (zero question text,
≤10 distinct sampler cards/chapter) and fixed the M0-D1 fingerprint-
truncation/collision and HTML-entity-normalization gaps by extracting a
shared, entity-decoding `canon()`/`fingerprint()` module used by both
`export-content.mjs` and `check-paid-leak.mjs`.

**Full changed-file list** (`git status --porcelain` at the final commit):

```
 M firebase.json
 M scripts/check-paid-leak.mjs
 M scripts/export-content.mjs
 M src/lib/copy.ts
 M test/check-paid-leak.test.ts
?? docs/review-packets/M1_PACKET.md
?? docs/review-packets/screenshots/M1/
?? scripts/lib/canon.mjs
?? src/app/chapters/page.tsx
?? src/app/chapters/[chapter]/layout.tsx
?? src/app/chapters/[chapter]/page.tsx
?? src/app/chapters/[chapter]/[subtopic]/page.tsx
?? src/app/robots.ts
?? src/app/sitemap.ts
?? src/components/FlashcardSampler.tsx
?? src/components/TeachingBlocks.tsx
?? src/lib/content.ts
?? src/lib/flashcardDeck.ts
?? src/lib/flashcardOrder.ts
?? src/lib/teaching.ts
?? test/firebase-redirects.test.ts
?? test/flashcardDeck.test.ts
?? test/sitemap.test.ts
?? test/teaching.test.ts
```

No `firestore.rules`, app-repo `functions/`, scoring constant, or `/app/*`
route was touched. No new npm dependency was added.

---

## 2. Pasted gate outputs (final commit, real Firestore export)

### Lint

```
> arnready-website@0.0.0 lint
> eslint . --max-warnings=0 && node scripts/check-no-raw-hex.mjs

Raw-hex guard PASSED — no hex colour literals outside src/styles/tokens.ts.
```

### Typecheck

```
> tsc --noEmit
tsc: 0 errors
```

### Test (`npm test` — vitest run, full suite)

```
 Test Files  10 passed (10)
      Tests  60 passed (60)
```

10 new tests in `test/teaching.test.ts`, 8 in `test/flashcardDeck.test.ts`,
7 new in `test/check-paid-leak.test.ts` (11 total in that file), 3 in
`test/sitemap.test.ts`, 1 in `test/firebase-redirects.test.ts` — on top of
the 23 existing M0 tests, all still passing unmodified except
`test/check-paid-leak.test.ts` (extended, not altered — see §4). Expected
`PAID-CONTENT LEAK GATE FAILED` diagnostics appear on stderr from the
deliberately-failing fixture cases in `test/check-paid-leak.test.ts` (both
the pre-existing paid-content cases and the new free-question/entity/
sampler-budget cases) — this is intentional output from passing tests
asserting the gate fails closed, not a problem.

### Build (`npm run build`, live Firestore, real service-account export)

```
> npm run export-content
Exported 240 free questions across 12 chapters, 732 flashcards, paid manifest: 4596 text fingerprints (gitignored).

> npm run check-paid-leak (prebuild)
Paid-content leak gate PASSED — 25 artefact(s) scanned against 4596 paid ids + 4596 text fingerprints; exported question files structurally free-only; zero questions and ≤10 sampler cards/chapter confirmed in the public export.

> next build
✓ Compiled successfully in 1993ms
  Running TypeScript ...
  Finished TypeScript in 1646ms ...
✓ Generating static pages using 9 workers (195/195) in 526ms

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
├ ○ /chapters
├ ● /chapters/[chapter]              (12 paths: /chapters/1 … /chapters/12)
├ ● /chapters/[chapter]/[subtopic]   (169 paths across all 12 chapters)
├ ○ /delete-account
├ ○ /faq
├ ○ /nism-series-v-a
├ ○ /pricing
├ ○ /privacy
├ ○ /robots.txt
├ ○ /sitemap.xml
├ ○ /support
└ ○ /syllabus

> npm run check-paid-leak (postbuild, scans the real out/)
Paid-content leak gate PASSED — 1927 artefact(s) scanned against 4596 paid ids + 4596 text fingerprints; exported question files structurally free-only; zero questions and ≤10 sampler cards/chapter confirmed in the public export.
```

### Manual leak-gate spot checks against the real `out/`

```
$ find out -ipath "*questions*"                     → (no output — no /questions route emitted)
$ grep -c "<loc>" out/sitemap.xml                    → 191  (10 static + 12 hubs + 169 spokes)
$ grep -c "questions" out/sitemap.xml                → 0
$ cat out/robots.txt
User-Agent: *
Allow: /
Sitemap: https://arnready.com/sitemap.xml

$ find out/chapters/1 out/chapters/1.html -name "*.html" \
    | xargs grep -oh 'data-card-id="1:[^"]*"' | sort -u | wc -l
10   ← exactly 10 distinct sampler cards across chapter 1's hub + all 9 of its spokes combined
```

---

## 3. Screenshots

`docs/review-packets/screenshots/M1/`:
- `chapter-hub-375.png`, `chapter-hub-1440.png` — `/chapters/1` (Indian
  Securities Market — an overview): teaching, 9-item subtopic index, 10
  sampler flashcards, sign-in CTA.
- `chapter-spoke-375.png`, `chapter-spoke-1440.png` —
  `/chapters/1/savings-vs-investments` (concept-first title "Savings vs
  Investments — NISM Series V-A"): breadcrumbs, teaching, its 3-card share
  of the sampler, prev/next, back-to-chapter, sign-in CTA.

Captured via Chrome DevTools Protocol mobile emulation
(`Emulation.setDeviceMetricsOverride`) rather than Chrome's `--headless
--window-size --screenshot` CLI flag — that CLI path was found during this
milestone to silently clamp to a wider-than-requested render for widths
under ~450px in the installed Chrome version (149.0.7827.201), cropping
mobile captures of *every* page including the already-approved M0 homepage.
This is a capture-tool artifact, not a product bug — verified by
reproducing identical cropping on the unmodified M0 homepage, and by
confirming the CDP-captured 375px homepage is visually identical to the
approved `docs/review-packets/screenshots/M0/home-375.png`.

---

## 4. Deviations from the manual

- **Chapter hub URL is numeric** (`/chapters/1` … `/chapters/12`), not a
  `{number}-{kebab-slug}` scheme. `firebase.json` already contained 12
  pre-existing legacy redirects (`/chapter-1.html` → `/chapters/1-
  investment-landscape`, etc.) from before the 13 Jul repo reset, targeting
  a slug scheme this milestone does not implement. Those redirects were
  already dangling (no source implemented them before this milestone
  either) and are left untouched — flagged in §5 as a limitation for
  Anusha's decision rather than guessed at, since no canon doc specifies
  the intended slug format.
- **Nested dynamic-route static params required a new `layout.tsx`** at
  `src/app/chapters/[chapter]/`. Next.js only propagates a parent dynamic
  segment's `generateStaticParams` to a nested child route
  (`/chapters/[chapter]/[subtopic]`) when it is defined on that segment's
  `layout.tsx` — a sibling `page.tsx`'s own `generateStaticParams` only
  registers params for its own leaf route. This was discovered because the
  static export build failed outright without it (`output: 'export'`
  refuses an unresolvable dynamic route), so it isn't an optional
  refinement.
- **`content/flashcards/chNN.json`** (grouped-by-subtopic, alphabetically
  sorted) is replaced by **`chNN.raw.json`** (the unmodified per-chapter
  Firestore doc array, mirroring the app's `fetchChapterFlashcardDocs`
  shape exactly). The old format silently included the `chapterTeaching`
  metadata doc as a bogus card group (no `cards` array, sorted by
  `String(undefined)`) — a latent bug fixed as part of this change, not a
  scope expansion, since M1 required reading that same collection's
  teaching docs anyway. Nothing in the repo consumed the old file (grepped
  before removing it).
- **Sync-`params` page signatures were converted to `Promise<params>`**
  (`await params`) in both dynamic route files. The static-export build
  succeeded with the old synchronous-destructure signature, but `next dev`
  threw `params is a Promise and must be unwrapped` and 404'd the route —
  Next 16's App Router requires this for correctness, and a passing build
  is not sufficient evidence the routes work (see §6).

## 5. Known limitations

- The 12 pre-existing `/chapter-N.html` → `/chapters/N-slug` redirects in
  `firebase.json` (predating this milestone) now point at chapter-hub URLs
  that don't exist under this milestone's numeric scheme. They were already
  broken before M1 (no hub existed at all); M1 doesn't make this worse, but
  doesn't fix it either. Anusha decision needed: adopt the old slug scheme,
  update the redirects to the numeric scheme, or leave for M8's release
  audit.
- M0-D1 (paid-fingerprint truncation/collision, HTML-entity normalization
  gaps) is resolved as part of this milestone's leak-gate extension — see
  `scripts/lib/canon.mjs`'s module doc and `test/check-paid-leak.test.ts`'s
  new entity-escaping test.
- The flashcard sampler cards use a native `<details>/<summary>` reveal
  (no client JS) rather than the flip-card interaction pattern the study
  product itself may eventually use — appropriate for a public, SSG,
  no-sign-in surface; M2+ owns the signed-in flashcard experience.

## 6. Verification beyond the automated gates

Manually browsed the built pages in a live dev server (`next dev`) at
375px and 1440px: `/chapters` index, `/chapters/1` hub, and
`/chapters/1/savings-vs-investments` spoke, including prev/next navigation
between spokes. Caught and fixed two issues this way that the automated
gates did not surface:
1. The `params`-as-Promise issue in §4 (build succeeded; `next dev` 404'd).
2. A horizontal-overflow bug in the spoke page's prev/next navigation row
   at 375px (long unbreakable subtopic-name links in a `justify-between`
   flex row overflowed the viewport) — fixed by stacking prev/next
   vertically below the `sm:` breakpoint with `min-w-0 break-words`.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
