# ARNReady — Content Repurposing Playbook

**Status:** PLAYBOOK LOCKED-DRAFT (7 July 2026, Fable). The gearbox of the
flywheel: how ONE authored unit of exam knowledge becomes app content, a
website page, videos, posts, book material, and (later) an update message —
without re-researching or re-explaining anything. Written for lower-context
models: follow the templates, respect the invariants.

**Cross-project references** (updated 9 Jul when the tracks separated):
- App content pipeline / bank source lives in `../ARNReady-App/`
  (question bank in `book/`, uploader in `scripts/`, review runbook in
  `docs/CONTENT_REVIEW_AND_UPLOAD_RUNBOOK.md`).
- Video templates and course arch live in
  `../../ARNReady-YouTube/docs/`.
- Book source + export notes live in `../ARNReady-App/book/`; book
  planning in `../../ARNReady-Book/docs/`.
- Prompts split across `ARNREADY_WEBSITE_PROMPT_LIBRARY.md` (this
  folder) and `../../ARNReady-YouTube/docs/ARNREADY_YOUTUBE_PROMPT_LIBRARY.md`.

---

## 1. The source unit

Everything starts from a **Concept Unit** — one self-contained piece of
exam knowledge, at one of three grains:

| Grain | Example | Typical source |
|---|---|---|
| **Fact** | "SEBI rebalancing window = 30 BUSINESS days" | a flashcard / a locked fact |
| **Concept** | "How NAV is calculated and where exams trick you" | a subtopic's seed questions + flashcards |
| **Chapter** | "Chapter 9: everything weighted 15/100" | a whole chapter's bank slice |

The canonical store is the question bank
(`book/ARNReady_NISM_VA_Question_Bank_Source.md` + Firestore) and the
flashcard set. **Never author a derivative from memory — always pull the
unit from the bank so every channel says the same, reviewed thing.**

### Concept Unit capture template (fill once, reuse everywhere)

```markdown
UNIT: {slug}
Grain: fact | concept | chapter
Chapter/subtopic: {n} / {subtopic}
Core statement (≤2 sentences, the truth being taught):
Why candidates get it wrong (the trap):
Best example question(s) from the bank: {ids — isFree ones only for public use}
One-line hook (the "wait, really?" angle):
Source: NISM workbook Nov 2025, {section} — verified: yes/no [VERIFY]
Status: WORKING | VOICE-PASSED
```

## 2. The fan-out map

One captured unit becomes, in effort order (cheapest first):

```
Concept Unit
 ├─ 1. App flashcard(s)        (often already exists — the unit may COME from one)
 ├─ 2. WhatsApp/LinkedIn post   (~5 min)
 ├─ 3. YouTube Short            (~20 min)
 ├─ 4. Website article section  (units aggregate into cornerstone pages)
 ├─ 5. YouTube long video       (~2 h, batch)
 ├─ 6. Book section callout     (feeds the KDP source at its next revision)
 └─ 7. Update/launch message    (only when there's news to attach it to)
```

Rules of the fan-out:
- **Public derivatives use `isFree` material only.** Paid seeds/variations
  never appear verbatim on the web/YouTube — they're the product.
- One unit → many channels, but NOT all channels for every unit. A fact
  makes a great Short and a poor long video; a chapter makes a page and a
  long video but a terrible WhatsApp post. Match grain to channel.
- Derivative copy inherits the unit's `[VERIFY]`/voice-pass status — an
  unverified fact cannot ship anywhere public.

## 3. Channel templates

### 3.1 App flashcard (grain: fact/concept)
Already governed by the app's content rules (cardType concept |
quick_recall | wisdom, grouped by subtopic, always free). If the unit
originated elsewhere (e.g. a video comment revealed confusion), route it
through the normal content review runbook — the playbook never bypasses
Anusha's review.

