# M3 evidence packet — Firebase Web App + auth/entitlement integration

**Milestone:** M3 [SENSITIVE + ANUSHA]
**Branch:** `web-product`
**Date:** 2026-07-18
**Execution model:** orchestrator-executed. Per the manual's "Who does what",
a [SENSITIVE] milestone's core is executed by the orchestrator itself. The
entitlement store, auth store, Firebase initialisation, and the env toggle
were written directly by the orchestrator; no executor subagent was used for
any part of this milestone, and no Firestore write-shape work left the
orchestrator's hands (there is none — see §4.1).

---

## 1. Scope

M3 wires Google sign-in end-to-end against the `arnready-dev` Firebase
project, adds a read-only `isPaid` entitlement mirror driven by a live
Firestore listener, and delivers the auth-side UI only: the header sign-in
prompt, the chapter-hub sign-in prompt, and the signed-out/signed-in `/app`
shell. It also introduces the dev/prod build-time toggle Anusha specified on
2026-07-18, which governs BOTH the web client's Firebase project and the
build-time content pull.

Per the manual's **M3 scope amendment (Anusha, 2026-07-16)**, the `/app`
nudge/wall wiring deferred from M2 does **not** land here — it moves to M5,
with the mock-results pitch in M6. See §7 for a conflict this creates with
the review log that Anusha needs to resolve before review.

### Changed files

**New — auth/entitlement core (orchestrator-written):**
- `src/lib/firebaseEnv.ts` — the dev/prod toggle, pure resolver, fail-closed
- `src/lib/firebaseClient.ts` — lazy, browser-only Firebase handles
- `src/lib/entitlementStore.ts` — read-only `isPaid` listener + epoch guard
- `src/lib/authStore.ts` — Google sign-in, sign-out, flap-guarded auth state

**New — auth UI:**
- `src/components/AuthProvider.tsx` — mounts the auth listener once
- `src/components/SignInButton.tsx` — the one sign-in/sign-out control
- `src/components/HeaderAuth.tsx` — the header's auth slot (prompt #3)
- `src/components/AppShell.tsx` — the four `/app` auth states
- `src/app/app/page.tsx` — the `/app` route, `noindex`

**Modified:**
- `package.json`, `package-lock.json` — `firebase`, `zustand` (§2)
- `scripts/export-content.mjs` — toggle binding + project assertion
- `.env.example` — documents the toggle and both variable sets
- `src/app/layout.tsx` — wraps the tree in `AuthProvider`
- `src/components/Header.tsx` — live sign-in slot replaces the disabled stub
- `src/app/chapters/[chapter]/page.tsx` — live sign-in prompt (§6.2)
- `src/app/robots.ts` — disallow `/app`
- `src/components/Icon.tsx` — `log-in`, `log-out`, `user` (Feather)
- `src/lib/copy.ts` — `auth` + `appShell` blocks; sign-in labels de-stubbed
- `THIRD_PARTY_NOTICES.md` — Firebase (Apache-2.0), Zustand (MIT)

**New tests:**
- `test/firebaseEnv.test.ts` (15), `test/entitlementStore.test.ts` (21),
  `test/authStore.test.ts` (24), `test/isPaidDiscipline.test.ts` (19),
  `test/appShell.test.tsx` (10), `test/headerAuth.test.tsx` (10),
  `test/appRouteIndexing.test.ts` (4)

**Modified tests (both justified in §6):**
- `test/primaryCta.test.tsx` — hub CTA hierarchy (§6.2)
- `test/icon-paths.test.ts` — pins the three new Feather glyphs

**NOT in this commit:** `docs/ARNREADY_WEBSITE_REVIEW_LOG.md` was already
modified in the working tree when this session began. It is Codex-owned and
was deliberately left unstaged and untouched.

---

## 2. New dependencies (§0.10 stop condition — approved by Anusha, 2026-07-18)

| Package | Version | Licence | Why |
|---|---|---|---|
| `firebase` | ^12.16.0 | Apache-2.0 | Auth + Firestore. No alternative; named in CLAUDE.md's target stack. Modular imports only. |
| `zustand` | ^5.0.14 | MIT | Mirrors the app's `entitlementStore` (same library, same store shape) so the two are diffable side by side. Same major as the app's `^5.0.14`. |

`npm audit` reports 8 moderate advisories. **All pre-date this milestone** and
originate in `firebase-admin` (a devDependency used only by the build-time
export script) via `@google-cloud/storage` → `retry-request`/`teeny-request` →
`uuid`. Neither `firebase` nor `zustand` appears in any advisory path.

