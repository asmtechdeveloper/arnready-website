# ARNReady Website — Review Log

**Purpose:** the durable record of Codex milestone reviews, unresolved
findings, explicit milestone deferrals, and open items Anusha has consciously
decided to retain. Review packets contain evidence for one implementation
pass; this log tracks findings and decisions across passes.

**Last reviewed state:** `5316237` (M0 final documentation cleanup). All M0
findings through M0-R16 are verified RESOLVED, with no OPEN BLOCKER,
SHOULD-FIX, or NIT. Anusha signed off M0 on 2026-07-14. M0-D1 remains
explicitly deferred to M1. Other uncommitted or later implementation changes
do not change an item's status until Codex verifies them in a named review
pass.

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
| 2026-07-13 | M0 remediation pass 3 re-review | `bc70605` | APPROVE | M0-R6 and M0-R12 verified RESOLVED; M0-R13 remained RESOLVED. All 23 tests passed without jsdom navigation noise; lint, typecheck, live-Firestore static build, standalone leak gate, manual export checks, scope checks, and the normalized 73-path packet inventory independently passed. Expected negative leak-fixture diagnostics remained on the full suite's stderr. M0-D1 remained explicitly deferred to M1. |
| 2026-07-13 | M0 remediation pass 4 re-review | `7eec177` | APPROVE AFTER FIXES | The test-only `next/link` mock removes the internal Next.js import while preserving Header's supplied click handler and the three M0-R6 regression cases. Lint, typecheck, all 23 tests, five repeated Header-test runs, live-Firestore build, standalone leak gate, `git diff --check`, and the normalized 73-path inventory independently passed. M0-R14 was an open packet-evidence SHOULD-FIX and M0-R15 a packet NIT. M0-D1 remained explicitly deferred to M1. |
| 2026-07-14 | M0 documentation-cleanup re-review | `048e47a` | APPROVE AFTER FIXES | M0-R15 and the attribution/anchor portions of M0-R14 are fixed. Independent lint, typecheck, 23-test suite, five focused Header runs, live-Firestore build, standalone leak gate, `git diff --check`, and normalized 73-path inventory pass. The focused Header runs have empty stderr, but the full suite has 462 stderr bytes from four expected negative leak fixtures, so the packet's literal full-suite zero-stderr claim remains false. |
| 2026-07-14 | M0-R14 targeted packet verification | `40d2dc1` | APPROVE | The packet now accurately states that five focused Header runs have empty stderr and that the passing full suite retains expected negative-fixture diagnostics but has no unexpected or jsdom-navigation-related stderr. M0-R14 and M0-R15 are RESOLVED; no OPEN M0 BLOCKER or SHOULD-FIX remains. M0-R16 records one non-blocking wording NIT. |
| 2026-07-14 | M0-R16 targeted packet verification | `5316237` | APPROVE | The packet now accurately says the expected leak-fixture diagnostics are emitted on stderr and omitted from the stdout-only pasted block. The remediation diff is documentation-only; independent lint, typecheck, and all 23 tests pass, with four expected leak-fixture diagnostics and no jsdom navigation stderr. All M0 findings through M0-R16 are RESOLVED. |
| 2026-07-14 | M0 owner sign-off | `5316237` | SIGNED OFF | Anusha explicitly signed off M0 and authorized transition to M1. M0-D1 remains carried forward to M1. |

## Findings and explicitly retained items

