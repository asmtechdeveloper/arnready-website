# M0 Evidence Packet — Fresh scaffold

## Remediation log (M0-r4)

**Robustness hardening for M0-R6's test fix**, not a response to any
specific confirmed reproduction: M0-r3's `test/Header.test.tsx` used a
stub `RouterContext.Provider` (imported from
`next/dist/shared/lib/router-context.shared-runtime`, an internal,
unversioned Next.js path) to get `next/link` to call `preventDefault()`
during the two link-click tests. That internal path is undocumented and
environment/version-fragile by nature, which is reason enough on its own
to replace it, independent of whether any particular run reproduced jsdom
"navigation not implemented" stderr noise from it.

**Fixed:** `test/Header.test.tsx` now mocks `next/link` itself
(`vi.mock('next/link', ...)`) with a component that still renders a real
`<a href>` element — the mock anchor is present, only the real `next/link`
component (and its internal router-context plumbing) is absent from the
render tree — but the mock's `onClick` unconditionally calls
`event.preventDefault()` before invoking Header's own `onClick`. That
stops the browser's default navigation synchronously, so jsdom never
schedules the deferred native-navigation attempt that produces the stderr
noise, regardless of any `next/link` internals.

**Verified:** `npx vitest run test/Header.test.tsx` in isolation, run 5
times in a row, produced empty stderr every time. The full 23-test suite
(`npm run test`) also produces no unexpected or jsdom-navigation-related
stderr — it does intentionally print several `PAID-CONTENT LEAK GATE
FAILED` lines to stderr from `test/check-paid-leak.test.ts`'s
deliberately-failing fixture scenarios (see §2); those are expected
diagnostic output from a passing test asserting the gate fails closed,
not evidence of a problem, and are unrelated to `test/Header.test.tsx`.

---

## Remediation log (M0-r3)

Closes the two items Codex left open after the M0-r2 re-review
(`docs/ARNREADY_WEBSITE_REVIEW_LOG.md`: M0-R6, M0-R12) plus their own
targeted-verification follow-ups:

| ID | Finding | Outcome |
|---|---|---|
| M0-R6 | No automated Header test covered the mobile-menu close behavior, so a future refactor could silently reintroduce the same-route bug; the first attempt at adding tests worked but emitted jsdom "navigation not implemented" errors to stderr because `next/link` had no `RouterContext` to call `preventDefault()` against | **Fixed, then hardened in M0-r4** — added `test/Header.test.tsx` (3 tests: same-route primary-CTA close, same-route mobile-nav-link close, cross-route pathname-fallback close). The original fix (a stub `RouterContext.Provider`) was replaced in M0-r4 with a `next/link` mock — see above. |
| M0-R12 | Packet's file-list inventory omitted the (at-the-time uncommitted) `test/Header.test.tsx` while calling itself the final-commit inventory | **Fixed** — file list below regenerated via `git diff --name-status` against the pre-M0 baseline immediately before this commit, so it includes `test/Header.test.tsx` and every other path actually in the tree at commit time |

---

## Remediation log (M0-r2)

