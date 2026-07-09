# ARNReady Website — Lower-Model Prompt Library

**Status:** v3 (9 July 2026). The WEBSITE half of the retired combined
`ARNREADY_WEB_AND_YOUTUBE_LOWER_MODEL_PROMPTS.md` (v2), split when the
projects separated. The YouTube half lives in
`../../ARNReady-YouTube/docs/ARNREADY_YOUTUBE_PROMPT_LIBRARY.md`.
Usage: paste the CONTEXT BLOCK (§0), then one prompt, then the inputs it
names. All outputs are WORKING until Anusha's review — keep that label.

**Maintenance:** facts change in the CONTEXT BLOCK once, never
per-prompt. The block is DUPLICATED in the YouTube library — a fact fix
must land in both. If the block disagrees with the app repo's CLAUDE.md
or config.js, those win — fix the block. New prompts follow the house
shape: TASK / INPUTS / CONSTRAINTS / OUTPUT FORMAT / DO NOT.

---

## §0 — THE CONTEXT BLOCK (paste first, always)

```
CONTEXT — ARNReady (read fully before writing anything):
ARNReady helps people pass the NISM Series V-A Mutual Fund Distributor
exam (India). Built by Anusha Murthy (ASM Tech). Tagline: "Get ARN Ready."
Motto: "Knowledge is free. Mastery is earned."

THE ECOSYSTEM (four pillars, one account):
1. Mobile app (Android) — daily practice, flashcards, mock tests, mistakes
   deck; free to start.
2. ARNReady Web (arnready.com) — the SAME full product in the browser:
   practice, exam mode, flashcards, and full 100-question mock tests
   (laptop mocks are the flagship); same account, same progress. The web
   serves the full free tier even without sign-in; signing in adds
   saved progress.
3. YouTube — the FREE complete NISM Series V-A course: chapter-by-chapter
   lectures, concept explainers, revision videos, Shorts. The course is
   genuinely free and complete — practice depth is what's paid.
4. Book — physical question bank + revision companion (Amazon KDP). The
   book is a separate purchase — it is NOT included in the ₹250 unlock
   and does not unlock anything digital.

Premium: one-time ₹250 (never a subscription) = full question bank,
unlimited mocks, answer review. Pay ONCE, anywhere — on the website or
in the app — and both unlock together, forever. On the WEBSITE, the web
checkout is the primary conversion CTA. The MOBILE APP pays only via
Google Play and never mentions or links to web checkout (store policy).

Product facts: 12 syllabus chapters. Free: real practice questions per
chapter, ONE full mock, ALL flashcards, the mistakes deck. Mock: 100
questions, 120 minutes, weighted like the real exam. Scoring is
deliberately strict/honest — ARNReady never inflates readiness.
Arnie is the PANDA mascot (a panda — never call him a red panda). He
celebrates rarely, so it means something.

Exam facts (mark every use [VERIFY] until confirmed): 100 questions,
120 minutes, 50% pass mark, no negative marking, certificate valid 3 years.

VOICE: first person (Anusha), honest, warm, lightly funny, Indian, calm.
Never fear-based ("43 days to exam day", never "only 43 days left!").
Candidates are smart professionals. Plain Indian English; no emojis; at
most one exclamation mark per page/script.

HARD RULES — never write: "guaranteed pass", "crack in X days", "100%
success", invented testimonials/user counts/pass rates, "official" or
"NISM-approved" or any NISM/SEBI/AMFI affiliation, fake urgency, ANY
investment advice (we teach the exam, never which fund to buy — say so
when adjacent). Include the independence disclaimer wherever the format
has a footer/description. Never copy real exam-paper questions; never
cite "the workbook" verbatim in public copy; only isFree question-bank
material may appear publicly — paid content never leaks. The mobile app
never mentions or links to web checkout or web pricing (store policy).

DO NOT INVENT: features, facts, numbers, policies, or syllabus content
not given in this block or pasted as input. Unsure → write
[ANUSHA-DECIDE: question] or [VERIFY]. Label all output
"WORKING — awaiting Anusha's review".
```

