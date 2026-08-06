# M6 Evidence Packet — Free mock + mistakes + progress surfaces

**Milestone:** M6 [STANDARD] (execution manual §2) — wire `/app/mock` (assembly
ported from app `mockService.js`/`quizEngine.ts` with fixture tests;
one-free-ever counter read/write through the M4 service only), `/app/mistakes`,
`/app/progress` to live data. Inherited from M2 (scope amendment): the mock
RESULTS screen carries the premium pitch block; wiring tests assert NO nudge
renders during a mock run or in the mistakes deck.

**Commit:** `M6: free mock, mistakes deck and progress surfaces` on
`web-product`. **Companion app-repo commit:** `e0e7323` (`Functions:
ensureUserDocument callable`) — see §3.

**Execution model:** orchestrated per the 16 Jul working arrangement. The
orchestrator decomposed the milestone into 11 atomic steps, executed the
sensitive cores itself (the Cloud Function, the `users/{uid}` write shape, the
`mockService` port, the client callable wiring, the mock results block), and
drove executor subagents for the [STANDARD] surface steps (mock assembly port,
mock player, mock pre-start surface, mistakes surface, progress surface) — one
step at a time, each diff reviewed and all §0.11 gates re-run before the next
step was released.

---

## 1. Scope — what M6 delivers

1. **The one-free-mock counter, cross-platform.** Web `mockService.ts` ported
   from app `services/mockService.js`: `canTakeMock` (LOCKED semantics —
   paid unlimited; free only if `freeMockConsumed !== true` AND empty
   `mockHistory`; a failed read THROWS to the error surface, never a silent
   eligible), `getMockHistory`, `recordMockAttempt` (`mockHistory` arrayUnion +
   `freeMockConsumed: true`, merge; ISO-string date by design; session log via
   the M4 `writeSessionLog`, mode `mock`). All Firestore access through the M4
   `ProgressBackend` seam — `appendMockAttempt` is the ONE root-document write
   in `src/`, shaped exactly as the deployed `mockHistoryUpdateIsValid()` rule
   polices.
2. **`ensureUserDocument`** — the M4-§6.3 open question, resolved by Anusha
   (2026-08-06, option a): a callable in the APP repo's `functions/` creates
   `users/{uid}` server-side for accounts that enter on the web (the deployed
   create rule demands client-written `isPaid:false`, which §0.9 forbids — so
   creation is server-side; no rules change). Web client invokes it once per
   sign-in (fire-and-forget) and the mock pre-start AWAITS it before enabling
   Start.
3. **Mock assembly ported with fixtures.** `assembleMock`, `tallyWeakSubtopics`,
   `tallyWeakChapters` ported verbatim into `src/lib/quizEngine.ts`; the golden
   generator (`scripts/gen-quizengine-golden.mjs`, live cross-repo import of the
   app module) extended with 11 new cases (30 total). `src/lib/mockConfig.ts`
   mirrors `MOCK_QUESTIONS`/`MOCK_DURATION_MIN`/`MOCK_PASS_MARK` (WORKING)/
   `MOCK_PASS_MARGIN`/`MOCK_CHAPTER_WEIGHTS` by citation (app `config.js`
   imports RN assets, so no live import — the nudgeGates precedent), pinned by
   `test/mockConfig.test.ts`.
4. **`/app/mock`** — pre-start (PreMock parity: awaited user-doc gate,
   eligibility + history, free banner, instructions, used-state with
   nudge-law pitch, error-state-never-the-pitch), the 100-question/120-minute
   player (palette grid, flagging, keyboard operation, confirm flows,
   auto-submit, beforeunload guard, recorded on submit ONLY), and the results
   block (verdict bands off the pass mark, history stats, weightage-sorted
   weak-chapter chips, and the premium pitch — free users only).
5. **`/app/mistakes`** — chapter picker with active counts; per-chapter
   re-attempt run (`getActiveMistakes` + `loadMistakeQuestions` ported,
   PER-DOCUMENT question gets per the rules constraint, one bad doc drops one
   card), retire-streak feedback, recorded via
   `recordPracticeSession(source: 'mistakes')`. Zero nudges, zero gates, zero
   entitlement — structurally pinned.