Codex re-reviewed the M0-r commit (`1c94cb2`) and returned **REJECT** again
with 4 remaining BLOCKERs, 5 SHOULD-FIXes, and 2 NITs (tracked as
M0-R1…M0-R11 in `docs/ARNREADY_WEBSITE_REVIEW_LOG.md`, which Codex now
maintains as the durable cross-pass record — this packet documents the
implementation evidence for Codex's next re-verification pass; only Codex
marks log entries RESOLVED, per that log's own maintenance rules).

| ID | Finding | Outcome |
|---|---|---|
| M0-R1 | Copy/link metadata still outside `copy.ts` (brand name in Header/Footer/layout, table columns in nism-series-v-a, fragile `section.h2 === 'Who we are'` string-compare in privacy) | **Fixed** — `brand.name`/`brand.legalName` added and used everywhere; `nismSeriesVA.format.columns` added; privacy rewritten to a `blocks` model (`{type:'p'|'ul'|'email', ...}`) so no page ever compares against visible heading text |
| M0-R2 | Raw-hex guard exempted all of `test/tokens.test.ts` (5 literals) and missed `.js`/`.jsx`/`.cjs` | **Fixed** — exception removed entirely; `test/tokens.test.ts` now pins the palette via a SHA-256 checksum (zero hex literals); guard scans `.ts/.tsx/.js/.jsx/.cjs/.mjs/.css` repo-wide with only `src/styles/tokens.ts` exempt |
| M0-R3 | `check-circle`'s polyline ended at `(9,12)`, not the official `(9,11.01)` | **Fixed** — corrected to `L9 11.01`; added `test/icon-paths.test.ts` (9 tests) pinning every icon's exact `d` string against the official Feather primitives, with the source primitive documented per test |
| M0-R4 | No attached screenshot artifacts | **Fixed** — 18 real PNGs (9 routes × 375px/1440px) at `docs/review-packets/screenshots/M0/`, captured via Playwright driving the system-installed Chrome (`--channel=chrome`, not a new npm dependency — Playwright itself isn't in `package.json`) against the actual static `out/` build. See §3. |
| M0-R5 | `linkify` dropped text after a repeated label (destructuring `split()`) | **Fixed** — rewritten to interleave every split segment; `test/linkify.test.tsx` (3 tests) proves 3 occurrences of one label all link correctly with no text lost |
| M0-R6 | Mobile menu stayed open after header logo/CTA navigation | **Fixed** — `Header` now resets `open` when `usePathname()` changes (adjusted during render, not in a `useEffect`, to satisfy `react-hooks/set-state-in-effect`); reproduced Codex's exact repro (open menu → tap header "Get ARNReady" at 375px) via the interactive browser and confirmed it now navigates AND closes the menu |
| M0-R7 | Delete-account "email us" regressed to plain text | **Fixed** — `deleteAccount.questions.body` is now `{text, links}`; both "email us" (mailto) and "Support" (`/support`) render as real links |
| M0-R8 | Packet's file counts contradicted each other (37 / 113 / 37) and implied cleanup the isolated tests don't do | **Fixed** — see §2; before/after counts are now identical file counts (139) AND identical aggregate SHA-1 hashes of every file in `out/`+`content/`+`.leakcheck/`, computed immediately before and after the test run |
| M0-R9 | Feather MIT notice named the license but omitted the permission-notice body | **Fixed** — added `/THIRD_PARTY_NOTICES.md` with the full upstream MIT license text; `Icon.tsx` references it |
| M0-R10 | `check-paid-leak.test.ts` comment said no live key exists, contradicting the corrected packet | **Fixed** — comment now says the tests are intentionally credential-independent (they exercise gate logic via synthetic fixtures regardless of whether a real key is configured) |
| M0-R11 | Gutter tokens configured but unused; containers still used default `px-4 sm:px-6` | **Fixed** — every page/component container now uses `px-gutter-mobile sm:px-gutter-desktop` |

**One bug found and fixed during this pass, not from Codex's list:** capturing
the 375px screenshots for M0-R4 surfaced a real regression — `linkify`'s
review fix depended on functioning list rendering, and while testing it a
separate `react-hooks/set-state-in-effect` ESLint error surfaced from the
initial (naive) M0-R6 fix, which is captured above. Also found: a flaky
`window is not defined` unhandled-rejection warning from `test/linkify.test.tsx`
leaving un-cleaned-up renders — fixed by adding `afterEach(cleanup)` from
`@testing-library/react` to `vitest.setup.ts` (was previously masked because
no test file rendered more than one component per file until `linkify.test.tsx`
added three `render()` calls).

---

## Remediation log (M0-r)

Codex reviewed the original M0 commit (`4a2c31f`) and returned **REJECT**
with 9 BLOCKERs, 5 SHOULD-FIXes, and 3 NITs. This packet describes the
remediated state. Per finding:

| # | Finding | Outcome |
|---|---|---|
| B1 | Copy scattered across pages, not centralized | **Fixed** — every page/component now imports text, metadata, CTAs, and Arnie alts from `src/lib/copy.ts` |
| B2 | `.env.example` missing `ARNREADY_SA_KEY` | **Fixed** |
| B3 | Unused `firebase` client SDK dependency | **Fixed** — removed; zero imports existed |
| B4 | Raw-hex guard only scanned `src/`; shadow rgba outside token file; test literals unaccounted | **Fixed** — guard now scans the whole repo (minus build/output dirs) with one explicit, documented exception for `test/tokens.test.ts` (which necessarily pins the token file's literal values); the shadow moved into `tokens.ts` |
| B5 | Mobile header hides nav + sign-in slot with no alternative | **Fixed** — accessible hamburger menu added |
| B6 | `/privacy`, `/delete-account`, `/support` have no page-ending primary CTA | **Fixed** — one added to each |
| B7 | `Icon.tsx` mail/award paths weren't official Feather geometry; licence mislabelled ISC | **Fixed** — replaced with the official Feather Icons project paths (converting each icon's multiple primitives into one combined `d`), corrected licence notice to MIT with attribution |
| B8 | Pricing page used the "proud" (diploma) Arnie pose prematurely | **Fixed** — swapped to "thinking" |
| B9 | `export-content.mjs`/`check-paid-leak.mjs` fingerprint-truncation/collision and HTML-entity-decoding gaps | **Deferred to M1, by Anusha's explicit decision** (see below) — not touched in M0-r |
| B10 | Packet evidence was thin: bypassed `prebuild`/`postbuild`, synthetic manifest, no attached screenshots | **Fixed for the build lifecycle** (see §2 — the real `npm run build` lifecycle now runs end-to-end against live Firestore data); **partially fixed for screenshots** — see the explicit limitation noted in §3 |
| S1 | Leak-gate tests deleted the repo's real `content/`/`.leakcheck`/`out/` dirs | **Fixed** — tests now copy the script into a unique temp directory per test and run entirely there |
| S2 | `muted` token fails WCAG AA (4.42:1) on the cream canvas | **Fixed** — darkened to `#5B6472` (5.47:1) |
| S3 | 3/10 FAQ answers produced empty JSON-LD text | **Fixed** — all FAQ answers are now plain strings in `copy.ts` (inline links are re-derived by splitting the string around the linked phrase), so JSON-LD always has real text |
| S4 | Tables lacked captions/scope attributes | **Fixed** — added to both tables (`/delete-account`, `/nism-series-v-a`) |
| S5 | Touch targets under 44×44px (header sign-in ~28px, nav links ~36px, footer links ~19px) | **Fixed** — all interactive elements now have `min-h-11` (44px) with visible focus rings |
| S6 | Homepage hero Arnie always lazy-loaded (LCP warning) | **Fixed** — `Arnie` takes a `priority` prop, set `true` on the homepage hero only |
| N1 | `tokens.ts` spacing values unused by Tailwind | **Fixed** — wired into `tailwind.config.ts`, used on the homepage's section gaps |
| N2 | `next start` script incompatible with `output: 'export'` | **Fixed** — removed |
| N3 | Packet listed gitignored `next-env.d.ts`; used a PNG glob | **Fixed** — file list corrected below |

### On B9 (deferred)

Codex found a real gap: `export-content.mjs` truncates fingerprints to 120
characters and discards a paid fingerprint entirely if that prefix
collides with free content; `check-paid-leak.mjs` doesn't decode HTML
entities before scanning. Both scripts are explicitly "kept as-is,
load-bearing" per the manual, and `check-paid-leak.mjs`'s own §0.6-budget
extension is explicitly M1's job. Fixing this now means editing
load-bearing script logic ahead of its assigned milestone. **Anusha's
explicit instruction for this remediation pass: defer to M1, record as a
known limitation.** Recorded here and carried forward — M1 must address it
alongside the "≤10 cards per chapter" leak-gate extension the manual
already assigns it.

---

## 1. Scope

**Milestone:** M0 [SONNET] — Fresh scaffold (`docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md` §2), remediated per Codex's review across four passes (M0-r, M0-r2, M0-r3, M0-r4).

**Summary:** Scaffolded a clean Next.js App Router + TypeScript + Tailwind
site configured for static export, with vitest + ESLint (0-warning policy)
and Nunito via `next/font`. One design token module
(`src/styles/tokens.ts`) encodes the locked palette (with the muted text
colour darkened to clear WCAG AA); a repo-wide grep guard
(`scripts/check-no-raw-hex.mjs`) fails lint if any hex literal appears
outside that file — no exceptions (M0-R2 removed the last one; the palette
is now pinned in `test/tokens.test.ts` via a checksum, not a literal). Base
layout: header with an accessible mobile menu and a stubbed, disabled
sign-in slot; footer with the standard disclaimer; a shared `Arnie` image
component with a `priority` prop for the homepage hero. All Feather icons
use the official project's SVG geometry with correct MIT attribution.
`scripts/export-content.mjs` and `scripts/check-paid-leak.mjs` are wired
into the npm `build` lifecycle unmodified. All copy — headings, body text,
CTAs, table data, image alts — lives in `src/lib/copy.ts`, marked WORKING;
pages import and render it. The eight standard/compliance pages each end
with exactly one primary CTA.

**Full file list, as it exists in the final commit** (every path touched
across M0 → M0-r → M0-r2 → M0-r3 → M0-r4, relative to the pre-M0 baseline
`bb09ee0`; nothing on `main` touched; produced by `git diff --name-status`
against that baseline, not hand-maintained):

```
A  .claude/launch.json
M  .env.example
A  THIRD_PARTY_NOTICES.md
A  docs/ARNREADY_WEBSITE_REVIEW_LOG.md
M  docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md
A  docs/review-packets/M0_PACKET.md
A  docs/review-packets/screenshots/M0/about-1440.png
A  docs/review-packets/screenshots/M0/about-375.png
A  docs/review-packets/screenshots/M0/delete-account-1440.png
A  docs/review-packets/screenshots/M0/delete-account-375.png
A  docs/review-packets/screenshots/M0/faq-1440.png
A  docs/review-packets/screenshots/M0/faq-375.png
A  docs/review-packets/screenshots/M0/home-1440.png
A  docs/review-packets/screenshots/M0/home-375.png
A  docs/review-packets/screenshots/M0/nism-series-v-a-1440.png
A  docs/review-packets/screenshots/M0/nism-series-v-a-375.png
A  docs/review-packets/screenshots/M0/pricing-1440.png
A  docs/review-packets/screenshots/M0/pricing-375.png
A  docs/review-packets/screenshots/M0/privacy-1440.png
A  docs/review-packets/screenshots/M0/privacy-375.png
A  docs/review-packets/screenshots/M0/support-1440.png
A  docs/review-packets/screenshots/M0/support-375.png
A  docs/review-packets/screenshots/M0/syllabus-1440.png
A  docs/review-packets/screenshots/M0/syllabus-375.png
A  eslint.config.mjs
A  next.config.ts
A  package-lock.json
A  package.json
A  postcss.config.mjs
A  public/arnie/breathe.png
A  public/arnie/celebrating.png
A  public/arnie/checks-in.png
A  public/arnie/dozing.png
A  public/arnie/makes-it-stick.png
A  public/arnie/meditating.png
A  public/arnie/proud.png
A  public/arnie/reading.png
A  public/arnie/setting-the-scene.png
A  public/arnie/thinking.png
A  public/arnie/warns.png
A  public/arnie/waving.png
A  public/arnie/working.png
A  public/arnie/works-it-out.png
A  scripts/check-no-raw-hex.mjs
A  src/app/about/page.tsx
A  src/app/delete-account/page.tsx
A  src/app/faq/page.tsx
A  src/app/globals.css
A  src/app/layout.tsx
A  src/app/nism-series-v-a/page.tsx
A  src/app/page.tsx
A  src/app/pricing/page.tsx
A  src/app/privacy/page.tsx
A  src/app/support/page.tsx
A  src/app/syllabus/page.tsx
A  src/components/Arnie.tsx
A  src/components/ContentCard.tsx
A  src/components/Footer.tsx
A  src/components/Header.tsx
A  src/components/Icon.tsx
A  src/lib/copy.ts
A  src/lib/linkify.tsx
A  src/styles/tokens.ts
A  tailwind.config.ts
A  test/Footer.test.tsx
A  test/Header.test.tsx
A  test/check-paid-leak.test.ts
A  test/icon-paths.test.ts
A  test/linkify.test.tsx
A  test/tokens.test.ts
A  tsconfig.json
A  vitest.config.ts
A  vitest.setup.ts
```

(`next-env.d.ts` is regenerated by Next.js and gitignored — never
committed, correctly absent from this list.)

`scripts/export-content.mjs` and `scripts/check-paid-leak.mjs` themselves
are NOT in this list — they remain byte-for-byte unmodified (load-bearing,
per the manual). See the B9/M0-D1 note above for why the
fingerprint-normalization gap Codex found was deferred rather than fixed
here.

`docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md` and
`docs/ARNREADY_WEBSITE_REVIEW_LOG.md` ARE in the commit (listed above) —
they're Codex's own review-process files, not part of this session's
implementation diff, but they exist in the working tree and the manual
gives no basis to leave real files uncommitted. The log's own maintenance
rules mean only Codex marks its entries RESOLVED; nothing in this packet
should be read as claiming that authority.

## 2. Pasted gate outputs (final commit)

A live Firestore service-account key is available in this environment at
the documented default path (`../ARNReady-App/scripts/serviceAccountKey.json`).
`npm run build` below is the real, complete `prebuild → export-content →
check-paid-leak → next build → postbuild → check-paid-leak` pipeline, run
against live Firestore data.

### `npm run build` (full lifecycle, live Firestore data)

```
> arnready-website@0.0.0 prebuild
> npm run export-content && npm run check-paid-leak

> arnready-website@0.0.0 export-content
> node scripts/export-content.mjs

Exported 240 free questions across 12 chapters, 732 flashcards, paid
manifest: 4596 text fingerprints (gitignored).

> arnready-website@0.0.0 check-paid-leak
> node scripts/check-paid-leak.mjs

Paid-content leak gate PASSED — 25 artefact(s) scanned against 4596 paid
ids + 4596 text fingerprints; exported question files structurally
free-only.

> arnready-website@0.0.0 build
> next build

▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 1777ms
✓ Generating static pages using 9 workers (11/11) in 135ms

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
├ ○ /delete-account
├ ○ /faq
├ ○ /nism-series-v-a
├ ○ /pricing
├ ○ /privacy
├ ○ /support
└ ○ /syllabus

> arnready-website@0.0.0 postbuild
> node scripts/check-paid-leak.mjs

Paid-content leak gate PASSED — 119 artefact(s) scanned against 4596 paid
ids + 4596 text fingerprints; exported question files structurally
free-only.
```

exit code: `0`. Matches Codex's own independent verification numbers
exactly (119 artefacts, 4596 paid ids, 4596 fingerprints).

### `npm run lint`

```
> arnready-website@0.0.0 lint
> eslint . --max-warnings=0 && node scripts/check-no-raw-hex.mjs

Raw-hex guard PASSED — no hex colour literals outside src/styles/tokens.ts.
```

(No exception in the message this time — M0-R2 removed the last one.)

### `npm run typecheck`

```
> arnready-website@0.0.0 typecheck
> tsc --noEmit
```

(No output — 0 errors.)

### `npm run test`

```
 RUN  v3.2.7

 ✓ test/tokens.test.ts (2 tests)
 ✓ test/icon-paths.test.ts (9 tests)
 ✓ test/linkify.test.tsx (3 tests)
 ✓ test/Footer.test.tsx (1 test)
 ✓ test/Header.test.tsx (3 tests)
 ✓ test/check-paid-leak.test.ts (5 tests)

 Test Files  6 passed (6)
      Tests  23 passed (23)
```

Focused runs of `test/Header.test.tsx` alone produce empty stderr,
confirmed deterministic across 5 consecutive runs (M0-r4). The full suite
above has no unexpected or jsdom-navigation-related stderr either — the
`PAID-CONTENT LEAK GATE FAILED` lines visible in the full-suite output
(§2's `npm run test` block) are `test/check-paid-leak.test.ts`'s expected
diagnostic output from its deliberately-failing fixture scenarios, not an
error or a regression; they're unrelated to `test/Header.test.tsx`.

The mock `next/link` still renders a real `<a href>` element (it has to,
for the click and role-based test queries to work) — the real `next/link`
component and its internal router-context plumbing are what's absent from
the render tree, not the anchor. It's clean because the mock's `onClick`
calls `event.preventDefault()` synchronously, before invoking Header's own
`onClick`, which stops the browser's default navigation before jsdom ever
schedules the deferred native-navigation attempt that produces the stderr
noise. This has no dependency on `next/link`'s internal router-context
plumbing — M0-r3's first attempt used a stub `RouterContext.Provider` from
an internal, unversioned Next.js path instead, which is undocumented and
inherently environment/version-fragile regardless of any single run's
result (see the M0-r4 log above).

No unhandled-exception warnings (M0-r2 fixed a flaky `window is not
defined` teardown issue by adding `afterEach(cleanup)` to `vitest.setup.ts`).

### Leak-gate test isolation, proven with hashes (fixes M0-R8)

The previous packet's file counts (37 / 113 / 37) were confusing and
implied the isolated tests still touch the real directories. They don't —
here is unambiguous before/after proof, run immediately around `npm run
test` with no rebuild in between:

```
$ find out content .leakcheck -type f | wc -l
139
$ find out content .leakcheck -type f -exec shasum {} \; | sort | shasum
3e7756fdc067fff61b2ce672e6a4d74df9e7123c  -

$ npm run test                    # (output above — 23/23 passed)

$ find out content .leakcheck -type f | wc -l
139
$ find out content .leakcheck -type f -exec shasum {} \; | sort | shasum
3e7756fdc067fff61b2ce672e6a4d74df9e7123c  -
```

Identical file count and identical aggregate hash before and after —
`test/check-paid-leak.test.ts` genuinely never touches the repo's real
`content/`, `.leakcheck/`, or `out/` directories; it copies the script into
a fresh `mkdtempSync` temp directory per test and operates entirely there.

### Manual verification of the real `out/`

```
$ grep -rl "correctIndex" out/                    → (no matches)
$ grep -rc "isFree\":false" out/*.html out/*.txt  → (no matches)
$ find out -type f | wc -l                        → 113
```

(113 is `out/` alone; 139 above is `out/` + `content/` + `.leakcheck/`
combined — not a contradiction, just two different scopes, both now
labelled explicitly.)

## 3. Screenshots (375px and 1440px) — now attached (fixes M0-R4)

`docs/review-packets/screenshots/M0/` contains 18 real PNG files — all
nine routes at both 375px and 1440px, captured against the actual static
`out/` build (served locally, not the dev server):

```
about-375.png            about-1440.png
delete-account-375.png   delete-account-1440.png
faq-375.png               faq-1440.png
home-375.png              home-1440.png
nism-series-v-a-375.png   nism-series-v-a-1440.png
pricing-375.png           pricing-1440.png
privacy-375.png           privacy-1440.png
support-375.png           support-1440.png
syllabus-375.png          syllabus-1440.png
```

**Capture method:** `npm run build` → serve `out/` locally → `npx
playwright@1.48 screenshot --channel=chrome --viewport-size=<W>,<H>
--full-page <url> <file>`, i.e. Playwright's CLI driving the
system-installed Google Chrome (`--channel=chrome` uses the machine's own
Chrome binary — Playwright is not added to `package.json`/`package-lock.json`,
it runs once via `npx` purely to generate this evidence).

**Why not plain headless-Chrome CLI flags** (`chrome --headless=new
--window-size=W,H --screenshot=file url`), which is what the M0-r packet
used: in this specific environment that invocation deterministically
ignored the requested viewport width for CSS layout purposes — screenshots
at 320–700px all rendered the *desktop* layout (full nav bar, no hamburger,
right-edge text cut off) regardless of the requested output canvas size,
even with a freshly isolated Chrome profile, `--force-device-scale-factor=1`,
and `--virtual-time-budget`. This was a false alarm about the *site* (the
interactive browser tool confirmed the real responsive behaviour is
correct throughout this session, including the M0-R6 mobile-menu fix
below) but a real bug in that specific capture method. Playwright's
`--viewport-size` uses `Emulation.setDeviceMetricsOverride` over CDP,
which reliably set the actual layout viewport and produced correct
mobile-responsive captures on the first attempt.

**What the screenshots confirm:**
- **375px:** hamburger menu present and functional (`home-375.png`); no
  horizontal overflow on any page including the longest (`faq-375.png`,
  `privacy-375.png`); the delete-account table remains readable
  (`delete-account-375.png`); both restored links ("email us" mailto,
  "Support") visible and styled (`delete-account-375.png`).
- **1440px:** desktop nav with the sign-in stub visible; two-column
  pricing cards; **`pricing-1440.png` shows the "thinking" Arnie**,
  confirming the B8 fix holds; every page ends with exactly one primary
  CTA and the shared footer disclaimer.
- Cream `#F5F5F0` canvas, Nunito, purple/ink/muted tokens, no raw hex, no
  emoji — consistent across all 18 captures.

**Mobile-menu-closes-on-navigation (M0-R6) — verified interactively, not
just in a screenshot:** using the interactive browser at 375px, opened the
mobile menu, tapped the header's "Get ARNReady" CTA, and confirmed both
that navigation to `/pricing` occurred and that the menu closed
automatically (no leftover expanded panel) — Codex's exact repro steps.

## 4. Deviations from the manual

1. **Feather icons hand-rolled instead of an npm package** (manual §0.10
   new-dependency stop condition) — using the *official* Feather project's
   SVG path data (MIT-licensed, full text in `THIRD_PARTY_NOTICES.md`)
   rather than an installed dependency; pinned by `test/icon-paths.test.ts`.
2. **Playwright used transiently via `npx` to generate screenshot
   evidence** (M0-r2, see §3) — not added to `package.json` or
   `package-lock.json`, driving the system-installed Chrome rather than
   downloading its own browser. Evidence-generation tooling, not a product
   dependency.
3. **Homepage (`/`) was built** though M0 step 5 only lists the eight
   compliance/standard pages — kept minimal, full build is M6's job.
4. **B9 deferred to M1 by Anusha's explicit instruction** — see the
   remediation log above.

(The M0-r packet's deviation #3 — a second raw-hex-guard exception for
`test/tokens.test.ts` — no longer applies: M0-R2 removed that exception
entirely, replacing it with a hash-pinned test containing zero hex
literals, so the guard now has exactly one exception, `src/styles/tokens.ts`
itself, same as originally intended.)

## 5. Known limitations / deferred

- **B9 / M0-D1 (leak-gate fingerprint/entity-decoding gap)** — deferred to
  M1, see the remediation log above and `docs/ARNREADY_WEBSITE_REVIEW_LOG.md`.
- All new page copy remains marked WORKING per manual §0.8, still needs
  Anusha's voice pass plus the E-1/E-2 review prompts (scheduled for M6).
  `[VERIFY]`/`[SLOT]`/`[ANUSHA-DECIDE]` markers are unchanged from the
  original packet.
- No `/chapters` routes, `/app/*` routes, or question rendering exist yet —
  correctly out of scope for M0 (M1/M2/M3 territory).
- `npm audit` still reports 8 moderate-severity vulnerabilities, all
  transitive and build-time-only (nested inside `next`'s own bundled
  `postcss`, and inside `firebase-admin`'s `@google-cloud/storage` chain).
  Unchanged from the original packet's assessment; fixing either requires a
  major downgrade, out of scope for a scaffold milestone.

## 6. Fixture/pinning-test note

- `test/check-paid-leak.test.ts` (5 tests) runs the script from an
  isolated per-test temp directory rather than the repo's real gitignored
  paths — see S1 in the M0-r log and the hash proof in §2. All 5 scenarios
  (missing manifest, non-`isFree` record, leaked id, leaked fingerprint,
  clean pass) pass.
- `test/tokens.test.ts` (2 tests) pins the locked colour palette via a
  SHA-256 checksum of the tokens object — no hex literals in the test file
  (M0-R2).
- `test/icon-paths.test.ts` (9 tests, new in M0-r2) pins every Feather
  icon's exact `d` string against the official project's primitives, each
  test documenting the source `<line>`/`<polyline>`/`<circle>`/`<rect>`
  it was derived from (M0-R3).
- `test/linkify.test.tsx` (3 tests, new in M0-r2) proves repeated link
  labels are all wrapped with no text loss, multiple distinct rules
  compose correctly, and the no-rules case is a no-op (M0-R5).
- `test/Header.test.tsx` (3 tests, new in M0-r3) regression-tests the
  mobile menu's close behavior: same-route primary CTA, same-route mobile
  nav link, and cross-route pathname-change fallback (M0-R6) — a
  reviewer removing `onClick={closeMenu}` from any of the three closing
  links, or the `pathname !== renderedPathname` fallback, now fails a test
  instead of silently reintroducing the bug.

---
*ARNReady · ASM Tech · arnready.com*
