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

**Changed-file list — M1 initial commit** (the files M1 introduced,
relative to the 13 Jul reset):

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

**Additional changed files — M1-r remediation** (B1–B10, then S1–S6/N1;
`git status --porcelain` on top of the M1 commit, excluding gitignored
build artefacts — the `content/`/`.leakcheck/` symlinks, their `.export/`
generation store, and `out/`). The concurrent M2 planning doc in the working
tree is intentionally NOT part of this commit:

```
 M .gitignore
 M docs/ARNREADY_WEBSITE_REVIEW_LOG.md
 M docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md
 M docs/review-packets/M1_PACKET.md
 M firebase.json
 M scripts/check-paid-leak.mjs
 M scripts/export-content.mjs
 M scripts/lib/canon.mjs
 M src/app/chapters/[chapter]/[subtopic]/page.tsx
 M src/app/chapters/[chapter]/page.tsx
 M src/lib/content.ts
 M src/lib/copy.ts
 M src/lib/flashcardDeck.ts
 M src/lib/flashcardOrder.ts
 M src/lib/teaching.ts
 M test/check-paid-leak.test.ts
 M test/firebase-redirects.test.ts
 M test/flashcardDeck.test.ts
 M test/sitemap.test.ts
 M test/teaching.test.ts
?? docs/codex-reviews/M1_INITIAL_REVIEW.md
?? scripts/lib/atomicExport.mjs
?? scripts/lib/atomicExport.d.mts
?? scripts/lib/canon.d.mts
?? scripts/lib/canonicalDeck.mjs
?? scripts/lib/canonicalDeck.d.mts
?? scripts/lib/freeManifestExclusion.mjs
?? scripts/lib/freeManifestExclusion.d.mts
?? scripts/lib/multiScan.mjs
?? scripts/lib/multiScan.d.mts
?? scripts/lib/publicTeachingText.mjs
?? scripts/lib/publicTeachingText.d.mts
?? scripts/lib/samplerManifest.mjs
?? scripts/lib/samplerManifest.d.mts
?? scripts/lib/teachingNormalize.mjs
?? scripts/lib/teachingNormalize.d.mts
?? src/lib/flashcardOrder.json
?? test/atomicExport.test.ts
?? test/canon.test.ts
?? test/canonicalDeck.test.ts
?? test/content.test.ts
?? test/flashcardSamplerLeakGate.test.tsx
?? test/freeManifestExclusion.test.ts
?? test/multiScan.test.ts
?? test/primaryCta.test.tsx
?? test/samplerManifest.test.ts
?? test/signInPlacement.test.tsx
?? test/spokeNavIcons.test.tsx
```

(The re-review round additionally modified `.gitignore`,
`scripts/check-paid-leak.mjs`, `scripts/lib/atomicExport.mjs`,
`test/atomicExport.test.ts`, `test/check-paid-leak.test.ts`, and
`test/flashcardSamplerLeakGate.test.tsx`, and added the two `multiScan`
files above — all already reflected in the list.)

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

This packet's original figures (10 files / 60 tests) were captured at the
first M1 commit, before the M1-r remediation round (10 BLOCKERs B1–B10, then
six SHOULD-FIXes S1–S6 and one NIT N1) added significant new test coverage.
The counts below are from the current tree, run in both required states —
see M1-r's remediation log (§7) for what changed and why.

**Clean pre-build state — `content/` absent, matching the §3 gate order
(lint → typecheck → test, BEFORE `export-content`/`build` ever runs):**

```
 Test Files  18 passed | 3 skipped (21)
      Tests  171 passed | 6 skipped (177)
```

The 3 skipped files/6 skipped tests are `test/signInPlacement.test.tsx`,
`test/primaryCta.test.tsx`, and `test/spokeNavIcons.test.tsx` (2 tests
each) — each renders a full Server Component page against real teaching
content and is intentionally scoped to run only after a live export exists
(`skipIf(!hasContent)`, matching the pre-existing `test/sitemap.test.ts`
pattern this milestone was built on). `test/sitemap.test.ts` itself is
**no longer** one of these three (M1-B10): it now mocks `@/lib/content`
with a deterministic fixture and its 8 tests always run, content or not.

