# ARNReady Website — Review Log

**Purpose:** the durable record of Codex milestone reviews, unresolved
findings, explicit milestone deferrals, and open items Anusha has consciously
decided to retain. Review packets contain evidence for one implementation
pass; this log tracks findings and decisions across passes.

**Last reviewed state:** `ae4658e` plus the uncommitted M0-R1 and M0-R5
working-tree remediations (targeted verifications), and the M0-R6 behavior
patch and regression tests. M0-R6 remains open only because both link-click
tests still emit jsdom navigation errors to stderr. The uncommitted M0 packet
patch resolves M0-R13; M0-R12 remains open because `test/Header.test.tsx` is
absent from the claimed final inventory. Other uncommitted or later
implementation changes do not change an item's status until Codex verifies
them in a named review pass.

## Status rules

- **OPEN** — unresolved. An OPEN BLOCKER or SHOULD-FIX blocks a clean
  milestone approval.
- **DEFERRED** — Anusha explicitly moved the item to a named later milestone.
  The entry must record the target milestone, rationale, and decision date.
- **ACCEPTED** — Anusha explicitly decided to retain the behavior or
  limitation. The entry must record the rationale and any revisit trigger.
- **RESOLVED** — implemented and independently verified by Codex.

Silence, implementation difficulty, or a packet calling an item "known" does
not change its status. Only Anusha may authorize DEFERRED or ACCEPTED. Codex
may mark an item RESOLVED only after re-verification.

## Review history

| Date | Milestone / pass | Commit | Verdict | Record |
|---|---|---|---|---|
| 2026-07-13 | M0 initial review | `4a2c31f` | REJECT | Findings B1–B10, S1–S6, and N1–N3 were returned for remediation; see `docs/review-packets/M0_PACKET.md`. |
| 2026-07-13 | M0 remediation re-review | `1c94cb2` | REJECT | Four BLOCKERs remain; additional open correctness and evidence items are recorded below. |
| 2026-07-13 | M0 remediation pass 2 re-review | `ae4658e` | REJECT | M0-R2/R3/R4/R7/R8/R9/R10/R11 verified RESOLVED. M0-R1 and M0-R5 remain open; M0-R6 is only partially fixed. Two packet-accounting NITs were added as M0-R12/R13. |
| 2026-07-13 | M0-R1 targeted remediation verification | working tree atop `ae4658e` | APPROVE | Navigation accessibility labels are centralized in `src/lib/copy.ts` and consumed by both Header nav elements. Independent lint, typecheck, and 20-test suite pass. The remediation was uncommitted when verified. |
| 2026-07-13 | M0-R5 targeted remediation verification | working tree atop `ae4658e` | APPROVE | FAQ's duplicate truncating renderer was removed and every answer now uses the shared, regression-tested `linkify` helper. Independent lint, typecheck, and 20-test suite pass. The remediation was uncommitted when verified. |
| 2026-07-13 | M0-R6 targeted remediation verification | working tree atop `ae4658e` | APPROVE AFTER FIXES | At 375px, independently verified that the same-route `/pricing` header CTA and mobile Pricing link close the menu, and that mobile Syllabus navigates cross-route with the menu closed. All §3 gates pass, including the real Firestore build and standalone leak gate. No Header interaction regression test was added, so M0-R6 remains OPEN. |
| 2026-07-13 | M0-R12/R13 packet-NIT verification | working tree atop `ae4658e` | APPROVE AFTER FIXES | M0-R13 verified RESOLVED: the current summary accurately says the raw-hex guard has no test exception. M0-R12 is only partially fixed: the explicit inventory matches tracked changes from `bb09ee0`, but omits the concurrent untracked `test/Header.test.tsx` while claiming to be the final-commit inventory. Lint and typecheck pass; 23 tests pass but the new Header tests currently emit jsdom navigation errors to stderr and remain under remediation. |
| 2026-07-13 | M0-R6 regression-test verification | working tree atop `ae4658e` | APPROVE AFTER FIXES | `test/Header.test.tsx` now meaningfully covers the same-route CTA, same-route mobile Pricing link, and cross-route pathname fallback; lint, typecheck, and all 23 tests pass. The claimed clean run did not reproduce: both link-click tests emit jsdom “navigation not implemented” errors to stderr, so test cleanup remains. |

## Findings and explicitly retained items