### 3.2 WhatsApp / LinkedIn post (grain: fact)
```
{Hook question, one line — the trap as a dare}
{2–4 lines: the truth, the trap, the takeaway}
{One practical exam tip}
Preparing for NISM V-A? The ARNReady app is free to start: {link}
```
WhatsApp variant: shorter, no hashtags, written to be FORWARDED (the reader
shares it to a study group — that's the distribution). LinkedIn variant may
add one line of professional framing for the banker/IFA audience.
Example (from the locked fact):
> Quick check: SEBI's portfolio rebalancing window — 30 days or 30 business
> days? It's 30 BUSINESS days, and the exam loves this distinction. If a
> question offers both, you now know which one wins.

### 3.3 YouTube Short (grain: fact)
Beat sheet: hook question on screen (3 s) → 15 s timer with the options →
reveal → one-line why → last-frame overlay CTA ("free in the ARNReady
app"). Reuse the §3.2 post as the script — they're the same 60 words.

### 3.4 Website article section (grain: concept → sections; chapter → page)
Units slot into the cornerstone-page skeleton (copy scaffold §3) as H2
sections: H2 = the unit's hook, body = core statement + trap + one worked
`isFree` example, then the standard honest transition + CTA. Frontmatter
per the architecture doc §5; `targetQuery` comes from the unit's hook
phrased as a search.

### 3.5 YouTube long video (grain: concept/chapter)
Beat sheet template (never a word-for-word script):
```
COLD OPEN: the trap, posed as a question to the viewer (≤20 s)
BEAT 1: the concept, plainly (slides: 1–2 lines each)
BEAT 2: where the exam hides the trick — walk ONE isFree question aloud
BEAT 3: the takeaway rule, said twice
CTA: "this chapter's free in the app" + endcard
```
Title/desc/thumbnail via the prompt library; description template in
`ARNREADY_YOUTUBE_COURSE_ARCHITECTURE.md` §11; long-form structures in
`ARNREADY_YOUTUBE_VIDEO_TEMPLATES.md` (lecture segments are also fan-out
targets — a Concept Unit typically becomes one lecture section plus the
derivatives below).

### 3.6 Book section (grain: any)
The KDP source is seeds-only Q&A. A unit contributes: a boxed callout
("The trap: ..."), a chapter-intro paragraph, or an improved explanation.
Route through `book/BOOK_EXPORT_NOTES.md` conventions; book revisions batch
— collect unit contributions in a `book/UNIT_INBOX.md` list rather than
editing the source per-unit.

### 3.7 Update / email / WhatsApp broadcast (grain: news + one unit)
Only when there is real news (launch, new chapter reviewed, price event,
correction). Template: {the news, one line} + {one useful unit, §3.2 form}
+ {one CTA}. Never news-less "engagement" broadcasts. (Email infra is
post-launch — this template waits for it.)

## 4. Worked example — one unit, full fan-out

UNIT: `rebalancing-30-business-days` (fact, Ch. per bank, VERIFIED — it's a
locked fact). Core: SEBI's rebalancing window is 30 BUSINESS days, not 30
calendar days. Trap: every option set includes "30 days".
- Flashcard: exists (quick_recall).
- Post: §3.2 example above, as-is.
- Short: the §3.2 text as beats (template T-5 in the video templates doc).
- Article: an H2 inside `/syllabus` or the Ch. page: "The 30-day trap that
  isn't 30 days".
- Long video: idea #23 — this unit + 2 sibling regulatory-window facts
  bundled into one 6-minute "windows and deadlines" video.
- Book: boxed callout in the relevant chapter at next revision.
This is the standard: capture once, publish six times, identical facts.

## 5. Cadence that respects a solo founder

Post-launch steady state, ~2 hours/week total:
- Capture 1–2 units/week (mostly free — they fall out of content review
  and user questions).
- 1 WhatsApp/LinkedIn post + 1 Short per week (same unit, same words).
- 1 long video per week from the batch recorded monthly.
- Cornerstone pages absorb units monthly, one page per session.
If the week is bad: post the §3.2 text alone. The system degrades
gracefully to "one forwarded WhatsApp message" and that's fine.

## 6. Invariants (the never-list)

1. Paid bank content never publishes publicly.
2. Nothing unverified/`[VERIFY]` ships to any public channel.
3. Every derivative carries the same fact as the bank — if a correction
   lands, it propagates to ALL derivatives of that unit (keep a plain list
   of shipped derivatives per unit under the unit's slug — a
   `docs/content-units/` folder of these capture files IS the tracking
   system; create it when the first real unit is captured).
4. Voice: Anusha's, per the copy scaffold rules; models draft, she passes.
5. No channel exists for its own sake — every derivative CTA points at the
   app's free tier.

*ARNReady · ASM Tech · arnready.com*
