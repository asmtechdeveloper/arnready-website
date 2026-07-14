# M1 Initial Codex Review — Verbatim Archive

Recovered from Anusha's saved Codex output on 14 Jul 2026. The review text
below is preserved verbatim and is the authoritative source for original
finding order and wording.

---

REJECT. The M1 commit is scope-clean and the current live-data build renders correctly, but several mandatory gates fail open and multiple §0/§1 rules are violated.

## BLOCKER

1. [src/lib/teaching.ts:106-138](</Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/lib/teaching.ts:106>) — Teaching normalization is not total. Non-array input and Firestore-representable values such as `{toString: null, valueOf: null}` in `status` or `type` throw during filtering/string interpolation. A malformed Firestore doc can therefore abort the entire static build instead of normalizing to `null`. Guard the root with `Array.isArray`, avoid coercing untrusted diagnostic values, add a defensive boundary, and test conversion-poison objects.

2. [scripts/lib/canon.mjs:33-44](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/scripts/lib/canon.mjs:33), [scripts/check-paid-leak.mjs:75-121](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/scripts/check-paid-leak.mjs:75) — Question fingerprints cannot detect realistically rendered questions. The fingerprint concatenates stem plus every option, but normal `<p>`/`<li>` markup inserts tag names between them after canonicalization; stems, individual options, and explanations are unprotected. Using a real exported question, a full HTML rendering, stem-only rendering, and explanation-only rendering all failed to match. Manifest and scan each protected field independently and add normal React/Next serialization fixtures. The one-pass entity decoder should also cover double-escaped source entities.

3. [scripts/check-paid-leak.mjs:101-121](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/scripts/check-paid-leak.mjs:101), [test/check-paid-leak.test.ts:190-203](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/test/check-paid-leak.test.ts:190) — Free-question protection is optional. If `free-question-manifest.json` is missing or malformed, the zero-free-question scan is silently skipped; the committed test even expects the gate to pass without that manifest. A partial export can therefore publish a free question while the gate reports “zero questions confirmed.” Require and validate a nonempty, current free manifest exactly like the paid manifest.

4. [scripts/check-paid-leak.mjs:125-150](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/scripts/check-paid-leak.mjs:125) — The flashcard gate proves only “at most ten marker strings,” not “the canonical first ten.” Ten arbitrary IDs from positions 11–20, absent markers, or colliding IDs pass. A regression from `slice(0, 10)` to `slice(10, 20)` would ship non-sampler cards undetected. Generate an expected canonical-sampler manifest and require exact hub equality plus valid spoke subsets; fail on missing, duplicate, or unexpected IDs.

5. [scripts/export-content.mjs:110-132](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/scripts/export-content.mjs:110), [src/lib/flashcardDeck.ts:78-95](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/lib/flashcardDeck.ts:78), [scripts/check-paid-leak.mjs:63-72](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/scripts/check-paid-leak.mjs:63) — The public flashcard path does not reject `status: "draft"` section docs or cards/docs carrying `isFree: false`. The exporter writes them unchanged, the deck filters only on `docType`, and the gate structurally checks questions only. If such a card lands in the first ten, it renders and the gate passes. Fail closed on prohibited status/entitlement fields and test the complete export-to-render path.

6. [src/app/chapters/[chapter]/[subtopic]/page.tsx:123-137](</Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/app/chapters/[chapter]/[subtopic]/page.tsx:123>) — Every spoke renders a sign-in prompt, violating §1’s placement rule that it appears after sampler card 10. All 169 spokes contain the prompt; 138 have no sampler card and the other 31 have only 1–8. Remove the prompt from spokes and use an allowed non-sign-in next action.

7. [chapter hub page:21-51](</Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/app/chapters/[chapter]/page.tsx:21>), [spoke page:31-97](</Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/app/chapters/[chapter]/[subtopic]/page.tsx:31>) — Metadata descriptions, fallbacks, visible labels, and ARIA strings such as `Breadcrumb`, `Chapter`, and `Subtopic navigation` are hardcoded outside the central WORKING copy module. Anusha’s voice pass could update `copy.ts` while search-result and screen-reader text remains unreviewed. Centralize these templates and labels in `copy.ts`.

