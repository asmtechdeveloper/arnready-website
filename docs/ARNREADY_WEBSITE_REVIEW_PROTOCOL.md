# ARNReady Website — Review Protocol (for Codex)

**Purpose:** every milestone in `docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md`
is reviewed by Codex before Anusha approves it. This file defines the
review inputs, method, and per-milestone checklists. Codex reviews
adversarially: its job is to find what the executor got wrong, not to
summarize what it did.

---

## 1. Anusha's paste-prompt for a Codex review

> You are reviewing milestone M<n> of the ARNReady website
> (`web-product` branch). Read, in order:
> `docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md` (the canon — §0 global rules,
> §1 product model, and the M<n> spec), `docs/ARNREADY_WEBSITE_REVIEW_
> PROTOCOL.md` (this file — §3 generic checks and the M<n> checklist in §4),
> and `docs/review-packets/M<n>_PACKET.md`. Then review `git diff main...
> web-product -- <changed files listed in the packet>` (or the milestone
> commit) against the spec. Independently re-run the §3 verification
> commands — do NOT trust the packet's pasted outputs. Report findings as:
> BLOCKER (violates a §0 rule, a locked formula, security, or the milestone
> spec), SHOULD-FIX (correctness/robustness), NIT. For each: file:line, the
> defect, a concrete failure scenario, and the fix. End with a verdict:
> APPROVE / APPROVE AFTER FIXES / REJECT. Do not edit any file.

Immediately after returning the verdict, Codex records the complete finding
list in `docs/ARNREADY_WEBSITE_REVIEW_LOG.md` before any remediation begins.
The “Do not edit any file” instruction prohibits changes to implementation
and evidence files during review; it does not prohibit this required update
to the Codex-owned durable review log.

## 2. The evidence packet (produced by the executor, per milestone)

`docs/review-packets/M<n>_PACKET.md` must contain:
1. Scope: milestone id, one-paragraph summary, full changed-file list.
2. Pasted outputs: lint, typecheck, test (with counts), build,
   `check-paid-leak` — from the final commit, not an earlier run.
3. Screenshots for any visual work (375px and 1440px).
4. Deviations: anything done differently from the manual and why (empty
   section = claim of zero deviations — Codex verifies this claim).
5. Known limitations + anything deferred.
6. For fixture-test milestones (M2/M4/M5/M6): the fixture files and both-side
   outputs.

## 3. Generic checks (every review, in this order)

1. **Scope containment:** every changed file is in the packet list; nothing
   outside the milestone's allowed area changed. `git diff --stat` — any
   file the spec forbids (firestore.rules, app-repo functions/, scoring
   constants) is an automatic BLOCKER.
2. **Gates re-run:** lint / typecheck / test / build / leak-gate,
   independently. A packet claiming green that doesn't reproduce = BLOCKER.
3. **Leak gate, manually:** grep the static export (`out/` or build dir)
   for: any question text sampled from Firestore's paid set, >10 cards for
   any chapter, `isFree` violations. The script passing is necessary, not
   sufficient — check the script itself wasn't weakened (diff it).
4. **Engine parity:** any ported logic (gates, scoring, mock draw, deck
   order) must have fixture tests pinning it to app-repo values. Spot-check
   two fixtures by hand against `../ARNReady-App` sources.
5. **isPaid discipline:** grep the diff for writes: `isPaid` must never be
   written client-side, defaulted true, or derived locally. Entitlement
   flows only from the Firestore listener.
6. **Design system:** no raw hex outside the token file, no emojis
   (grep), Feather icons only, bg never white, one primary CTA per public
   page, footer disclaimer present, all new strings marked WORKING.
7. **Nudge law:** every nudge string pitches what premium ADDS; any copy
   selling relief from the nudge/pauses themselves = BLOCKER (Anusha rule).
   Structural check: no nudge renders in mock runs, mistakes deck, upgrade
   page, or for `isPaid` users (tests must pin this).
8. **Fence check:** no app-steers-to-web-checkout implication anywhere; web
   → app links fine.
9. **Regression sweep:** run the existing test suites in full; any
   pre-existing test modified to pass = investigate; deleted test = BLOCKER
   unless the packet justifies it.

## 4. Per-milestone checklists (in addition to §3)

