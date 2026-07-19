# ARNReady Website — Design Document

**Status:** v1.1 (20 July 2026 — §10 and §11 corrected; see §10's note)  
**Applies to:** the public website and the browser product under `/app`  
**Implementation baseline:** `web-product` branch  
**Owners:** Anusha (product, voice, and every approval); an orchestrator agent
builds each milestone; Codex reviews. Roles, never model names — Anusha assigns
them per milestone (execution manual, "Who does what").

> **This document is the VISUAL and INTERACTION contract only.** It is not the
> authority on what has been built. `docs/ARNREADY_WEBSITE_EXECUTION_MANUAL.md`
> §2 is the milestone plan, and the git log is the record of what exists. If
> this document and the manual disagree, the manual wins (CLAUDE.md canon
> hierarchy).

This document is the visual and interaction contract for ARNReady on the web.
The PRD owns product scope, the information architecture owns routes, the copy
scaffold owns messaging, and `CLAUDE.md` plus the app repo own locked product
rules. If a visual idea would weaken a locked gate, scoring rule, entitlement
rule, or Play-policy fence, the visual idea loses.

## 1. Design intent

ARNReady should feel like a calm, capable study room: welcoming enough to make
starting easy, serious enough to trust with exam preparation, and lively enough
that returning does not feel like punishment.

The visual north star is:

> Duolingo warmth × Zerodha Varsity clarity × Headspace calm — expressed as
> ARNReady, not as an imitation of any of the three.

The website has two related jobs:

1. **Public site:** explain the exam and the product, earn trust, answer search
   intent, and lead a learner to one useful next action.
2. **Study product:** get out of the way while the learner practises, reviews,
   and takes timed tests.

The public site may be more editorial. The study product should be denser and
more task-focused. They share one brand, token set, voice, account, and domain.

## 2. Audience and design consequences

Primary users are Indian working professionals preparing for NISM Series V-A,
often in short sessions between work and family commitments. Some will arrive
on a phone from search or WhatsApp; the full mock is deliberately strongest on
a laptop.

This means the design must:

- make the first useful action visible without requiring an account;
- explain unfamiliar exam-prep terms in plain language;
- favour scanning over ornamental storytelling;
- use large, dependable tap targets and readable body text;
- preserve state and orientation during long quizzes;
- state limits, prices, and scoring honestly; and
- never manufacture urgency or anxiety.

## 3. Experience principles

### 3.1 Useful before persuasive

A visitor should be able to start practising or open flashcards before reading
a long sales story. Product evidence is the strongest marketing surface.

### 3.2 Calm confidence

Use generous spacing, a warm cream canvas, restrained shadows, and short copy.
Avoid countdown panic, excessive badges, confetti for ordinary actions, noisy
gradients, or a dashboard full of competing metrics.

### 3.3 Honest progress

Never make results look better than they are. Distinguish practice activity
from exam readiness. Explain score denominators where ambiguity could mislead.
Success colour is earned; it is not decorative wallpaper.

### 3.4 One obvious next step

Each public page ends with one primary CTA. Product screens may contain several
tools, but hierarchy must make the recommended next action unmistakable.

### 3.5 Arnie has a job

Arnie guides, reassures, warns, works, or celebrates. He is not filler. Use at
most one Arnie scene per surface, reserve celebratory poses for earned moments,
and never let the illustration displace the task on small screens.

## 4. Brand system

### 4.1 Colour

The current web tokens mirror the app and remain canonical:

| Role | Token | Value | Use |
|---|---|---:|---|
| Primary | Purple | `#534AB7` | primary CTA, active navigation, key emphasis |
| Primary hover | Purple dark | `#443C99` | hover/pressed state |
| Primary tint | Purple soft | `#EEEDF8` | selected and informative backgrounds |
| Success | Green | `#1D9E75` | correct, completed, positive status |
| Success tint | Green soft | `#E4F4EE` | low-emphasis success surface |
| Canvas | Cream | `#F5F5F0` | page background; never pure white |
| Attention | Amber | `#F59E0B` | caution, review, near-threshold state |
| Error | Red | `#EF4444` | incorrect, destructive, blocking error |
| Text | Ink | `#1A1A2E` | headings and primary copy |
| Secondary text | Muted | `#6B7280` | supporting copy only |
| Divider | Line | `#E5E7EB` | borders and separators |

White is allowed for cards and contained surfaces, not as the page canvas.
Colour must never be the only carrier of meaning.

### 4.2 Typography

Nunito is the only product typeface. Use strong weights for short headings and
controls; use comfortable line height and normal visual density for reading.

- Hero: 40–48px on desktop, 34–40px on mobile.
- Page title: 30–36px.
- Section heading: 24–30px.
- Card heading: 16–20px.
- Body: 15–17px, minimum 1.55 line height for paragraphs.
- Supporting/meta text: 12–14px; never use tiny text for material conditions.

Headings should be sentence case. Avoid long all-caps labels; short eyebrow or
chapter labels may use uppercase with additional letter spacing.

### 4.3 Shape, elevation, and iconography

- Cards use the existing 20px radius and restrained `shadow-card` elevation.
- Primary actions use a pill shape; secondary actions use a border or quiet
  tinted fill.
- Use Feather icons through `src/components/Icon.tsx`; no emoji UI.
- Do not introduce a second icon family without an explicit design decision.
- Decorative gradients and glass effects are exceptions, not defaults.

### 4.4 Imagery

Use approved static Arnie PNGs. Lottie is not part of the product system.
Do not generate replacement brand characters. New illustrations require
Anusha's approval and should be commissioned in batches to avoid wasting scarce
creative/model access.

## 5. Layout system

### 5.1 Shared grid

- Standard maximum content width: 1152px (`max-w-6xl`).
- Reading width: approximately 680–760px.
- Horizontal gutters: 16px mobile, 24px tablet and desktop.
- Standard section gap: 64–80px public pages; 32–48px product pages.
- Card grids collapse from three columns to two and then one without changing
  reading order.

### 5.2 Responsive behaviour

Mobile is a complete experience, not a compressed desktop screenshot.

- Public navigation becomes a clear menu with the primary CTA retained.
- Hero layouts stack with the task/copy before decorative imagery in reading
  order, even if visual order changes.
- Quiz controls remain reachable without horizontal page scrolling.
- The mock question palette may become a drawer or compact jump control on
  narrow screens; the laptop layout remains the flagship.
- Sticky elements must not consume excessive phone viewport height.

### 5.3 Public page anatomy

Most acquisition pages should follow this rhythm:

1. concise exam/product context;
2. one clear promise and primary CTA;
3. evidence or useful content;
4. how ARNReady helps;
5. limitations, price, or FAQ where relevant;
6. one closing CTA;
7. canonical independence disclaimer in the footer.

Do not force this template on compliance pages or pages whose primary purpose
is reference reading.

### 5.4 Product page anatomy

Product screens use the compact product header and a task-first main region.
The study home prioritises resume/next action, then modes, then chapters and
progress. Quiz players prioritise question context, answer interaction, and the
next/submit control; secondary data must not compete with those three.

## 6. Core components and states

Shared components should cover:

- public and product headers;
- footer and disclaimer;
- primary, secondary, quiet, and destructive buttons;
- cards and selectable cards;
- chapter/progress summaries;
- question card, option, explanation, and result states;
- gate, paywall, sign-in, empty, loading, offline, and error states;
- toast or inline feedback where the user needs confirmation; and
- Arnie scenes with named moods, alt behaviour, and consistent sizing.

Every interactive component needs default, hover, focus-visible, active,
disabled, loading, error, and—where applicable—selected/correct/incorrect
states. Disabled controls must explain what unlocks them when that is not
obvious.

## 7. Interaction rules

- Preserve the locked Q1–10 → gate → Q11–15 → gate → Q16–20 → paywall
  sequence. Gate presentation may change; gate order may not.
- Do not interrupt an answer with an account prompt. Ask at a natural boundary
  such as save, results, mistakes, or mock entry.
- Confirm destructive actions and final mock submission.
- Keep keyboard support first-class for laptop mocks: answer selection,
  previous/next, flag, and palette navigation must have discoverable shortcuts.
- Motion should clarify state and remain short. Respect reduced-motion settings.
- Never put ads on upgrade/paywall screens. Ad surfaces must be visually distinct
  from ARNReady content and must not create accidental taps.

## 8. Content and trust

- All public copy remains **WORKING** until Anusha's voice pass.
- Every public artefact passes fake-claim and affiliation-risk review before
  release.
- Use first-person founder voice only where it is genuinely Anusha speaking.
- State that ARNReady is independent of NISM, SEBI, and AMFI on every public
  page through the shared footer.
- Do not imply guaranteed passing, official approval, complete prediction, or
  outcomes unsupported by evidence.
- Price and access boundaries must be visible before a user invests a long
  session.

## 9. Accessibility baseline

Release acceptance requires:

- semantic landmarks and heading order;
- full keyboard operation with visible focus;
- labelled controls and meaningful image alternatives;
- 44×44px minimum practical touch targets;
- WCAG AA contrast for text and essential controls;
- errors described in text, not colour alone;
- no essential information hidden only in hover content;
- reduced-motion support for non-essential animation; and
- usable layouts at 200% zoom and common mobile text scaling.

Automated checks help but do not replace a keyboard pass and screen-reader spot
check of the core free-study journey.

## 10. Current implementation baseline

> **Corrected 20 July 2026.** This section previously described the PRE-RESET
> product — including `/app` study home, flashcards, practice, exam, mock,
> mistakes, progress, account and upgrade surfaces. **Those were deleted in the
> 13 July repo reset** and are preserved read-only at git tag
> `pre-reset-snapshot`. The stale text caused at least one session to read the
> branch as unbuilt. Treat the list below as a dated snapshot, not a
> guarantee; the manual's §2 and the git log are authoritative.

State as of **20 July 2026** (`web-product`, milestones M0–M4 signed off):

- Next.js App Router, TypeScript, Tailwind, static export; Nunito, shared
  colour tokens, Feather icons, static Arnie scenes (M0);
- public pages — homepage, chapter hubs, subtopic spokes, syllabus, exam guide,
  pricing, FAQ, about, and the compliance set (M0–M1);
- sitemap, robots, legacy redirects, and a build-blocking paid-content leak
  gate (M0–M1);
- nudge/gate MACHINERY — `src/lib/nudgeGates.ts`, `<PremiumNudge>`,
  `<UpgradeWall>` — with app-parity fixtures (M2);
- Google sign-in, the read-only `isPaid` entitlement mirror, and the
  signed-out/signed-in `/app` shell (M3);
- `progressService` / `mistakesService` / `progressBackend`, writing progress,
  session and mistakes documents byte-identical to the app, pinned by fixtures
  generated from the app's real services (M4).

**What deliberately does NOT exist yet**, and is the most likely source of
confusion for a new session: there are no study surfaces. `/app` is a shell.
M2's nudge components and M4's progress service both ship as machinery with no
callers, by design — M2's render sites were re-sequenced to M5, and M4 is the
write layer M5 and M6 will call. `/app/practice`, `/app/exam` and
`/app/flashcards` arrive in **M5**; `/app/mock`, `/app/mistakes` and
`/app/progress` in **M6**. An empty-looking `/app` at this point is the plan
working, not a missing build.

This document does not authorise a visual rewrite. New work should first make
the existing system coherent, accessible, and complete. Any proposed new
direction should be shown as a small targeted prototype and approved before a
site-wide refactor.

## 11. Build and review workflow

> **Corrected 20 July 2026.** This section had the build and review roles the
> wrong way round — it named Codex the primary builder and Claude the reviewer.
> The 16 July working arrangement inverted that. The execution manual's "Who
> does what" is canonical; the summary below exists so a reader of this document
> is not misled, and defers to the manual on any detail.

1. Anusha defines the outcome and owns product, brand, policy, secrets, and
   release decisions. She assigns the agent filling each role below, per
   milestone — these are ROLES, not model names.
2. An **orchestrator** owns every milestone: the plan, the decomposition into
   atomic steps, the per-step diff review, and the quality gates. For
   `[STANDARD]` milestones it delegates the mechanical build to executor
   subagents one reviewed step at a time; for `[SENSITIVE]` ones (auth,
   entitlement, progress parity, payments) it writes the core itself.
3. **Codex** reviews every milestone adversarially against
   `docs/ARNREADY_WEBSITE_REVIEW_PROTOCOL.md`, and owns
   `docs/ARNREADY_WEBSITE_REVIEW_LOG.md` — the one file it updates, and the only
   one.
4. The orchestrator remediates BLOCKER and SHOULD-FIX findings as scoped and
   re-runs the gates; Codex re-verifies before anything is marked RESOLVED.
5. Anusha completes the voice/visual pass and authorises deployment.

The builder and the reviewer must not edit the same files concurrently. Every
milestone handoff is the evidence packet defined in review protocol §2: intended
outcome, changed files, gate outputs, screenshots for visual work, known
limitations, and the decisions that remain with Anusha.

### Fable budget

Fable is a scarce review resource, not the default implementation model.
Until the app's advertising work is complete, do not spend Fable access on
routine website code, copy, documentation, styling, or standard reviews.

After the ad work is complete, batch Fable use around high-risk milestones:

- shared-core extraction or cross-repo parity changes;
- auth, Firestore write shapes/rules, App Check, or entitlement logic;
- Razorpay order/webhook/refund and other payment-security work;
- hosting cutover or final release audit where rollback risk is meaningful; and
- a major design-system decision that Anusha explicitly escalates.

Ordinary page implementation, responsive polish, tests, copy iteration, and
Claude review continue without Fable. One prepared review packet is preferred
to repeated context-loading sessions.

## 12. Definition of design-ready

A website milestone is ready for Anusha/Claude review when:

- it follows this document and the route's IA/copy contract;
- desktop and mobile layouts are both complete;
- all meaningful states are implemented;
- keyboard and focus behaviour work;
- copy is marked WORKING where required;
- relevant lint, typecheck, tests, build, and leak check pass;
- visual changes include screenshots at representative widths; and
- the handoff names unresolved decisions without quietly guessing them.

*ARNReady · ASM Tech · arnready.com — Knowledge is free. Mastery is earned.*