---

## 3. Gate outputs (from the final commit state)

### `npm run lint`
```
> eslint . --max-warnings=0 && node scripts/check-no-raw-hex.mjs
Raw-hex guard PASSED — no hex colour literals outside src/styles/tokens.ts.
```

### `npm run typecheck`
```
> tsc --noEmit
(no output — clean)
```

### `npm test`
```
 Test Files  33 passed (33)
      Tests  1102 passed (1102)
```
(Up from 999 at M2: +103 new M3 tests. No test deleted. Two modified, §6.)

### `npm run build` + leak gate (pre and post)
```
> npm run export-content && npm run check-paid-leak
Exported 240 free questions across 12 chapters, 732 flashcards, paid manifest:
21451 content-scope + 21765 public-scope field-level text fingerprints …
Paid-content leak gate PASSED — 1937 artefact(s) scanned …

> next build
▲ Next.js 16.2.10 — Environments: .env.local
✓ Compiled successfully in 5.2s
✓ Generating static pages (196/196)

> postbuild: node scripts/check-paid-leak.mjs
Paid-content leak gate PASSED — 1937 artefact(s) scanned against 4596 paid ids
+ 21451 content-scope/21765 public-scope text fingerprints; exported question
files structurally free-only; zero questions and an exact canonical flashcard
sampler confirmed in the public export.
```

**Note for the reviewer:** the export now pulls from `arnready-dev`. Counts are
identical to M2's prod export (240 free questions, 732 flashcards), so dev
content mirrors prod and no public page changed as a result of the switch.

---

## 4. The M3 security checklist (review protocol §4), line by line

### 4.1 "No secrets/config beyond the public Firebase web config in the client"

The client reads exactly four `NEXT_PUBLIC_` values per environment (api key,
auth domain, project id, app id) — the public identifiers Firebase publishes
in its own console snippet. No service-account key, no private key, no token
is referenced anywhere in `src/`. The service-account key remains outside the
repo entirely; `scripts/export-content.mjs` resolves it by path at build time
and `.gitignore` blocks `*serviceAccount*` and `.env*`.

`.env.local` is untracked and was written by Anusha; its values never entered
this session's transcript.

### 4.2 "Cancel path truly cancels: no partial user doc writes, no orphan state"

**M3 writes NOTHING to Firestore at all** — the strongest possible form of
this guarantee. Per Anusha's 2026-07-18 decision, `users/{uid}` creation
belongs to M4, which owns every write shape. A user who signs in on the web
with no user document reads as unpaid, which is the correct fail-closed
answer.

Enforced structurally by `test/isPaidDiscipline.test.ts`, which scans all of
`src/` and asserts that no module imports or calls any Firestore mutation API
(`setDoc`, `updateDoc`, `addDoc`, `deleteDoc`, `writeBatch`, `runTransaction`,
`increment`, `arrayUnion`, `arrayRemove`, `deleteField`, `serverTimestamp`).

Cancellation itself: `authStore.ts` maps `auth/popup-closed-by-user`,
`auth/cancelled-popup-request`, and `auth/user-cancelled` to a silent
`'cancelled'` outcome — no message, no state change, no listener, no write
(`test/authStore.test.ts`: "a cancelled sign-in leaves NO state behind").

### 4.3 "isPaid listener: detach on sign-out; default UNPAID on error/missing doc (fail-closed); no caching across accounts"

| Requirement | Where | Test |
|---|---|---|
| Detach on sign-out | `entitlementStore.ts` `resetEntitlement()` | "detaches the listener on sign-out and returns to unknown/unpaid" |
| Unpaid on missing doc | `snapshot.exists() && …` | "treats a missing user document as unpaid, and settles" |
| Unpaid on error | `onSnapshot` error callback | "treats a listener error … as unpaid, and settles" |
| Strict `=== true` | `snapshot.data()?.isPaid === true` | 5 cases: `'true'`, `1`, `{}`, `null`, `undefined` all → unpaid |
| No cache | no `localStorage`/`sessionStorage`/`indexedDB`/cookie in `src/` | `isPaidDiscipline` "entitlement is never cached in web storage" |
| No cross-account bleed | epoch guard + reset-before-attach | "an A→B switch … never shows A's paid state to B"; "drops a late snapshot belonging to the PREVIOUS user" |