| ID | Source | Severity | Item | Location | Status | Blocks source milestone pass? | Owner / target | Decision or next action |
|---|---|---|---|---|---|---|---|---|
| M0-R1 | M0-r | BLOCKER | Most copy was centralized, but the assistive navigation labels remained hardcoded outside the central copy module. | `src/lib/copy.ts:41-42`; `src/components/Header.tsx:38,83` | RESOLVED | No | — | Verified in the working tree atop `ae4658e`: both labels are centralized under `nav` and consumed by Header; no hardcoded Primary nav labels remain. Independent lint, typecheck, and 20 tests pass. |
| M0-R2 | M0-r | BLOCKER | The raw-hex guard exempted all of `test/tokens.test.ts` and missed JavaScript/JSX extensions. | `scripts/check-no-raw-hex.mjs`; `test/tokens.test.ts` | RESOLVED | No | — | Verified in `ae4658e`: one allowed token file, expanded extension set, no test literal exception, independent lint/grep green. |
| M0-R3 | M0-r | BLOCKER | The inlined Feather `check-circle` endpoint was `(9,12)`, not the official `(9,11.01)`. | `src/components/Icon.tsx:24`; `test/icon-paths.test.ts` | RESOLVED | No | — | Verified in `ae4658e`: exact endpoint restored and all nine paths pinned; independent tests pass. |
| M0-R4 | M0-r | BLOCKER | The M0 packet contained verbal responsive checks but no required 375px/1440px screenshot artifacts. | `docs/review-packets/screenshots/M0/` | RESOLVED | No | — | Verified in `ae4658e`: 18 non-empty PNGs, all nine routes at both widths, correct dimensions and sampled visual content. |
| M0-R5 | M0-r | SHOULD-FIX | The shared `linkify` helper was fixed, but FAQ still used its own old destructuring-`split` renderer and could truncate repeated linked phrases. | `src/app/faq/page.tsx:4,33`; `src/lib/linkify.tsx:13-34`; `test/linkify.test.tsx:5-34` | RESOLVED | No | — | Verified in the working tree atop `ae4658e`: the duplicate renderer is removed and every FAQ answer uses the shared helper covered for repeated labels, preserved trailing text, multiple rules, and no-rule input. Independent lint, typecheck, and 20 tests pass. |
| M0-R6 | M0-r | SHOULD-FIX | The mobile menu previously remained expanded after same-route header/mobile-nav clicks, and the first regression-test attempt emitted asynchronous jsdom navigation errors. | `test/Header.test.tsx:1-80`; `src/components/Header.tsx:14-25,30-32,62-64,82-89` | RESOLVED | No | — | Resolved at `bc70605` and reverified at `7eec177`: explicit link handlers plus the pathname fallback are present; three tests cover same-route CTA, same-route mobile nav, and cross-route pathname change. Five consecutive focused Header runs have empty stderr; the full 23-test suite has no jsdom navigation noise, while retaining expected negative leak-fixture diagnostics. The behavior was independently exercised at 375px in the preceding targeted review. |
| M0-R7 | M0-r | SHOULD-FIX | The delete-account Questions section regressed from an actionable email link to plain "email us" text. | `src/app/delete-account/page.tsx:65` | RESOLVED | No | — | Verified in `ae4658e`: centrally defined mailto and Support links both render and appear in the committed mobile screenshot. |
| M0-R8 | M0-r | SHOULD-FIX | Packet artifact counts contradicted one another and referred to cleanup the isolated tests do not perform. | `docs/review-packets/M0_PACKET.md:272-308` | RESOLVED | No | — | Verified in `ae4658e`: 139 generated files and byte-identical manifests before/after the independently rerun targeted tests. |
| M0-R9 | M0-r | SHOULD-FIX | Feather attribution named MIT but omitted the upstream permission notice. | `THIRD_PARTY_NOTICES.md` | RESOLVED | No | — | Verified in `ae4658e`: full Feather MIT notice and source attribution are present. |
| M0-R10 | M0-r | NIT | Leak-test comments incorrectly said no live service-account key is available. | `test/check-paid-leak.test.ts:11-18` | RESOLVED | No | — | Verified in `ae4658e`: comments accurately describe credential-independent fixtures. |
| M0-R11 | M0-r | NIT | Custom gutter tokens were configured but containers still used Tailwind's default `px-4 sm:px-6`. | public page/shared containers | RESOLVED | No | — | Verified in `ae4658e`: public containers consume `px-gutter-mobile sm:px-gutter-desktop`. |
| M0-R12 | M0-r2 | NIT | The packet inventory previously omitted committed review evidence, used a screenshot glob, and later omitted the new Header regression test while claiming to be final. | `docs/review-packets/M0_PACKET.md:118-205`; `test/Header.test.tsx` | RESOLVED | No | — | Verified at `7eec177`: the packet explicitly lists both review documents, all 18 screenshots, and `test/Header.test.tsx`; its normalized inventory exactly matches all 73 paths from `git diff --name-status bb09ee0 7eec177`. |
| M0-R13 | M0-r2 | NIT | The current-state summary incorrectly said the raw-hex guard retained a pinning-test exception after M0-R2 removed it. | `docs/review-packets/M0_PACKET.md:90-95` | RESOLVED | No | — | Verified in the working tree atop `ae4658e`: the summary now states there are no exceptions and accurately describes checksum-based token pinning. Remaining exception mentions are explicitly historical or state that the exception was removed. |
| M0-R14 | M0-r4 | SHOULD-FIX | The r4 packet claimed the full suite produced zero stderr every time and that this was checked by grepping `error\|not implemented\|fail`. The focused Header test has empty stderr, but the full suite intentionally emits four negative leak-fixture `PAID-CONTENT LEAK GATE FAILED` diagnostics. | `docs/review-packets/M0_PACKET.md:3-32,342-361` | RESOLVED | No | — | Verified at `40d2dc1`: the packet claims empty stderr only for the five focused Header runs and accurately distinguishes the full suite's expected negative-fixture diagnostics from unexpected or jsdom-navigation-related stderr. The attribution and anchor explanation are also accurate. |
| M0-R15 | M0-r4 | NIT | The final-commit scope chain stopped at M0-r3 even though the packet was M0-r4, and the hash-proof comment said `20/20 passed` while the final suite contains 23 tests. | `docs/review-packets/M0_PACKET.md:123,143-146,365` | RESOLVED | No | — | Verified at `048e47a`: both scope descriptions list all four remediation passes through M0-r4 and the hash-proof comment says `23/23 passed`. |
| M0-R16 | M0 documentation cleanup | NIT | The packet said the expected leak-fixture diagnostics were “visible in” its pasted `npm run test` block, but that block contains only the passing test summary and omits stderr. | `docs/review-packets/M0_PACKET.md:342-349` | RESOLVED | No | — | Verified at `5316237`: the packet now says the diagnostics are emitted on stderr and explicitly notes that the pasted block is stdout-only and omits them. |
| M0-D1 | M0 initial | BLOCKER | Paid-fingerprint truncation/collision and HTML-entity normalization gaps in the load-bearing export/leak scripts. | `scripts/export-content.mjs`; `scripts/check-paid-leak.mjs` | DEFERRED | No | M1 | **Anusha decision, 2026-07-13:** defer to M1 and address with M1's public-budget leak-gate extension. Recorded in `M0_PACKET.md`. |