6. **`/app/progress`** — read-only: 12 chapter rows per the app's display law
   (readiness = FULL-exam pct only; sample/practice earn a neutral activity
   line; never both on one row) + the shared mock history. `/app` shell now
   links the three surfaces (comingSoon list retired).

### Changed files (web repo, this commit)

Modified: `scripts/gen-quizengine-golden.mjs`, `src/components/AppShell.tsx`,
`src/components/AuthProvider.tsx`, `src/components/Icon.tsx`, `src/lib/copy.ts`,
`src/lib/firebaseClient.ts`, `src/lib/mistakesService.ts`,
`src/lib/progressBackend.ts`, `src/lib/questionDelivery.ts`,
`src/lib/quizEngine.ts`, `src/styles/tokens.ts`, `tailwind.config.ts`,
`test/appShell.test.tsx`, `test/fixtures/quizEngine.golden.json`,
`test/icon-paths.test.ts`, `test/isPaidDiscipline.test.ts`,
`test/progressParity.test.ts`, `test/questionDelivery.test.ts`,
`test/quizEnginePort.test.ts`, `test/singleWriteSite.test.ts`.

New: `src/app/app/mock/page.tsx`, `src/app/app/mistakes/page.tsx`,
`src/app/app/progress/page.tsx`, `src/components/MockSurface.tsx`,
`src/components/MockPlayer.tsx`, `src/components/MockResults.tsx`,
`src/components/MistakesSurface.tsx`, `src/components/MistakesPlayer.tsx`,
`src/components/ProgressSurface.tsx`, `src/lib/mockService.ts`,
`src/lib/mockConfig.ts`, `src/lib/ensureUserDocument.ts`,
`test/mockServicePort.test.ts`, `test/mockConfig.test.ts`,
`test/mockPlayer.test.tsx`, `test/mockSurface.test.tsx`,
`test/mockResults.test.tsx`, `test/mistakesDeck.test.ts`,
`test/mistakesSurface.test.tsx`, `test/mistakesPlayer.test.tsx`,
`test/progressSurface.test.tsx`, `test/ensureUserDocumentClient.test.ts`,
`docs/review-packets/screenshots/M6/` (19 PNGs), this packet.

### Changed files (app repo, commit e0e7323)

`functions/index.js` (+`ensureUserDocument` callable), `functions/userDocument.js`
(new — pure doc-shape module), `__tests__/ensureUserDocumentServer.test.js`
(new — 5 tests pinning field-identity with the client-side create).

---

## 2. Gate outputs (final commit state)

```
npm run lint      → eslint --max-warnings=0 clean;
                    "Raw-hex guard PASSED — no hex colour literals outside src/styles/tokens.ts."
npm run typecheck → tsc --noEmit, clean (no output)
npm test          → Test Files  57 passed (57)
                    Tests  1453 passed | 5 skipped (1458)
npm run build     → static export built; prebuild + postbuild leak gate:
                    "Paid-content leak gate PASSED — 2000 artefact(s) scanned against 4596 paid
                     ids + 21451 content-scope/21765 public-scope text fingerprints; exported
                     question files structurally free-only; zero questions and an exact canonical
                     flashcard sampler confirmed in the public export."
```

App repo (the callable's suite):

```
npx jest __tests__/ensureUserDocumentServer.test.js
  → Tests: 5 passed, 5 total  (buildNewUserDocument shape parity)
```

The 5 skipped web tests are the pre-existing environment-gated suites
(unchanged from M5).

---

## 3. The ensureUserDocument callable (Anusha-approved §0.10 exception)

**Why it exists:** M4-B1 established the web client cannot create `users/{uid}`
(the deployed create rule requires `isPaid: false` in the payload; §0.9 forbids
any client path writing that field). M6's mock counter lives ON that document,
so a web-only account could never record a mock. The M4 packet (§6.3) flagged
this exact scenario as "a canon question for Anusha — either an explicit §0.9
amendment or a Cloud Function in the app repo's functions/". **Anusha chose the
Cloud Function (2026-08-06)**, with the evolved product rationale recorded: a
user may enter the ecosystem on either platform and continue on one.

**Shape:** v2 `onCall({region:'asia-south1'})`; auth required; operates only on
the caller's uid; **ignores the client payload entirely** (identity from the
verified token — a hardening over the app's client-side create, which trusts
its own device); transaction create-if-absent of exactly the app's sign-in
document `{uid, displayName, email, createdAt: serverTimestamp, isPaid: false,
freeMockConsumed: false}`; an existing document — including its `isPaid` — is
never touched, so it cannot race the purchase chain into a downgrade.