| ID | Source | Severity | Item | Location | Status | Blocks source milestone pass? | Owner / target | Decision or next action |
|---|---|---|---|---|---|---|---|---|
| M0-R1 | M0-r | BLOCKER | Most copy was centralized, but the assistive navigation labels remained hardcoded outside the central copy module. | `src/lib/copy.ts:41-42`; `src/components/Header.tsx:38,83` | RESOLVED | No | — | Verified in the working tree atop `ae4658e`: both labels are centralized under `nav` and consumed by Header; no hardcoded Primary nav labels remain. Independent lint, typecheck, and 20 tests pass. |
| M0-R2 | M0-r | BLOCKER | The raw-hex guard exempted all of `test/tokens.test.ts` and missed JavaScript/JSX extensions. | `scripts/check-no-raw-hex.mjs`; `test/tokens.test.ts` | RESOLVED | No | — | Verified in `ae4658e`: one allowed token file, expanded extension set, no test literal exception, independent lint/grep green. |
| M0-R3 | M0-r | BLOCKER | The inlined Feather `check-circle` endpoint was `(9,12)`, not the official `(9,11.01)`. | `src/components/Icon.tsx:24`; `test/icon-paths.test.ts` | RESOLVED | No | — | Verified in `ae4658e`: exact endpoint restored and all nine paths pinned; independent tests pass. |
| M0-R4 | M0-r | BLOCKER | The M0 packet contained verbal responsive checks but no required 375px/1440px screenshot artifacts. | `docs/review-packets/screenshots/M0/` | RESOLVED | No | — | Verified in `ae4658e`: 18 non-empty PNGs, all nine routes at both widths, correct dimensions and sampled visual content. |
| M0-R5 | M0-r | SHOULD-FIX | The shared `linkify` helper was fixed, but FAQ still used its own old destructuring-`split` renderer and could truncate repeated linked phrases. | `src/app/faq/page.tsx:4,33`; `src/lib/linkify.tsx:13-34`; `test/linkify.test.tsx:5-34` | RESOLVED | No | — | Verified in the working tree atop `ae4658e`: the duplicate renderer is removed and every FAQ answer uses the shared helper covered for repeated labels, preserved trailing text, multiple rules, and no-rule input. Independent lint, typecheck, and 20 tests pass. |
| M0-R6 | M0-r | SHOULD-FIX | The restored handlers and three regression tests cover the required same-route and pathname-fallback behavior, but both link-click tests still trigger asynchronous jsdom “navigation not implemented” errors on stderr; the claimed clean test run does not reproduce. | `test/Header.test.tsx:22-43`; `src/components/Header.tsx:25,32,64,89` | OPEN | Yes | M0 remediation | Prevent the anchor default navigation in the two unit-test clicks (without bypassing Header's React `onClick`), or use a focused `next/link` test mock that preserves and invokes the supplied handler; rerun all 23 tests with no stderr errors. |
| M0-R7 | M0-r | SHOULD-FIX | The delete-account Questions section regressed from an actionable email link to plain "email us" text. | `src/app/delete-account/page.tsx:65` | RESOLVED | No | — | Verified in `ae4658e`: centrally defined mailto and Support links both render and appear in the committed mobile screenshot. |
| M0-R8 | M0-r | SHOULD-FIX | Packet artifact counts contradicted one another and referred to cleanup the isolated tests do not perform. | `docs/review-packets/M0_PACKET.md:272-308` | RESOLVED | No | — | Verified in `ae4658e`: 139 generated files and byte-identical manifests before/after the independently rerun targeted tests. |
| M0-R9 | M0-r | SHOULD-FIX | Feather attribution named MIT but omitted the upstream permission notice. | `THIRD_PARTY_NOTICES.md` | RESOLVED | No | — | Verified in `ae4658e`: full Feather MIT notice and source attribution are present. |
| M0-R10 | M0-r | NIT | Leak-test comments incorrectly said no live service-account key is available. | `test/check-paid-leak.test.ts:11-18` | RESOLVED | No | — | Verified in `ae4658e`: comments accurately describe credential-independent fixtures. |
| M0-R11 | M0-r | NIT | Custom gutter tokens were configured but containers still used Tailwind's default `px-4 sm:px-6`. | public page/shared containers | RESOLVED | No | — | Verified in `ae4658e`: public containers consume `px-gutter-mobile sm:px-gutter-desktop`. |
| M0-R12 | M0-r2 | NIT | The packet now explicitly lists both review documents and all 18 screenshot paths, and its tracked list matches `git diff --name-status bb09ee0`; however, it calls this the final-commit inventory while omitting the concurrent untracked `test/Header.test.tsx`. | `docs/review-packets/M0_PACKET.md:105-210`; `test/Header.test.tsx` | OPEN | No | M0 evidence | After the Header-test remediation is complete and committed, regenerate the inventory from the actual final commit so every final path—including `test/Header.test.tsx`—is present. |
| M0-R13 | M0-r2 | NIT | The current-state summary incorrectly said the raw-hex guard retained a pinning-test exception after M0-R2 removed it. | `docs/review-packets/M0_PACKET.md:90-95` | RESOLVED | No | — | Verified in the working tree atop `ae4658e`: the summary now states there are no exceptions and accurately describes checksum-based token pinning. Remaining exception mentions are explicitly historical or state that the exception was removed. |
| M0-D1 | M0 initial | BLOCKER | Paid-fingerprint truncation/collision and HTML-entity normalization gaps in the load-bearing export/leak scripts. | `scripts/export-content.mjs`; `scripts/check-paid-leak.mjs` | DEFERRED | No | M1 | **Anusha decision, 2026-07-13:** defer to M1 and address with M1's public-budget leak-gate extension. Recorded in `M0_PACKET.md`. |

## Decision history

Add one row whenever an item's status changes. Do not rewrite prior decisions.

| Date | Item | From | To | Decided / verified by | Reason and evidence |
|---|---|---|---|---|---|
| 2026-07-13 | M0-D1 | OPEN | DEFERRED | Anusha | Explicitly assigned to M1 because both affected scripts are load-bearing in M0 and M1 already owns their public-budget extension. |
| 2026-07-13 | M0-R1 | OPEN | RESOLVED | Codex | Independently verified the centralized desktop/mobile navigation labels and Header references in the uncommitted working tree atop `ae4658e`; lint, typecheck, and all 20 tests pass. |
| 2026-07-13 | M0-R5 | OPEN | RESOLVED | Codex | Independently verified removal of FAQ's duplicate renderer and use of the shared repeated-label-safe helper in the uncommitted working tree atop `ae4658e`; lint, typecheck, and all 20 tests pass. |
| 2026-07-13 | M0-R13 | OPEN | RESOLVED | Codex | Verified that the packet's current-state summary now accurately records zero raw-hex guard exceptions and checksum-based token pinning. |
| 2026-07-13 | M0-R2 | OPEN | RESOLVED | Codex | Independently verified raw-hex guard scope and zero extra literals at `ae4658e`. |
| 2026-07-13 | M0-R3 | OPEN | RESOLVED | Codex | Independently verified official check-circle geometry and 9/9 path tests at `ae4658e`. |
| 2026-07-13 | M0-R4 | OPEN | RESOLVED | Codex | Verified all 18 committed screenshot artifacts and independently swept all routes at both widths. |
| 2026-07-13 | M0-R7 | OPEN | RESOLVED | Codex | Verified the restored delete-account mailto and Support links in source and rendered evidence. |
| 2026-07-13 | M0-R8 | OPEN | RESOLVED | Codex | Independently reran the isolated leak tests; all 139 generated artifacts remained byte-identical. |
| 2026-07-13 | M0-R9 | OPEN | RESOLVED | Codex | Verified the complete Feather MIT notice in `THIRD_PARTY_NOTICES.md`. |
| 2026-07-13 | M0-R10 | OPEN | RESOLVED | Codex | Verified corrected credential-independent test documentation. |
| 2026-07-13 | M0-R11 | OPEN | RESOLVED | Codex | Verified custom gutter utilities across public page and shared containers. |

## Maintenance procedure

1. After every Codex review, add the review-history row and every new finding.
2. After remediation, update verified findings to RESOLVED and append a
   decision-history row; do not delete them.
3. Record a DEFERRED or ACCEPTED status only after Anusha explicitly states
   that decision. Include the target milestone or revisit trigger.
4. Before approving a milestone, confirm it has no OPEN BLOCKER or
   SHOULD-FIX entries whose source is that milestone.
5. At the start of each milestone, review all DEFERRED entries targeting it
   and all ACCEPTED entries whose revisit trigger has fired.