**M1 (public content layer):**
- Teaching normalization: malformed-doc fixtures exist and pass, including
  the prototype-pollution cases (`type: 'constructor'`, `'valueOf'`) — the
  dispatch must not use a bare object-literal lookup. Total function: no
  input may throw.
- Only approved-status teaching renders; drafts never in the export.
- Subtopic pages generated ONLY where approved subtopic teaching exists —
  verify a subtopic without teaching produces no route.
- Sampler = FIRST 10 of canonical order (compare one chapter against the
  app's `buildCanonicalDeck` output by hand); teaching docs excluded from
  deck order via `docType`.
- `/questions` redirects; sitemap has hubs + spokes, no retired routes;
  spoke titles concept-first.

**M2 (nudges/gates):**
- Gate decision fixtures match app `gateBeforeQuestion` for the full input
  matrix; reveal counting is DISTINCT reveals (revisits don't double-count).
- Q21+ wall unbypassable client-side (deep-link to Q21 of practice while
  free → wall); exam uninterrupted after start (no gate consulted mid-run).
- Nudge frequency: same nudge never twice per run; flashcard max 3.

**M3 (auth/entitlement) — security review:**
- No secrets/config beyond the public Firebase web config in the client.
- Cancel path truly cancels: no partial user doc writes, no orphan state.
- isPaid listener: detach on sign-out; default UNPAID on error/missing doc
  (fail-closed); no caching across accounts.
- No firestore.rules diff (BLOCKER if any).
- Auth state flaps (rapid sign-in/out) don't crash gated routes.

**M4 (progress parity) — the highest-stakes non-payment review:**
- Fixtures generated FROM the app service (check provenance in the packet),
  not hand-written to match the web port.
- Byte-identical documents: field order aside, every field name, type,
  rounding, and the mistakes-hook side effects match. Diff the two service
  files side by side; any web-only "improvement" = BLOCKER.
- Timestamps: same semantics as app (server timestamp vs client) — a
  mismatch silently corrupts the app's Prepometer.
- Single write site: no other web module writes progress/sessions/mistakes
  (grep for collection names across `src/`).

**M5 (signed-in study surfaces):**
- Question/flashcard delivery is signed-in RUNTIME only — grep the static
  export for question text; the leak gate must stay green and `out/` must
  contain zero question text (§0.6).
- Practice/exam ordering and draw are PORTED from the app's `quizEngine`
  (`orderPracticeSet`, `drawExamSet`, `capFreeQuestionSet`) with fixture tests
  vs app values; spot-check two by hand. Never re-derived.
- The nudge/wall render sites consume `src/lib/nudgeGates.ts` and the M2
  components verbatim — grep `src/` for any second gate definition.
- Q21+ wall unbypassable client-side: deep-link to Q21 of practice while free
  → wall (reproduce it, do not trust the packet).
- Exam consults no gate after start; flashcard nudges fire at 15/30/45 distinct
  reveals, max 3, and revisits never double-count.
- Zero nudges anywhere for `isPaid` users; the same nudge never twice per run.

**M6 (mock/mistakes/progress):**
- Mock draw fixtures vs app `mockService.js` (weights, counts, no repeats).
- One-free-mock counter: read AND consumed through the M4 service path;
  verify the cross-platform semantics match the app's (same field, same
  doc); a second free mock attempt on web is refused even if the free mock
  was consumed on Android.
- Free/paid scoring displayed per the locked formulas; never both on one
  surface.

**M7 (polish):** accessibility pass (keyboard, focus visible, contrast on
`#F5F5F0`), E-1/E-2 outputs attached for public copy, no WORKING markers
left on public pages post voice pass.

**M8 (Razorpay) — see §5. Zero open blockers before live keys.**

**M9 (release):** full §3 on the whole branch; preview channel only; confirm
no deploy config targets production; Play payments-policy side-by-side is
a HUMAN checklist item — verify it is recorded as done by Anusha, not by a
model.

## 5. Razorpay security checklist (M8 — every line verified in code)

1. Webhook verifies the Razorpay HMAC signature (`X-Razorpay-Signature`,
   webhook secret, constant-time compare) BEFORE trusting any payload
   field. Tampered-signature test evidenced.
2. Order creation: server-side amount/currency constants (₹250 INR) — the
   client can never influence price; order bound to the authenticated uid;
   unauthenticated call rejected.
3. Payment capture handling verifies amount + currency + order id against
   the stored order before granting.
4. Idempotency: replaying the same webhook (evidenced) produces no
   duplicate purchase record and no state change.
5. Entitlement write goes through the SAME recompute path as Play
   (source `razorpay`), server-side only; refund event revokes via the
   same path.
6. Secrets in Functions secret config only — grep the diff for key strings;
   any secret in code, client, or chat history = BLOCKER + rotate.
7. Region `asia-south1`; test keys until Anusha's separate live-key
   approval; no logging of full payloads containing PII/payment data.
8. Client behavior: upgrade UI flips ONLY on the Firestore listener, never
   on checkout-success callbacks.

## 6. After the review

### 6.1 Durable finding capture — before remediation

Before Anusha sends even the first finding to an implementation executor,
Codex must write the complete review to
`docs/ARNREADY_WEBSITE_REVIEW_LOG.md`:

1. Add the review pass and verdict to the review-history table.
2. Record every BLOCKER, SHOULD-FIX, and NIT with a stable milestone-scoped
   ID, severity, exact defect, location, status, and required action.
3. Preserve the exact order in which findings were returned. Never recreate
   an omitted finding from conversation memory. If original text is missing,
   mark it `RECOVERY REQUIRED`; that status blocks milestone approval.
4. Record every finding before marking or verifying any one of them
   RESOLVED. A partial list is not a valid remediation tracker.
5. Keep all entries—including resolved ones—until the milestone passes and
   Anusha signs off. Findings are never deleted to make a milestone appear
   clean.

The review log is the source of truth during remediation. Chat summaries,
executor claims, and remembered numbering are not substitutes. Before naming
the “next finding,” Codex must read its exact ID and text from the log.

### 6.2 One-at-a-time remediation verification

Anusha pastes one logged finding into a remediation session (manual §3).
After the executor reports a fix, Codex reads that finding from the durable
log, inspects the actual remediation diff, independently reproduces the
failure scenario, and reruns gates proportionate to the change. Codex then:

- marks the item RESOLVED only if the defect and regression coverage are
  independently verified;
- otherwise leaves it OPEN and records the remaining failure precisely;
- appends a decision-history row for every status change; and
- reads the next unresolved item from the log, without skipping ahead to a
  newly discovered SHOULD-FIX or NIT while an earlier BLOCKER remains.

New findings discovered during remediation are added to the log immediately
with new stable IDs. They do not overwrite, renumber, or displace the original
review findings.

BLOCKERs and SHOULD-FIXes are fixed, explicitly deferred, or explicitly
accepted by Anusha (her call, recorded in the packet's remediation log and
the durable review log). NITs are batched, accepted, or dropped. Then Anusha
approves the milestone and the next one may start.

### 6.3 Ownership and write protection

Codex also maintains `docs/ARNREADY_WEBSITE_REVIEW_LOG.md` after every review
and remediation pass. Every unresolved finding is recorded there. An item may
be marked DEFERRED only when Anusha explicitly names the later milestone, or
ACCEPTED only when she explicitly decides to retain it; both decisions record
their rationale and date. Silence and "known limitation" labels never waive
an item. Before milestone approval, the log must contain no OPEN BLOCKER or
SHOULD-FIX entries for that milestone.

The review log and Codex verdict/status entries are Codex-owned review
artifacts. The implementation executor must not author, alter, resolve, or
commit entries on Codex's behalf. The paste-prompt's "Do not edit any file"
rule applies to implementation and evidence files during the adversarial
review; it does not prevent Codex from maintaining its own review log after
the verdict.

Where the executor is Claude Code, project-local Claude permissions must deny
editing `docs/ARNREADY_WEBSITE_REVIEW_LOG.md` while still allowing reads.
This protects ownership at the agent-tool layer without making the file
operating-system read-only for Anusha or Codex. Claude may describe proposed
log changes in its remediation packet, but only Codex writes review verdicts
or statuses.

### 6.4 Milestone closeout

After Anusha explicitly signs off an M-gate, Codex must record that sign-off
and commit the review-log closeout on `web-product`. That dedicated closeout
commit may also include Codex-owned review-protocol corrections, but must not
include implementation or evidence-packet changes unless Anusha separately
requests them. Any DEFERRED or ACCEPTED items must remain visible with their
target milestone or revisit trigger so they carry into the next review.

*ARNReady · ASM Tech · arnready.com*