**Deployed:** to `arnready-dev` by Anusha, 2026-08-06 (`firebase deploy --only
functions:ensureUserDocument --project dev`; the dev project was upgraded to
Blaze for it, same billing account as prod, 1-day artifact cleanup policy).
**NOT yet deployed to prod** — required before M9 cutover; recorded in §7.

**Client side:** `src/lib/ensureUserDocument.ts` invokes the callable via
`firebase/functions` (part of the installed `firebase` package — **no new npm
dependency**), memoised per uid in process memory only (never web storage),
in-flight coalescing, `'error'` surfaces to the caller. `AuthProvider` fires it
per sign-in; `MockSurface` awaits it and maps `'error'`/`'unavailable'` to the
error state — a free user can never start a 120-minute mock whose submit write
the rules would refuse.

---

## 4. Fixtures — provenance and both-side outputs (protocol §2.6)

- **`test/fixtures/quizEngine.golden.json`** (30 cases; 11 new for M6:
  `assembleMock` ×5 incl. the full-NISM-weights 100-question case,
  `tallyWeakSubtopics` ×4, `tallyWeakChapters` ×2) — regenerated by
  `scripts/gen-quizengine-golden.mjs`, whose every `expected` value is produced
  by LIVE `import()` of `../ARNReady-App/services/quizEngine.ts` and recorded,
  never hand-computed. Seeded rng shared between generator and test via
  `scripts/lib/seededRng.mjs`.
- **Web side:** `test/quizEnginePort.test.ts` replays all 30 through the web
  port (golden suite, always on) AND re-runs the app module live against every
  case when the app repo is present (the `describe.skipIf` suite ran, not
  skipped, in the §2 output).
- **App side:** the app's own `__tests__/quizEngine.test.js` continues to pin
  `assembleMock` behaviour in-repo; the app repo's new
  `ensureUserDocumentServer.test.js` pins the created-document shape against
  the client-side create (§2 output).
- **mockService:** behaviour pinned line-by-line by `test/mockServicePort.test.ts`
  (14 tests) through a recording backend — the write-shape assertions mirror
  the deployed `mockHistoryUpdateIsValid()` rule (exactly two fields, one
  appended record, consumed-flag true). `mockConfig` values pinned by
  `test/mockConfig.test.ts` with line citations into app `config.js`.

---

## 5. Live evidence on arnready-dev (M6 acceptance)

Run 2026-08-06 against `arnready-dev` via `next dev`, signed in as the
throwaway test account `arnreadytest@gmail.com`
(uid `FKmOTJdC2sTjoqQHM811cR515vz1`) with a locally minted custom token through
the dev-only `__arnreadyDevAuth` hook — the M4/M5 mechanism, no password
handled. Driven and captured via headless Chrome + CDP over Node's built-in
WebSocket (throwaway scratchpad script, outside the repo — no npm dependency;
the M5-r capture mechanism).

**Pre-state (admin read):** NO `users/{uid}` doc, 0 sessions, 0 chapterProgress,
0 mistakes — a genuine first-time web-only account.

1. **Sign-in → the callable created the root doc server-side:**
   `{uid, displayName: "ARNReady test", email: "arnreadytest@gmail.com",
   isPaid: false, freeMockConsumed: false, createdAt: <serverTimestamp>}` —
   field-identical to the app's client-side create.
2. **Practice run (ch 1, 20 questions, deliberately mixed answers):**
   `chapterProgress/1 = {practiceAttempted: 20}`; one `sessions` doc
   (mode `practice`, attempted 20, correct 5); **15 active mistakes** collected.