## Decision history

Add one row whenever an item's status changes. Do not rewrite prior decisions.

| Date | Item | From | To | Decided / verified by | Reason and evidence |
|---|---|---|---|---|---|
| 2026-07-13 | M0-D1 | OPEN | DEFERRED | Anusha | Explicitly assigned to M1 because both affected scripts are load-bearing in M0 and M1 already owns their public-budget extension. |
| 2026-07-13 | M0-R1 | OPEN | RESOLVED | Codex | Independently verified the centralized desktop/mobile navigation labels and Header references in the uncommitted working tree atop `ae4658e`; lint, typecheck, and all 20 tests pass. |
| 2026-07-13 | M0-R5 | OPEN | RESOLVED | Codex | Independently verified removal of FAQ's duplicate renderer and use of the shared repeated-label-safe helper in the uncommitted working tree atop `ae4658e`; lint, typecheck, and all 20 tests pass. |
| 2026-07-13 | M0-R13 | OPEN | RESOLVED | Codex | Verified that the packet's current-state summary now accurately records zero raw-hex guard exceptions and checksum-based token pinning. |
| 2026-07-13 | M0-R6 | OPEN | RESOLVED | Codex | At `bc70605`, independently verified all three Header regression tests without jsdom navigation noise, the closing handlers/pathname fallback in source, and the same-route/cross-route behavior at 375px; reverified the focused tests five times after the test-only hardening in `7eec177`. |
| 2026-07-13 | M0-R12 | OPEN | RESOLVED | Codex | At `bc70605`, independently matched the packet inventory to all 73 Git paths, including both review documents, all 18 screenshots, and `test/Header.test.tsx`; the normalized inventory remains exact at `7eec177`. |
| 2026-07-13 | M0-R2 | OPEN | RESOLVED | Codex | Independently verified raw-hex guard scope and zero extra literals at `ae4658e`. |
| 2026-07-13 | M0-R3 | OPEN | RESOLVED | Codex | Independently verified official check-circle geometry and 9/9 path tests at `ae4658e`. |
| 2026-07-13 | M0-R4 | OPEN | RESOLVED | Codex | Verified all 18 committed screenshot artifacts and independently swept all routes at both widths. |
| 2026-07-13 | M0-R7 | OPEN | RESOLVED | Codex | Verified the restored delete-account mailto and Support links in source and rendered evidence. |
| 2026-07-13 | M0-R8 | OPEN | RESOLVED | Codex | Independently reran the isolated leak tests; all 139 generated artifacts remained byte-identical. |
| 2026-07-13 | M0-R9 | OPEN | RESOLVED | Codex | Verified the complete Feather MIT notice in `THIRD_PARTY_NOTICES.md`. |
| 2026-07-13 | M0-R10 | OPEN | RESOLVED | Codex | Verified corrected credential-independent test documentation. |
| 2026-07-13 | M0-R11 | OPEN | RESOLVED | Codex | Verified custom gutter utilities across public page and shared containers. |
| 2026-07-14 | M0-R15 | OPEN | RESOLVED | Codex | At `048e47a`, verified both M0 scope/pass descriptions include M0-r4 and the stale test count is corrected to 23/23. |
| 2026-07-14 | M0-R14 | OPEN | RESOLVED | Codex | At `40d2dc1`, verified the packet accurately limits the empty-stderr claim to five focused Header runs and identifies the full suite's four negative leak-fixture diagnostics as expected output, with no unexpected or jsdom-navigation-related stderr. |
| 2026-07-14 | M0-R16 | OPEN | RESOLVED | Codex | At `5316237`, verified the packet accurately distinguishes the diagnostics emitted on stderr from the stdout-only pasted test block. |

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
6. After Anusha explicitly signs off an M-gate, Codex records the sign-off
   and commits the review-log closeout. Implementation executors must not
   author or commit Codex verdict/status entries.
