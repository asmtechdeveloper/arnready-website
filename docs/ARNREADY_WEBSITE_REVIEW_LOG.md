# ARNReady Website — Review Log

**Purpose:** the durable record of Codex milestone reviews, unresolved
findings, explicit milestone deferrals, and open items Anusha has consciously
decided to retain. Review packets contain evidence for one implementation
pass; this log tracks findings and decisions across passes.

**Last reviewed state:** `1c94cb2` (M0 remediation). Uncommitted or later
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

## Active and explicitly retained items

| ID | Source | Severity | Item | Location | Status | Blocks source milestone pass? | Owner / target | Decision or next action |
|---|---|---|---|---|---|---|---|---|
| M0-R1 | M0-r | BLOCKER | User-facing and assistive strings, link labels, and visible-copy predicates remain outside the central copy module. | `src/app/privacy/page.tsx:13,42`; `src/components/Header.tsx:18`; `src/components/Footer.tsx:27`; `src/app/layout.tsx:19`; `src/app/nism-series-v-a/page.tsx:24` | OPEN | Yes | M0 remediation | Move all copy/link metadata into `src/lib/copy.ts`; remove visible-string equality checks. |
| M0-R2 | M0-r | BLOCKER | The raw-hex guard exempts all of `test/tokens.test.ts` and misses JavaScript/JSX extensions. | `scripts/check-no-raw-hex.mjs:17,31`; `test/tokens.test.ts:6` | OPEN | Yes | M0 remediation | Remove the exception/literals and scan every relevant source/config extension. |
| M0-R3 | M0-r | BLOCKER | The inlined Feather `check-circle` endpoint is `(9,12)`, not the official `(9,11.01)`. | `src/components/Icon.tsx:22` | OPEN | Yes | M0 remediation | Restore exact official geometry and add a geometry-pinning test. |
| M0-R4 | M0-r | BLOCKER | The M0 packet contains verbal responsive checks but no required 375px/1440px screenshot artifacts. | `docs/review-packets/M0_PACKET.md:251` | OPEN | Yes | M0 evidence | Attach durable screenshot artifacts and reference them from the packet. |
| M0-R5 | M0-r | SHOULD-FIX | Link rendering drops content after a repeated linked phrase. | `src/lib/linkify.tsx:17`; `src/app/faq/page.tsx:23` | OPEN | Yes | M0 remediation | Preserve all text segments and add repeated-label tests. |
| M0-R6 | M0-r | SHOULD-FIX | The mobile menu remains expanded when the header logo or global CTA navigates. | `src/components/Header.tsx:14,45` | OPEN | Yes | M0 remediation | Close on every header navigation or on pathname change; add an interaction test. |
| M0-R7 | M0-r | SHOULD-FIX | The delete-account Questions section regressed from an actionable email link to plain "email us" text. | `src/app/delete-account/page.tsx:65` | OPEN | Yes | M0 remediation | Restore a centrally defined `mailto:` link. |
| M0-R8 | M0-r | SHOULD-FIX | Packet artifact counts contradict one another and refer to cleanup the isolated tests do not perform. | `docs/review-packets/M0_PACKET.md:223` | OPEN | Yes | M0 evidence | Replace with unambiguous per-directory before/after counts or hashes. |
| M0-R9 | M0-r | SHOULD-FIX | Feather attribution names MIT but omits the upstream permission notice. | `src/components/Icon.tsx:12` | OPEN | Yes | M0 remediation | Add the full Feather MIT text to a third-party notice and reference it. |
| M0-R10 | M0-r | NIT | Leak-test comments incorrectly say no live service-account key is available. | `test/check-paid-leak.test.ts:11` | OPEN | No | Backlog / M0 | Describe the tests as intentionally credential-independent. |
| M0-R11 | M0-r | NIT | Custom gutter tokens are configured but containers still use Tailwind's default `px-4 sm:px-6`. | `tailwind.config.ts:34`; `src/app/page.tsx:7` | OPEN | No | Backlog / M0 | Consume the custom gutter utilities or explicitly accept the duplication. |
| M0-D1 | M0 initial | BLOCKER | Paid-fingerprint truncation/collision and HTML-entity normalization gaps in the load-bearing export/leak scripts. | `scripts/export-content.mjs`; `scripts/check-paid-leak.mjs` | DEFERRED | No | M1 | **Anusha decision, 2026-07-13:** defer to M1 and address with M1's public-budget leak-gate extension. Recorded in `M0_PACKET.md`. |

## Decision history

Add one row whenever an item's status changes. Do not rewrite prior decisions.

| Date | Item | From | To | Decided / verified by | Reason and evidence |
|---|---|---|---|---|---|
| 2026-07-13 | M0-D1 | OPEN | DEFERRED | Anusha | Explicitly assigned to M1 because both affected scripts are load-bearing in M0 and M1 already owns their public-budget extension. |

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