3. **Mock E2E (free):** pre-start rendered ready (eligibility read true,
   instructions 100 Q/120 min, free banner); Start assembled a 100-question
   paper from the free pool (`isFree == true` collection query — the paid rule
   branch never touched); 40 answered; palette submit → counting confirm
   ("60 unanswered…") → confirmed; results rendered (7/100, fail-band verdict,
   stats, needs-practice card, premium pitch with dual CTA). **Firestore
   after:** `freeMockConsumed: true`; `mockHistory: [{date: ISO, score: 7,
   total: 100, percentage: 7, timeTaken: 9, weakChapters: [9, 12, 5]}]`; one
   `sessions` doc (mode `mock`, chapter null, served 100, attempted 40,
   correct 7, answers.length 100).
4. **One-free-ever refusal:** revisiting `/app/mock` rendered the used state
   (score line "7/100 · 6 Aug 2026", additions-only pitch, no Start control).
   The same field the Android app writes and checks — the cross-platform
   half of the acceptance (Android shows it consumed) is Anusha's device pass,
   §7.
5. **Progress:** chapter 1 row shows the neutral "Practised 20 questions"
   activity line (no readiness — no full exam exists), chapters 2–12
   "Not started", weight chips per `MOCK_CHAPTER_WEIGHTS`, and the mock
   history block ("7 / 100 · 6 Aug 2026 · Revisit: Ch 9, Ch 12, Ch 5").

### Screenshots (19 PNGs, `docs/review-packets/screenshots/M6/`)

| State | Files |
|---|---|
| `/app` shell with the M6 modes row | `app-shell-modes-{1440,375}.png` |
| Mock pre-start (ready) | `mock-prestart-ready-{1440,375}.png` |
| Mock player mid-run | `mock-player-running-{1440,375}.png` |
| Submit counting confirm | `mock-submit-confirm-1440.png` |
| Mock results, free (pitch + details open) | `mock-results-free-{1440,375}.png` |
| Used-mock refusal state | `mock-used-state-{1440,375}.png` |
| Mistakes chapter picker | `mistakes-picker-{1440,375}.png` |
| Mistakes re-attempt run | `mistakes-player-{1440,375}.png` |
| Progress before the mock | `progress-before-mock-{1440,375}.png` |
| Progress after the mock (history present) | `progress-after-mock-{1440,375}.png` |

---

## 6. Deviations (every one deliberate and argued)

**6.1 — No AsyncStorage HOME_* mirror in `recordMockAttempt`.** The app mirrors
latest mock scores into device AsyncStorage for its HomeScreen card. React
Native device state with no web equivalent — the web reads Firestore directly.
Same rationale as the M4 header's declared cache deviation. No document
differs.

**6.2 — Prepometer zones and score-gated Arnie NOT ported.** The app's mock
results show a 7-zone readiness label + animated gauge + zone Arnie; its
chapter list colours readiness by zone. The web has no Prepometer port (a
subsystem M6 does not own). Mock results render score/verdict/stats/weak
chapters (verdict bands off `MOCK_PASS_MARK`/`MOCK_PASS_MARGIN` are ported);
progress rows render the honest pct in the purple token. One calm Arnie, no
unearned celebration — the same deferral the M5 packet records for exam
results; M7 owns the polish decision.

**6.3 — `test/isPaidDiscipline.test.ts` amendments.** (a) The M4-era test "no
src/ module writes the users document itself" is narrowed, not deleted: the
ONE permitted root write is the backend's mock append, pinned to its exact
two-field merge shape; creation stays impossible client-side (M4-B1 intact —
the write site still never names `isPaid`). (b) New consumer categories with
per-category proofs: `SEAM_PARAMETER_CONSUMERS` (mockService),
`PROP_PITCH_CONSUMERS` (MockPlayer forwards; MockResults branches once, for
pitch visibility), MockSurface joins `UI_CONSUMERS`; the passer pin gains ONE
forwarding passer (MockPlayer → MockResults) plus a no-literal guard
(`isPaid={true|false}` anywhere fails).

**6.4 — `test/singleWriteSite.test.ts` extension.** mockService joins the
seam-only list; the mock write site is pinned to one module; the `'mistakes'`
source label lives in `progressBackend.ts` (`MISTAKES_RUN_SOURCE`) because that
test reserves the quoted literal to the write-site module — the value is
session-doc data, not a collection reference (commented in place).