---

## A. Website prompts

### W-1 — Generate a chapter website page (`/chapters/[n]`)
```
TASK: Write the /chapters/{n} page for arnready.com.
INPUTS: chapter number + title + weightage + the chapter's key-concept
list + 2–3 isFree sample questions WITH explanations (all pasted — never
from memory) + lecture video ID if it exists.
CONSTRAINTS: open by answering "what is chapter {n} and how many marks is
it worth" in 2–3 sentences; sections: what this chapter covers (H2 per
major sub-topic, 2–4 sentences each) → key numbers/rules table → 2–3
sample questions worked through (question, the tempting wrong answer, the
right answer, the rule) → lecture embed slot [LECTURE-EMBED or "lecture
coming" line] → free-practice CTA to /app/practice/{n}. 600–1100 words.
OUTPUT FORMAT: markdown + frontmatter (title ≤60 chars pattern "NISM
Series V-A Chapter {n}: {Title} — ARNReady", description ≤155, slug
chapters/{n}, targetQuery, status: WORKING, sources, dates).
DO NOT: teach beyond the pasted material; reproduce paid questions; turn
it into a sales page — it's a study page with one CTA.
```

### W-2 — Generate website copy for one product page
```
TASK: Write one public product page: {/, /flashcards, /questions,
/nism-series-v-a, /syllabus, /about, /youtube-course, or /book}.
INPUTS: the page's row from ARNREADY_WEBSITE_INFORMATION_ARCHITECTURE.md
§1 (purpose, intent, CTA) + relevant canonical lines from
ARNREADY_WEBSITE_COPY_SCAFFOLD.md + any real facts to feature.
CONSTRAINTS: one idea per page; answer the visitor's intent in the first
3 sentences; ecosystem framing where natural (app for daily practice, web
for laptop mocks, YouTube course free, book for revision); ONE primary
CTA per the IA row + one repeat at page end; footer disclaimer.
OUTPUT FORMAT: markdown + frontmatter as in W-1. 300–800 words.
DO NOT: invent features/screenshots/stats; write /pricing or /mock-test
with this prompt (they have their own prompts W-3/W-4).
```

### W-3 — Mock-test page copy (`/mock-test`)
```
TASK: Write the /mock-test public page.
INPUTS: the locked mock facts (100Q/120min, weighted by chapter, flag/
skip/return, no negative marking [VERIFY], free = one full mock, paid =
unlimited; mocks are non-reviewable by design) + IA row.
CONSTRAINTS: lead with the laptop angle — the real exam is taken on a
desktop; practising on one matters; explain the weighting honestly (table
welcome); explain WHY mocks are non-reviewable (honesty: a mock measures
readiness; drilling answers is what practice mode is for); CTA "Take your
free mock".
OUTPUT FORMAT: markdown + frontmatter. 500–900 words.
DO NOT: promise score improvements; compare to competitor apps by name;
suggest the mock predicts the real result beyond "designed to mirror it".
```

### W-4 — Pricing page copy (`/pricing`)
```
TASK: Write the /pricing page.
INPUTS: the canonical free-vs-paid split (free: practice questions per
chapter, one mock, all flashcards, mistakes deck; paid ₹250 once: full
bank, unlimited mocks, answer review, both platforms) + current price from
the app repo's CONFIG.UNLOCK_PRICE (confirm before writing).
CONSTRAINTS: a two-column free/premium table is the page's spine; the
one-time-never-subscription point stated twice; the chai line once;
"maybe later" energy — zero pressure, no urgency; the web unlock is the
primary CTA and it unlocks the app too ("pay once, anywhere"); purchase
button copy only as [CHECKOUT-SLOT — enabled in Web-3 phase].
OUTPUT FORMAT: markdown + frontmatter. ≤500 words + the table.
DO NOT: discounts, anchoring theatrics ("worth ₹5000!"), countdowns;
mention Google Play billing mechanics; imply web price differs from app;
imply the book is included.
```