Two deliberate, spec-mandated divergences from the app, both recorded in
`entitlementStore.ts`'s header comment: the web uses a **live listener**
(manual M3: "read-only isPaid listener") where the app uses a one-shot read
plus foreground refresh; and the web caches **nothing**, where the app caches
per-uid in AsyncStorage. The review protocol's "no caching across accounts"
requirement and the live listener together make a cache redundant.

### 4.4 "No firestore.rules diff (BLOCKER if any)"

No `firestore.rules` file exists in this repo, and none was created. The app
repo's rules were read only, and are unchanged. Verified: `git diff --stat`
lists no rules file.

M3 needs no rules change: `users/{uid}` already allows `read: if isOwner(uid)`,
which is exactly and only what the entitlement listener does.

### 4.5 "Auth state flaps (rapid sign-in/out) don't crash gated routes"

`AUTH_FLAP_GRACE_MS = 1500` is ported verbatim from the app's
`CONFIG.AUTH_FLAP_GRACE_MS` and pinned by a test. A transient null is only
honoured if it survives the grace period with `auth.currentUser` still null.
Covered by six tests including a 50-iteration flap loop in each store, plus
timer cleanup on teardown (no post-unmount state write).

---

## 5. The dev/prod toggle (Anusha, 2026-07-18)

`NEXT_PUBLIC_APP_ENV` (`dev` | `prod`) is a single **build-time** switch — the
static export inlines the selected values, so switching environments means
rebuilding. It governs the Firebase client config *and* the content pull, so
public content and auth can never come from different projects.

Three fail-closed guards, all tested:

1. **No default.** Unset, empty, `staging`, `Dev`, whitespace → error, never a
   guessed project (`firebaseEnv.test.ts`, 5 cases).
2. **No partial config.** A missing or blank variable in the selected set is
   reported by name. The `PROD_` set is deliberately blank until the prod web
   app is registered; `APP_ENV=prod` today fails with a clear message rather
   than half-working.
3. **No wrong project.** The resolved `projectId` must match the environment
   (`dev`→`arnready-dev`, `prod`→`arnready`). Pasting the wrong console config
   block into the wrong variable set is rejected in both directions.

`scripts/export-content.mjs` reads the same toggle (parsing `.env.local`
itself, since plain node does not load it), derives the key path
`serviceAccountKey.<env>.json`, and **asserts the key's `project_id` matches**
— which closes the `ARNREADY_SA_KEY` override path. Both failure modes were
reproduced live:

```
$ ARNREADY_SA_KEY=…/serviceAccountKey.prod.json node scripts/export-content.mjs
export-content failed: Service-account project mismatch. NEXT_PUBLIC_APP_ENV="dev"
requires project "arnready-dev", but the key at …/serviceAccountKey.prod.json
belongs to "arnready". Refusing to export — content and auth must come from the
same project.

$ NEXT_PUBLIC_APP_ENV=bogus node scripts/export-content.mjs
Error: NEXT_PUBLIC_APP_ENV must be "dev" or "prod" (received "bogus"). Set it in
.env.local. There is deliberately no default — a guessed project would silently
publish the wrong environment's content.
```

---

## 6. Deviations from the manual

### 6.1 The dev/prod toggle itself is not in the manual