**6.5 — Mistakes chapter scope applied in memory.** The app issues two query
shapes (with/without a `chapter ==` clause); the web seam exposes the one
unscoped active-mistakes read, and `getActiveMistakes` filters in memory.
Identical result sets; keeps the M4 seam interface unwidened.

**6.6 — Mock pool fetch has no per-chapter cap.** Faithful to the app
(MockTestScreen queries the whole free pool): the deployed rules police the
free pool, and the weights bound the paper. Documented at
`fetchMockQuestions`.

**6.7 — Web-native equivalents in the mock player.** The app's hardware-back
confirm → an Exit control + in-page accessible dialog + a `beforeunload`
guard while the run is live; Alert.alert flows → in-page role=dialog confirms;
keyboard operation (1–4 / arrows / F) added per design doc §7 (laptop mocks
first-class). Palette "visited" colours mirrored from the app screen as a new
`paletteVisited` token group (tokens.ts is the one permitted hex location; the
locked §0.7 brand `colors` object is untouched and still SHA-pinned).

**6.8 — "Get the app" CTAs point at `/pricing`.** No Play listing URL exists in
the repo; both new pitch CTAs mirror `nudge.getApp` exactly, with the
`[ANUSHA: Play Store listing URL]` marker preserved.

---

## 7. Known limitations, deferred items, and Anusha's remaining steps

1. **Cross-platform counter verification (acceptance, Anusha's device pass):**
   sign the test account into the Android DEV build → PreMock must show the
   used state with the 7/100 web attempt. The web half (refusal after
   consumption) is evidenced in §5.4.
2. **Paid-path live check pending (optional):** wiring tests pin paid
   behaviour (unlimited eligibility without a read, full-bank fetch, zero
   pitch). A live confirmation needs Anusha to flip `isPaid` on the dev test
   account (the M3 live-grant mechanism) — her console, her call. The M5
   precedent (paid coverage via wiring tests) applies otherwise.
3. **`ensureUserDocument` is dev-only** until Anusha deploys it to prod —
   REQUIRED before M9 cutover. Until then, prod web sign-ins create no user
   doc (no user-visible impact before cutover).
4. **Defective Arnie assets (pre-existing, NOT introduced by M6):** six PNGs in
   `public/arnie/` (`checks-in`, `breathe`, `makes-it-stick`,
   `setting-the-scene`, `warns`, `works-it-out`) carry a fake-transparency
   checkerboard baked into their pixels — visible on the mock results
   (§5 screenshot) and on M5's practice/exam results, which use the same
   `checks-in` mood. Asset re-export is Anusha's (design system: approved
   PNGs); flagged for M7.
5. **`MOCK_PASS_MARK = 50` remains a WORKING value** (app config comment:
   awaits Anusha's verification of the Guide exam facts).
6. **All new copy is WORKING** until Anusha's voice pass (M7), including the
   two pitch blocks (both obey the nudge law: additions only, dual CTA).
7. **The mock run state does not survive a page reload** — a reload warns via
   `beforeunload` and a confirmed reload discards the attempt silently
   (LOCKED: recorded on submit only; the app's exit semantics). Session
   resumption would be new product behaviour the manual does not define.

## 8. Codex pointers (§3 checks it will re-run)

- **Scope containment:** every changed file listed in §1; nothing touches
  `firestore.rules`, scoring constants, or (beyond the disclosed callable
  commit) the app repo.
- **Leak gate:** §2 pasted from the final build; `out/` contains no question
  text (the mock/mistakes/progress surfaces are client-side runtime fetches;
  their routes prerender to auth chrome only).
- **Engine parity:** §4; spot-check `assembleMock-full-nism-weights` and
  `assembleMock-seed-groups-one-per-mock` against app `quizEngine.ts:174-195`
  by hand.
- **isPaid discipline:** §6.3; grep confirms the write site never names the
  field and no module writes it.
- **Nudge law:** both pitch blocks pitch additions only; structural pins — no
  nudge machinery imports in MockPlayer/MockResults/MistakesPlayer/
  MistakesSurface/ProgressSurface (source scans in their suites); zero nudges
  for paid users (M5 suites + the paid-results test).
- **Fence:** web → app links only ("Get the app"); no copy implies the app
  links to web checkout.