### W-5 — FAQ batch
```
TASK: Draft {N} FAQ entries for /faq.
INPUTS: existing FAQ (copy scaffold §6) + new real questions (support
mail, YouTube comments) if any.
CONSTRAINTS: ≤3 sentences per answer, direct first sentence; ecosystem
answers where relevant (web vs app vs course vs book); billing-flow
answers carry [VERIFY-AFTER-BILLING-QA]; policy-sensitive answers (why
can't I pay on web from the app?) get [ANUSHA-DECIDE], never improvised.
OUTPUT FORMAT: markdown Q/A list + a JSON-LD FAQPage snippet.
DO NOT: invent policies (refunds, iOS, offline); duplicate existing
entries — extend them.
```

## C. Content-generation prompts (outputs route to the APP repo's review pipeline)

### C-1 — Quiz questions from one concept
```
TASK: Draft {N} NEW practice questions on the pasted concept, JSON v3.
INPUTS: the concept's facts/rules (pasted, verified source noted) +
chapter/subtopic + difficulty mix wanted + 1–2 existing bank questions as
style reference.
CONSTRAINTS: JSON v3 fields exactly (id placeholder, chapter, subtopic,
question, options[4], correctIndex, explanation, difficulty, type,
isFree:false by default); types from: exam_core, scenario, behavioural,
concept_builder, calculation, trap; plausible distractors (the tempting
wrong answer must be genuinely tempting); explanation teaches the rule,
≤3 sentences; generate from concepts, NEVER from real exam papers, never
"according to the workbook".
OUTPUT FORMAT: JSON array + a one-line rationale per question (what it
tests). Label: DRAFT — enters the normal review pipeline (app repo's
CONTENT_REVIEW_AND_UPLOAD_RUNBOOK.md); Anusha reviews EVERY question
before anything ships.
DO NOT: reuse pasted questions with cosmetic edits; calculation questions
without showing the worked solution in the rationale; invent facts.
```

### C-2 — Flashcards from one concept
```
TASK: Draft {N} flashcards on the pasted concept.
INPUTS: concept facts + chapter/subtopic + existing card style reference.
CONSTRAINTS: cardType from concept | quick_recall | wisdom; front = one
question/cue line; back ≤3 lines; grouped under the given subtopic;
flashcards are always free — write them to be genuinely sufficient, not
teasers.
OUTPUT FORMAT: JSON-like list (front / back / cardType / subtopic).
Label DRAFT — normal review pipeline.
DO NOT: multi-fact cards; workbook citations; trick-question fronts
(cards teach; questions test).
```

## D. Adaptation prompts

### D-1 — YouTube script → website article
```
TASK: Adapt the pasted lecture/explainer outline into the matching
website page section(s).
INPUTS: the video outline/beats + target page + its existing content.
CONSTRAINTS: prose, not beats; keep the teaching order; the video's
worked example becomes the page's worked example (same numbers); add the
lecture embed slot + "watch the full lecture" line; de-duplicate against
the existing page content.
OUTPUT FORMAT: markdown section(s) ready to slot in + a one-line list of
what was deliberately left in the video only.
DO NOT: transcribe verbatim; change facts; add new material.
```

## E. Review & utility prompts

### E-1 — Fake-claims / compliance review
```
TASK: Review the pasted content as the LAST gate before publishing. Be
strict; when unsure, flag.
CHECKLIST: every HARD RULES item from the context block, one by one;
unverified exam facts missing [VERIFY]; outcome promises even soft ("you
WILL clear it"); urgency/fear framing; invented numbers/testimonials/
social proof; paid content exposure; copied exam-paper text; investment-
advice adjacency; emojis/off-register tone; app-steering-to-web-checkout
language (store policy).
OUTPUT FORMAT: verdict PASS/FAIL first; then table: quoted line → rule →
suggested fix. If PASS, list borderline items anyway.
DO NOT: rewrite wholesale; wave through "minor" issues — flag everything,
humans decide.
```