**Content-present state — after `npm run export-content` (real Firestore),
retained as supplementary evidence, not the primary gate:**

```
 Test Files  21 passed (21)
      Tests  177 passed (177)
```

`test/sitemap.test.ts`: 8 tests (was 3 at the original commit) — exact
46-route fixture assertion (10 static + 12 hubs + 24 fixture spokes),
explicit total-count check, per-hub and per-spoke presence checks, the
retired-`/questions`-route and no-duplicate-URL checks, and two tests
proving the exact-match technique itself fails on a missing or an extra
route. `test/teaching.test.ts` (24), `test/flashcardDeck.test.ts` (19 —
+4 in M1-r for S2 non-array/conversion-poison totality and the S3 all-12
canonical-order-parity assertion), `test/content.test.ts` (4 — new in
M1-r: the S3 exact canonical first-ten id/front pinning through the
loader's real composition and the S1 slug-join), `test/atomicExport.test.ts`
(8 — new in M1-r: the S6 stage/validate/publish helper, incl. the
single-pointer atomic publish and the reader-layout install/migration/repair),
`test/multiScan.test.ts`
(6 — new in the re-review round: the Rabin–Karp leak-gate scanner that
replaced the ~90s per-pattern sweep), `test/canonicalDeck.test.ts` (3),
`test/canon.test.ts` (12),
`test/freeManifestExclusion.test.ts` (19), `test/samplerManifest.test.ts`
(7), `test/firebase-redirects.test.ts` (14 — +13 in M1-r: every legacy
`/chapter-N` destination for S5), `test/flashcardSamplerLeakGate
.test.tsx` (3), `test/signInPlacement.test.tsx` (2), `test/primaryCta
.test.tsx` (2), `test/spokeNavIcons.test.tsx` (2), and
`test/check-paid-leak.test.ts` (26, extended repeatedly through the
remediation round, never altered to hide a failure — see §7). Expected
`PAID-CONTENT LEAK GATE FAILED` diagnostics appear on stderr from the
deliberately-failing fixture cases across several of these files — this is
intentional output from passing tests asserting the gate fails closed, not
a problem.

### Build (`npm run build`, live Firestore, real service-account export)

Re-run on the M1-r tree (the paid/free manifests are field-level since B2,
so the fingerprint counts are higher than the original commit's single
concatenated-field counts; the leak-gate wording is B4's exact-canonical-
sampler assertion, not the original "≤10 cards" phrasing). Each leak-gate
invocation now completes in ~3–4s (the standalone gate; the full `npm run
build` finishes in ~22s wall) — the re-review round replaced the per-pattern
`String.includes` sweep, which took ~90s on this real export and could be
killed by a CI timeout before reporting, with a single Rabin–Karp pass per
artefact (see §7 and `scripts/lib/multiScan.mjs`):

```
> npm run export-content
Exported 240 free questions across 12 chapters, 732 flashcards, paid manifest: 21458 content-scope + 21772 public-scope field-level text fingerprints (gitignored); 410 paid field fingerprint(s) indistinguishable from full free content (content/ scope), 96 indistinguishable from genuinely public teaching/sampler content (out/ scope) — both covered by the ID check only; free-question manifest: 1158 field-level text fingerprints (gitignored); 13 free field fingerprint(s) textually indistinguishable from approved teaching/sampler content — covered by the ID check only.

> npm run check-paid-leak (prebuild)
Paid-content leak gate PASSED — 25 artefact(s) scanned against 4596 paid ids + 21458 content-scope/21772 public-scope text fingerprints; exported question files structurally free-only; zero questions and an exact canonical flashcard sampler confirmed in the public export.

> next build
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 1780ms
  Running TypeScript ...
  Finished TypeScript in 1755ms ...
✓ Generating static pages using 9 workers (195/195) in 565ms

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
Paid-content leak gate PASSED — 1927 artefact(s) scanned against 4596 paid ids + 21458 content-scope/21772 public-scope text fingerprints; exported question files structurally free-only; zero questions and an exact canonical flashcard sampler confirmed in the public export.
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
  a slug scheme this milestone does not implement. At the initial M1 commit
  these were left untouched and flagged for Anusha; **M1-r (S5) repoints
  them to the numeric hub route (`/chapters/N`)** so old bookmarks and
  indexed URLs 301 to a real page — see §5 and §7.
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

- The 12 pre-existing `/chapter-N.html` legacy redirects in `firebase.json`
  previously pointed at a `/chapters/N-slug` scheme this milestone never
  implemented, so every one 301'd to a 404. **Resolved in M1-r (S5):** they
  now redirect to the numeric hub route that exists (`/chapters/N`), pinned
  by `test/firebase-redirects.test.ts`. This adopts the numeric scheme the
  hub pages actually use; if Anusha later prefers a slugged hub URL scheme,
  that is an M8 release-audit decision, not an M1 gap.
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

## 7. Remediation log (M1-r)

Codex's initial M1 review (archived verbatim at
`docs/codex-reviews/M1_INITIAL_REVIEW.md`) returned ten BLOCKERs, six
SHOULD-FIXes, and one NIT. Each was fixed exactly as scoped; no scope was
expanded. All §0.11 gates are green in both required states (§2): clean
pre-build `lint`/`typecheck`/`test` (163 passed / 6 skipped), the live
Firestore `export-content` → prebuild leak gate → `next build` (195 pages:
12 hubs + 169 spokes) → postbuild leak gate (1,927 artefacts).

### BLOCKERs B1–B10 — RESOLVED and independently Codex-verified

B1–B10 were remediated and each independently verified RESOLVED by Codex in
named targeted passes before this round; the exact verification text lives in
`docs/ARNREADY_WEBSITE_REVIEW_LOG.md` (M1 remediation tracker + decision
history), not here. This round did not touch that work, and re-running the
full suite plus the live build/leak gates on the current tree confirms no
regression: the field-level fingerprint gate (B2), fail-closed free manifest
(B3), exact-canonical-sampler assertion (B4), status/entitlement deck
exclusion (B5), spoke sign-in placement (B6), centralized copy (B7),
functional primary CTA (B8), text-only nav (B9), and deterministic sitemap
fixture (B10) all still pass.

### SHOULD-FIXes and NIT fixed in this round

- **S1 — teaching↔deck join by slug identity.** `publishedSubtopics`
  previously ordered teaching by matching the teaching **display string**
  against the deck's display strings (`order.indexOf(a.subtopic)`), so a
  valid label differing only in capitalization landed at `-1` and got zero
  cards; the spoke likewise filtered its sampler share by display-string
  equality. Now `src/lib/content.ts` walks the canonical deck sections (in
  order) and attaches each section's approved teaching by **slug**
  (`subtopicSlug(section.subtopic)`), exposing the **deck** section's title
  as the display `subtopic` (app contract). The spoke filters its share by
  `subtopicSlug(c.subtopic) === entry.subtopicSlug`. The pure composition was
  split out as `buildChapterContent`/`orderPublishedSubtopics` so it is
  testable without an on-disk export. Covered by `test/content.test.ts`
  (case-mismatched labels resolve, in canonical order, with the deck title
  and a non-empty share).
- **S2 — deck helper totality.** `scripts/lib/canonicalDeck.mjs` now guards a
  non-array root (`Array.isArray(rawSections) ? … : []`) and routes every
  subtopic coercion — in `subtopicSlug`, `orderSections`, the not-public
  diagnostic, and section mapping — through a total `safeString` that returns
  `''` for conversion-poison values (`{toString:null,valueOf:null}`) instead
  of throwing. A single malformed Firestore doc can no longer abort the whole
  static build. Covered by four new `test/flashcardDeck.test.ts` cases
  (non-array roots; poison subtopic; poison `subtopicSlug`).
- **S3 — exact sampler pinning + all-chapter order parity.**
  `test/content.test.ts` pins the exact canonical first-ten card **ids and
  fronts** through the loader's real composition (`buildChapterContent`,
  which applies the same canonical order + `SAMPLER_SIZE` slice
  `loadChapterContent` uses). `test/flashcardDeck.test.ts` adds an all-12
  parity assertion: each chapter's canonical subtopics, fed in reversed
  input order, must be restored to `flashcardOrder.json`'s order — a
  card/section reversal in any chapter now fails.
- **S4 — count-aware spoke copy + truthful zero-share message.** The spoke
  no longer reuses the hub's "Try 10 flashcards from this chapter"; it uses
  `chapters.spoke.samplerHeading(count)` → "Try N sampler flashcard(s) from
  this topic" (verified in the built HTML: "Try 3…", "Try 7…"). The
  zero-share message is now truthful — "The chapter's 10 sampler flashcards
  come from other topics — this one's cards are in the full deck." — instead
  of implying a pending upload. The hub still shows "Try 10 flashcards from
  this chapter".
- **S5 — legacy redirects land on real routes.** The 12 `/chapter-N`
  redirects in `firebase.json` now target `/chapters/N` (the numeric hub
  route that exists) instead of the never-implemented `/chapters/N-slug`
  scheme. `test/firebase-redirects.test.ts` asserts every one of the 12
  destinations and that no chapter redirect points at a slugged scheme.
- **S6 — atomic export replacement.** `scripts/export-content.mjs` builds the
  whole export into an inactive generation slot, validates it, then makes it
  live so a chapter dropped from Firestore leaves no stale `.raw.json` (and no
  stale public route) behind. The publish mechanism was hardened across three
  re-review rounds and its final, crash-safe form is described under
  **Re-review round 3** below; the helpers live in
  `scripts/lib/atomicExport.mjs` (unit-testable without a credential), covered
  by `test/atomicExport.test.ts`.
- **N1 — active breadcrumb crumb.** The terminal breadcrumb on both the hub
  and the spoke now carries `aria-current="page"` (verified in the built
  HTML for `/chapters/1` and a spoke).

### Re-review round 1 (Codex REJECT of the first M1-r commit)

Codex re-reviewed the first M1-r commit and raised one BLOCKER and one
SHOULD-FIX.

- **BLOCKER — leak gate did not complete reliably.** After B2 made the paid
  manifest field-level, the gate scanned ~1,900 artefacts against ~21.5k/21.8k
  fingerprints (+ 4.6k ids, + free manifest) with a per-pattern
  `String.includes` sweep — O(artefacts × patterns × textlen), ~90s of CPU on
  the real export and climbing with content, so a CI/build host could kill it
  before it reported (Codex saw `npm run build` stop after the prebuild gate,
  never reaching `next build`/postbuild). Fixed by replacing the sweep with a
  single Rabin–Karp rolling-hash pass per artefact
  (`scripts/lib/multiScan.mjs`): each pattern set is indexed by the hash of
  its shortest-length anchor, the text is scanned once in O(textlen), and hash
  hits are verified with `startsWith` — so a collision costs an extra verify,
  never a miss or false positive. Memory is O(patterns), far below an
  Aho–Corasick trie over these long fingerprints. **Measured: 90.3s → 3.5s for
  the standalone gate on the identical export; the full `npm run build` (both
  gates + 195-page generation) completes in ~22s wall.** The gate's semantics
  are unchanged — the 26 fail-closed fixtures in `test/check-paid-leak.test.ts`
  and the B5 forced-render leak test still pass, proving detection is intact —
  and `test/multiScan.test.ts` (6) pins scanner correctness incl. start/end
  matches, mixed-length patterns, hash-collision rejection, and a 5,000-pattern
  / ~270k-char large-input case that would be intractable for the old scan.
- **SHOULD-FIX (round-1 attempt, superseded) — `commitStaging` atomicity.**
  The original version deleted each live directory before renaming its
  replacement. Round 1 made `commitStaging` transactional against *thrown*
  errors — move each live tree to a `.previous` backup, swap staging in, delete
  backups only after all pairs succeed, roll back on any exception. Codex's
  round-2 re-review correctly found this still not crash-safe: two independent
  directory renames can never be one atomic unit, so a `SIGKILL` between them
  can still leave `content/` missing or the two trees from different
  generations. Fully resolved in round 2 below.

### Re-review round 2 (Codex APPROVE AFTER FIXES of `9b759e3`)

Codex confirmed the leak-gate BLOCKER resolved (lint, typecheck, all tests,
live build with both leak scans over 1,927 artefacts) and left one SHOULD-FIX.

- **SHOULD-FIX — export publish is now atomic against a crash.** Per Codex's
  preferred option (“publish both trees beneath one versioned parent and
  atomically switch a single pointer”), both reader trees are now published
  under ONE generation directory and made live by switching a single symlink:

  ```
  content     -> .export/current/content
  .leakcheck  -> .export/current/leakcheck
  .export/current -> genA | genB          (the only thing that ever switches)
  ```

  `export-content` builds the whole export into the inactive slot
  (`stageGeneration`), validates it (`validateStagedGeneration`), then calls
  `publishGeneration`, whose ONLY publish step is a single `rename()` of a new
  symlink onto `.export/current` — POSIX-atomic, so BOTH `content/` and
  `.leakcheck/` switch generations together in one step. A crash before the
  rename leaves the previous generation fully live; a crash after it leaves the
  new one fully live. There is no window where the trees are mixed or missing,
  so no recovery pass is needed. Generations ping-pong between two slots (at
  most current + one previous on disk; the previous is a free rollback point).
  The reader code (`src/lib/content.ts`, `scripts/check-paid-leak.mjs`) is
  unchanged — it still reads `content/` and `.leakcheck/`, now symlinks that
  Node follows transparently. Steady-state publishing is atomic. **Gap left for
  round 3:** in this version `publishGeneration` switched `current` and *then*
  replaced the reader symlinks, so the very first real-dir→symlink migration
  still touched the two reader paths separately.

### Re-review round 3 (Codex APPROVE AFTER FIXES of `64bdf34`)

Codex confirmed steady-state publishing is atomic and flagged one residual
SHOULD-FIX: the first real-directory→symlink migration was not atomic —
switching `current` and then replacing `content/` and `.leakcheck/`
separately meant a crash between them could leave the two paths from different
generations, or a kill between `rmSync`/`symlinkSync` could leave a path
missing.

- **SHOULD-FIX — the reader symlinks are now installed BEFORE any publish, and
  migration is idempotent/recoverable.** A new `ensureReaderLayout(root,
  exportDir)` runs at the very start of `export-content`, before it stages or
  publishes anything. It guarantees `content/` and `.leakcheck/` are the stable
  symlinks and performs the one-time legacy migration by capturing any
  pre-existing real reader dirs into ONE generation (both trees into the SAME
  slot, via `rename`) and pointing `current` at it with a single atomic switch
  — so the two trees can never be captured into different generations. It is
  fully idempotent and recoverable: a crash mid-migration can only leave a
  transient MISSING reader path (never a mixed generation), and the next
  `export-content` startup re-reconciles it before anything reads. Because the
  reader symlinks already exist by the time `publishGeneration` runs,
  `publishGeneration` now does nothing but the single atomic `current` switch —
  it never touches the reader paths (satisfying Codex's “only switch `current`
  after both stable reader symlinks already exist”). Covered by 7
  `test/atomicExport.test.ts` cases including fresh-env install-before-publish,
  legacy real-dir→symlink migration capturing both trees into one generation,
  and idempotent recovery of a partial migration (`current` bootstrapped, reader
  symlinks not yet installed), plus a wrong-pre-existing-symlink repair. The
  reader symlinks are also installed/replaced atomically (built at a temp path
  and `rename`d onto the reader path), so even repairing a tampered link never
  leaves the reader path missing. Verified live: fresh-from-empty export;
  legacy real `content/`/`.leakcheck/` dirs migrated into the symlink layout;
  three back-to-back exports ping-ponging `current` genB→genA→genB with the
  reader paths valid throughout; and `npm run build` re-publishing with both
  leak gates passing and 195 pages generated.

No `firestore.rules`, app-repo `functions/`, scoring constant, `/app/*`
route, or new npm dependency was touched in any M1-r round.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