Anusha specified it on 2026-07-18 ("keep the environment configurable… we
switch with a toggle"), choosing `arnready-dev` for M3 over the orchestrator's
recommendation of prod. She also chose the stronger of the two offered
content-binding designs (derive the key path from the toggle, rather than
only asserting it); the shipped implementation does **both**.

### 6.2 The chapter hub's primary CTA changed from pricing to sign-in

M1-B8 (a Codex finding) made the **pricing link** the hub's primary CTA. Its
own rationale, quoted from `test/primaryCta.test.tsx`, was that "the disabled
sign-in stub is informational only until M3 wires real auth."

M3 wires real auth, so the manual's own shape is restored: **M1 step 2**
specifies the hub carries "one sign-in CTA", and **§1** places a sign-in
prompt "after the 10th sampler card". Sign-in is therefore now the hub's one
primary CTA and the pricing link is a quiet secondary.

The invariant M1-B8 protects — exactly one functional, visually primary CTA
per public page — is unchanged and still asserted; only which control holds
that role has moved, per the canon. **This is the one item in M3 that changes
a previously reviewed decision, and Anusha should confirm it explicitly.**

### 6.3 `/app` signed-out state is arguably a fourth sign-in prompt

Manual §1 says sign-in prompts appear in "exactly three places". The M3 spec
separately requires "signed-out `/app` states", which must offer sign-in to be
usable. These are read as compatible: the "three places" rule governs the
public, indexable surfaces, and `/app` is neither (noindex + robots disallow).
Flagging it rather than deciding silently.

### 6.4 Screenshot tooling

Captured via a scratchpad-only Node script driving headless Chrome over the
DevTools Protocol with Node's native WebSocket — **no npm dependency added**
(§0.10). Chrome's `--screenshot` CLI flag was tried first and rejected: it
neither emulates a mobile layout viewport (375px captures rendered the desktop
layout, clipped) nor waits for client-side auth to settle (captures froze on
the loading state). The script is not part of the repo diff.

---

## 7. M2-B1 belongs to M5/M6, not M3 — Anusha's decision, 2026-07-18

`docs/ARNREADY_WEBSITE_REVIEW_LOG.md` records `M2-B1` as **DEFERRED to M3**,
with the action: "M3 must consume the M2 machinery verbatim and cover Q11,
exam pre-start, flashcard 15/30/45, free Q21+ deep-link wall, mock-results
pitch, and the no-nudge invariants." That entry is dated **2026-07-15**.

The manual's M3 scope amendment, dated **2026-07-16**, supersedes it: "The
`/app` nudge/wall wiring deferred from M2 does NOT land here — it moves to
**M5**", with the mock-results pitch in M6.

M3 was built to the **later** amendment, per the standing instruction that a
dated amendment overrides the original text.

**Anusha's decision, 2026-07-18 (confirmed in session):** `M2-B1`'s
obligations move to **M5** (practice Q11 nudge, exam pre-start nudge,
flashcard 15/30/45, the free-user Q21+ deep-link wall, and the no-nudge
invariants) and **M6** (the mock-results premium pitch). They are **not** M3
acceptance items, and M3 must not be reviewed against them. This confirms and
does not alter the manual's 2026-07-16 M3 scope amendment.

**Action for Codex:** re-point the `M2-B1` row in
`docs/ARNREADY_WEBSITE_REVIEW_LOG.md` from M3 to M5/M6, recording this
decision and its date, before the M3 review begins. The log is Codex-owned;
this executor did not and must not edit it, which is why the decision is
recorded here instead.

---

## 8. Known limitations and deferred items

1. **COOP console errors during sign-in — DEFERRED TO M9 (Anusha,
   2026-07-18).** Google's sign-in page sets a restrictive
   `Cross-Origin-Opener-Policy`; our pages set none, so Chrome severs the
   opener↔popup link and logs `Cross-Origin-Opener-Policy policy would block
   the window.closed call` (attributed to `authStore.ts:107` and Firebase's
   `popup.ts`). **Cancellation was verified working anyway** (§9 pass 5), so
   this is not a functional defect today — but Firebase's preferred
   popup-closed detection *is* `window.closed` polling, so cancel currently
   survives via an SDK fallback rather than the primary path, and an SDK
   update could change that.

   The documented remedy is one response header,
   `Cross-Origin-Opener-Policy: same-origin-allow-popups`, in `firebase.json`
   beside the existing security headers. It was **not** applied: it is
   production hosting config, `next dev` sends no COOP header so it cannot be
   verified locally, and Anusha's call was to pick it up at **M9** with the
   rest of the deploy configuration. **Codex: this belongs in the durable
   review log as a DEFERRED item targeted at M9** — recorded here because the
   log is Codex-owned and this executor must not write it.
2. **Mobile coverage of passes 1, 2b, 5 and 6** — desktop only; see §9's
   coverage-gaps note for why that is judged adequate.
3. **`arnready-dev` will need content populated before M5** if it ever
   diverges from prod. Today they match (identical export counts), so nothing
   is required now.
4. **The prod web app is not registered.** The `PROD_` variable set is blank
   and `APP_ENV=prod` fails loudly by design. Registering it is a separate
   Anusha console step, due before M9 cutover.
5. **`/mock-test` and `/flashcards` marketing pages are still missing.**
   Listed in manual §1 but never built by M0 or M1. Out of M3 scope; carried
   here so it survives to M7.
6. **`isPaid` has no visible UI in M3.** There are no entitlement-gated
   surfaces until M5/M6, so the shell renders identically for free and paid
   users. The live value is exposed as a hidden `data-testid` marker purely so
   the §9 matrix can observe the listener flipping.

---

## 9. Integration test matrix — COMPLETED 2026-07-18

Run live against **`arnready-dev`** with Anusha at the browser (every sign-in
is a human action; the executor does not enter credentials). Client state was
read from the `data-testid="entitlement-state"` marker in the browser console;
server state was read independently with the Admin SDK, so no pass relies on
the client's own account of itself.

**Accounts used:**
- `arnreadytest@gmail.com` — uid `FKmOTJdC2sTjoqQHM811cR515vz1`, no Auth record
  and no user document before this session: the fail-closed case
- `anushamurthy@gmail.com` — uid `jyJS3YL39cUpQwSiyyTlhjBePV32`, existing
  document, `isPaid: false`

| # | Pass | Result | Desktop | Mobile |
|---|---|---|---|---|
| 1 | Sign-in, **no user doc** | shell renders; client `{known:'true', isPaid:'false'}`; Admin read confirms `users/{uid}` **ABSENT** after sign-in | ✅ | — |
| 2 | Sign-in, doc `isPaid:false` | client `{known:'true', isPaid:'false'}` | ✅ | ✅ |
| 2b | Sign-in, doc `isPaid:true` | client `{known:'true', isPaid:'true'}` — paid state read at sign-in | ✅ | — |
| 3 | **Live grant** (`false→true`, page open, no reload) | marker flipped to `isPaid:'true'` | ✅ | ✅ |
| 4 | Sign-out | header pill returns to "Sign in"; shell returns to the signed-out state | ✅ | ✅ |
| 5 | Cancel (dismiss the Google popup) | button returns to "Sign in with Google"; page unchanged; no state left behind | ✅ | — |
| 6 | **Live revoke** (`true→false`, page open, no reload) | marker flipped to `isPaid:'false'` | ✅ | — |

### The two findings worth recording

**Pass 1 is the milestone's central claim, and it holds.** After a first-ever
web sign-in, the Admin SDK reports `users/FKmOTJdC2sTjoqQHM811cR515vz1:
ABSENT` while the client independently settled to `known: true, isPaid:
false`. M3 creates the Auth record that signing in inevitably creates, and
writes nothing to Firestore. Fail-closed is verified on **both** sides, not
inferred from one.

**Passes 3 and 6 together are the entitlement premise.** A server-side write
is the only thing that moves `isPaid`, and an open session learns of it purely
through the listener — in both directions. Grant and revoke both propagate
without a reload, which is what M8's purchase and refund paths will rely on.

### Honest coverage gaps

The mobile column was exercised for sign-in, sign-out, the live grant, the
menu's auth slot, and layout. **Passes 1, 2b, 5 and 6 were verified on desktop
only.** Those paths are viewport-independent (identical store code; the
viewport affects layout and the header/menu slot, both of which were checked),
so this is judged adequate rather than complete — recorded as a gap rather
than papered over.

### State left behind

`arnready-dev` was restored to its pre-session state: both of Anusha's
accounts back to `isPaid: false`, and `arnreadytest@gmail.com` still without a
user document. The only durable change is the `arnreadytest` **Auth** record
created by its first sign-in, which cannot be undone by signing out and is
harmless (no document, no entitlement, no progress).

Tooling: two scratchpad-only Admin SDK scripts (a read-only inspector and a
single-field merge-write for the flips) — neither is part of the repo, and the
flips were performed only on Anusha's explicit go, per pass.

---

## 10. Screenshots

| File | Width | State |
|---|---|---|
| `app-signed-out-1440.png` | 1440 | `/app` signed out |
| `app-signed-out-375.png` | 375 | `/app` signed out |
| `chapter-hub-signin-1440.png` | 1440 | chapter hub, sign-in prompt after the sampler |
| `chapter-hub-signin-375.png` | 375 | chapter hub, sign-in prompt after the sampler |
| `app-signed-in-desktop.png` | desktop | `/app` signed in, with the console marker visible |
| `app-signed-in-mobile.png` | 430 (iPhone 14 Pro Max) | `/app` signed in, header menu open showing the account slot |

All in `docs/review-packets/screenshots/M3/`. The signed-out and hub captures
were taken by the executor via headless Chrome (§6.4); the two signed-in
captures were taken by Anusha during the §9 matrix, since they require an
authenticated session.

The signed-in desktop capture also shows the DevTools console with the
entitlement marker reading `known: 'true', isPaid: 'false'`, and the COOP
messages described in §8.1.

The `/app` captures show the signed-out state rendering rather than the
"sign-in unavailable" state — which is itself positive evidence that the dev
config resolved and the `arnready-dev` project assertion passed, since an
unresolved config renders the unavailable state instead.

The hub captures show the sign-in prompt after the 10 sampler cards as the one
primary CTA (§6.2), with the pricing link demoted, the cream `#F5F5F0` canvas,
white cards, and the footer disclaimer.

---

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