### E-2 — NISM/SEBI/AMFI affiliation-risk review
```
TASK: Review the pasted content ONLY for affiliation/endorsement risk.
CHECK FOR: "official", "certified", "approved", "partner", "authorised";
NISM/SEBI/AMFI logos or implied logo use; "NISM" positioned as part of
the product name; missing independence disclaimer where the format has a
footer/description; phrasing where a regulator could read endorsement
("as NISM recommends…"); workbook text quoted verbatim.
OUTPUT FORMAT: verdict PASS/FAIL; table: line → risk → safer rewording.
Confirm the disclaimer text present matches the canonical one (copy
scaffold §10) exactly.
DO NOT: soften findings; approve missing disclaimers because "it's just
a Short" — Shorts descriptions need the line too.
```

### E-3 — Indian exam-prep tone pass
```
TASK: Revise the pasted copy for tone ONLY — facts, structure, CTAs
frozen.
TARGET: a smart, warm Indian professional explaining to a colleague —
Varsity clarity, a little more warmth. Remove Americanisms and MBA-speak
("leverage", "unlock your potential"), edtech cringe ("ace it", "study
buddy"), melodrama. Short sentences. Keep all [VERIFY]/[SLOT] markers.
OUTPUT FORMAT: revised copy + 3-line note on the biggest shifts.
DO NOT: attempt Hindi/Hinglish (Anusha's alone); add jokes
([ANUSHA-JOKE-SLOT]); alter any fact, number, or CTA.
```

### E-4 — App/web/book CTA copy
```
TASK: Write {N} CTA lines for {placement: website page | YouTube
description | video end-screen | book back page | WhatsApp post footer}.
CONSTRAINTS: every CTA names something concrete and free ("free practice
questions for this chapter", "a full free mock on your laptop", "the free
chapter lectures"); ≤12 words; calm; the ecosystem cross-CTA pattern —
app↔web↔course↔book — but NEVER app→web-checkout (policy).
OUTPUT FORMAT: numbered list, each tagged (specificity / brand / honesty
/ ecosystem) + intended placement.
DO NOT: price in CTAs; "don't miss out"; more than one "!" in the set.
```

### E-5 — Metadata / titles / descriptions
```
TASK: Generate SEO metadata for the pasted page.
OUTPUT FORMAT exactly: 3 titles ≤60 chars keyword-first (site pattern
"{Topic} — ARNReady"); 3 descriptions ≤155 chars; 1 slug; 1 og:title
≤55 chars.
DO NOT: clickbait, ALL-CAPS, pipe-spam, banned claims, year-stuffing.
```

### E-7 — WhatsApp launch/share messages
```
TASK: {N} WhatsApp messages for {moment: launch | course-video | new
feature | plain share}.
CONSTRAINTS: ≤80 words; written to be FORWARDED into study groups — lead
with one genuinely useful exam/free-tier fact, not the product; one link
at the end; at most one message mentions price; plain text, no emojis.
OUTPUT FORMAT: numbered, each tagged with target forwarder (candidate /
study-group admin / banker colleague).
DO NOT: chain-message energy; false scarcity; "Dear friends" openers.
```

---

## Library changelog
- v3 (9 Jul 2026): split from the combined web+YouTube library when the
  projects separated; context block updated for the 9 Jul decisions
  (web = full app parity, pay-anywhere unlock, web checkout primary on
  the site, book outside the entitlement, unsigned full free tier).
  Prompt numbering kept from v2 (E-6 lives in the YouTube library).
- v2 (7 Jul 2026): corrected direction — four-pillar ecosystem context.
- Pending unlocks: delete [VERIFY] instruction from §0 when Anusha
  confirms exam facts (date: ___); unlock billing FAQ answers after
  billing QA (date: ___).

*ARNReady · ASM Tech · arnready.com*
