# ARNReady Website — Next Work Plan

**Status:** prototype-first plan (13 July 2026)  
**Branch:** `web-product`  
**Immediate next task:** visual prototype checkpoint  
**Deep implementation:** paused until Anusha approves the prototype direction

## Why the prototype comes first

The branch already contains a broad working product. The next risk is not
whether more code can be written; it is whether the public site and study
experience feel right to Anusha before the team invests in polish,
integration, and release work.

The prototype is therefore a decision tool, not production code. It should make
layout, hierarchy, density, voice, Arnie usage, and the transition from public
site to study product easy to judge.

## Milestone 1 — Visual prototype checkpoint (next chat)

Create one clickable, responsive prototype with three connected views:

1. **Homepage:** hero, proof, free-tier explanation, and the path into study.
2. **Study room:** recommended next action, modes, chapter grid, and signed-out
   progress messaging.
3. **Practice question:** question, answer choices, explanation, progress, and
   next action, including a compact representation of the free gate journey.

Show representative desktop and mobile behaviour. Reuse current brand tokens,
Nunito, approved Arnie assets, and realistic WORKING copy. Use local sample data
only; do not connect Firebase, payments, analytics, ads, or production writes.

### Questions the prototype must answer

- Does the homepage feel warm and trustworthy without becoming childish?
- Is “start practising free” the obvious first action?
- Does the public-to-product transition feel like one coherent brand?
- Is the study room calm enough to orient a returning learner quickly?
- Is the practice screen focused and comfortable for a real study session?
- Is Arnie helpful and rationed rather than decorative?
- Does the design work on both phone and laptop?

### Deliverables

- clickable prototype with homepage → study room → practice flow;
- desktop and mobile states for all three views;
- one compact decision sheet listing what changed from the current branch;
- screenshots for the review handoff; and
- a short list of Anusha decisions, limited to choices that materially affect
  production implementation.

### Acceptance criteria

- No production behaviour, locked gate, scoring, entitlement, or Play-policy
  rule is changed.
- The prototype follows `ARNREADY_WEBSITE_DESIGN_DOCUMENT.md`.
- All three views are navigable and readable at 375px and 1440px widths.
- Primary actions, hierarchy, focus states, and representative empty/error
  states are visible.
- No new paid asset, external service, or Fable session is required.
- Anusha can approve, reject, or request a bounded revision without reading
  code.

## Milestone 2 — Prototype review and design decision

Anusha reviews the prototype. Record only three kinds of outcomes:

- **Approved:** move the chosen patterns into production.
- **Revise:** one bounded prototype revision, then decide.
- **Rejected direction:** stop and redefine the design brief before coding.

Claude reviews the approved prototype handoff for usability, accessibility,
consistency with locked rules, and implementation risk. Fable is not used.

## Milestone 3 — Production visual foundation

After approval, implement the shared production pieces first: tokens, type,
buttons, cards, navigation, responsive grid, focus states, and Arnie scene
rules. Migrate existing pages incrementally; do not rewrite the whole branch in
one pass.

## Milestone 4 — Core free-study journey

Apply the approved system to homepage → study room → chapter practice. Verify
the Q1–10 → gate → Q11–15 → gate → Q16–20 → paywall sequence, responsive
behaviour, keyboard operation, loading/empty/error states, and paid-content leak
gate.

## Milestone 5 — Account and progress integration

Register/configure the Firebase Web App only with Anusha's approval. Then
integration-test Google sign-in, live entitlement reads, progress writes,
mistakes, account state, and cross-platform fixture parity. This is a high-risk
review milestone but remains outside the prototype.

## Milestone 6 — Preview and release review

Run the full quality gates, prepare the Claude review packet, remediate accepted
findings, deploy to an approval-gated Firebase preview channel, and complete
Anusha's device/voice/legal pass. Production cutover remains a separate explicit
approval.

## Deferred until its own milestone

- real web advertising format and provider integration;
- Razorpay checkout, webhook, refunds, or entitlement writers;
- shared-core extraction across repositories;
- production analytics;
- Firebase Hosting production cutover; and
- `/book` and `/youtube-course` expansion.

## Next-chat starting prompt

> Read `CLAUDE.md`, `docs/ARNREADY_WEBSITE_DESIGN_DOCUMENT.md`, and
> `docs/ARNREADY_WEBSITE_NEXT_WORK_PLAN.md`. Work only on Milestone 1: create a
> clickable responsive prototype for the homepage, study room, and one practice
> question flow. Use current ARNReady tokens and approved Arnie assets. Do not
> connect Firebase, ads, payments, analytics, or production writes. Show me the
> prototype and the small set of design decisions it exposes before changing
> production pages.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