8. [chapter hub page:86-100](</Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/app/chapters/[chapter]/page.tsx:86>), [spoke page:117-137](</Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/app/chapters/[chapter]/[subtopic]/page.tsx:117>) — The main content has no functional primary CTA: the sign-in button is disabled and the only actionable destination is a quiet text link. Thus the hub’s required sign-in “CTA” cannot perform any action, and all 181 hubs/spokes lack the §0.8 page-level primary CTA. Without adding forbidden M3 auth, promote one accurate pricing/app/chapter destination as the sole active primary action and keep sign-in clearly informational.

9. [spoke page:100,110](</Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/app/chapters/[chapter]/[subtopic]/page.tsx:100>) — Raw `←`/`→` glyphs are used as navigation icons despite §0.7’s Feather-only rule and become part of the accessible link name. Use the existing Feather `arrow-right` icon, rotated for Previous and marked decorative, or use text-only labels.

10. [test/sitemap.test.ts:6-18](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/test/sitemap.test.ts:6), [M1_PACKET.md:80-90](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/docs/review-packets/M1_PACKET.md:80) — The required test result does not reproduce in the prescribed clean §3 order. Before building, `npm test` reported 57 passed and 3 skipped because all sitemap tests depend on ignored generated content; the packet claims 60/60. A clean CI run could drop every chapter route and still go green. Use deterministic fixtures with no `skipIf`, assert the exact route set, and update the packet.

## SHOULD-FIX

1. [src/lib/content.ts:58-63](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/lib/content.ts:58), [spoke page:47-57](</Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/app/chapters/[chapter]/[subtopic]/page.tsx:47>) — Ordering and sampler filtering use teaching display text rather than canonical slug identity. A valid teaching label with different capitalization normalizes successfully but sorts at `-1` and receives zero cards. Join teaching to the canonical deck by `subtopicSlug` and use the deck title, matching the app contract.

2. [src/lib/flashcardDeck.ts:62-95](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/lib/flashcardDeck.ts:62) — The deck helper’s stated totality is incomplete: non-array roots and conversion-poison subtopics throw. Corrupt Firestore deck data can abort the build. Accept `unknown`, validate the root and string fields, and add malformed fixtures.

3. [test/flashcardDeck.test.ts:49-59](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/test/flashcardDeck.test.ts:49) — The sampler test checks only length and exclusion of one subtopic; it does not pin exact app-produced IDs/fronts through `loadChapterContent` or detect all-chapter order drift. A card reversal could pass. Add an app-derived exact first-ten fixture and an all-12 order parity assertion.

4. [spoke page:84-94](</Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/app/chapters/[chapter]/[subtopic]/page.tsx:84>), [src/lib/copy.ts:426-439](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/lib/copy.ts:426) — Every card-bearing spoke says “Try 10 flashcards” while displaying 1–8, and zero-share spokes imply cards are still pending even though the zero share is intentional. Use count-aware spoke copy and a truthful zero-share message.

5. [firebase.json:9-20](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/firebase.json:9) — All 12 legacy chapter redirects point to nonexistent slugged routes. After cutover, old bookmarks and indexed URLs will 301 to 404s. Redirect them to `/chapters/1` … `/chapters/12`, or implement the slug route scheme, and test every destination.

6. [scripts/export-content.mjs:36-38](/Users/anushamurthy/Projects/ARNReady/ARNReady-Website/scripts/export-content.mjs:36) — Export directories are created but never cleared or atomically replaced. If a whole chapter disappears from Firestore, its stale approved `.raw.json` can continue producing public routes. Build into a fresh temporary tree, validate it, then replace the old export.

## NIT

- [hub breadcrumb:47](</Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/app/chapters/[chapter]/page.tsx:47>), [spoke breadcrumb:70](</Users/anushamurthy/Projects/ARNReady/ARNReady-Website/src/app/chapters/[chapter]/[subtopic]/page.tsx:70>) — The current breadcrumb lacks `aria-current="page"`, so screen readers are not told which crumb represents the active page. Add it to the terminal crumb.

Independent positives: scope and branch discipline are clean; lint, typecheck, the live Firestore build, post-build and standalone leak scans pass; the build emits 12 hubs and 169 spokes; every hub currently contains the exact canonical first ten; chapter 1 and 12 match independent app-order calculations; `/questions` is absent; sitemap/robots/footer/title checks pass; and the app’s targeted teaching/deck suites pass 81/81. The current data happens to be safe, but the mandatory enforcement does not prove that safety.

**Verdict: REJECT.**
