# ARNReady — Website Copy Scaffold

**Status (10 July 2026 consistency pass):** ALL COPY HERE IS WORKING —
nothing ships to a linked page until Anusha's voice pass (same rule as
appCopy.js). This is a *scaffold*: wire
copy, skeletons, and rules so a lower model can draft final copy without
inventing claims. Slots to fill are marked `[SLOT]`; facts awaiting Anusha's
verification are marked `[VERIFY]`.

---

## 1. Copy rules for future models (read before writing a word)

1. First person, Anusha's voice: honest, warm, lightly funny, Indian,
   never fear-based. Candidates are smart professionals, not children.
2. **Claims blacklist — never write:** "guaranteed pass", "crack the exam in
   X days", "100% success", "toppers use", invented user counts, invented
   testimonials, "official"/"NISM-approved", pass-rate statistics we don't
   have, "limited time offer", countdown-timer urgency, "only X left".
3. No emojis. No exclamation-mark pile-ups (one "!" per page is plenty).
4. Facts about the exam (100 questions, 120 minutes, 50% pass mark, 3-year
   validity, no negative marking, fees, portal URLs) carry `[VERIFY]` until
   Anusha confirms — same open item as the app's Guide screen.
5. Always present somewhere on every page: independence disclaimer (see §10).
6. Price talk: "one-time ₹250" + the chai line. Never "cheap", never
   discount theatrics. (Price value comes from CONFIG.UNLOCK_PRICE — check
   it before writing, it may change.)
7. India-specific tone: plain Indian English; "lakh" not "100k"; UPI is
   assumed normal; exam-season empathy without melodrama; light idiom is
   welcome ("first attempt, no drama"), Hinglish only if Anusha writes it
   herself — models should not attempt it.
8. Every page: ONE idea, ONE primary CTA. If a sentence doesn't move Priya
   (strategy doc §3) toward install or trust, cut it.

## 2. Homepage wire copy (compliance-era placeholder → grows into the
ecosystem homepage; final page structure per the IA doc `/` row — must
present all four pillars: app, web practice, free YouTube course, book)

```
[HERO]
H1: Get ARN Ready.
Sub: The honest prep for the NISM Series V-A Mutual Fund Distributor
     exam — on the web and in the app. Practice like it's the real
     thing — because here, it is.
CTA (primary): [Start free — no sign-in needed]     (straight into practice)
CTA (secondary): [Get it on Google Play]  (pre-launch: "Coming soon to Google Play")
Visual: Arnie (waving pose), phone screenshot of the Today screen.
(One ₹250 web unlock opens web + app — the conversion CTA lives on
/pricing and /app/upgrade, not the hero. §4 owns the hierarchy.)

[HOW IT WORKS — 3 steps]
1. Learn — flashcards and practice for all 12 chapters. Free.
2. Test yourself — exam mode and a full 100-question mock, weighted
   exactly like the real paper.
3. Trust your score — ARNReady never inflates your readiness. When it
   says you're ready, you're ready.

[HONESTY BLOCK — the differentiator, don't bury it]
H2: An app that won't lie to you.
Body skeleton: most prep apps flatter you with easy scores. ARNReady's
scoring is deliberately strict [1–2 sentences on the philosophy, not the
formula]. The goal isn't to make you feel ready. It's to make you ready.

[FREE TIER — plain facts]
H2: Free means actually free.
- 20 real questions per chapter, practice and exam mode
- One full mock test per Google-linked account
- Every flashcard, forever
- No card details, no trial clock — on the web, not even a sign-in to start
Then: the full bank, unlimited mocks, and answer review cost ₹250. Once.
Paid here, unlocked everywhere — website and app together.
That's one nice chai a month for... no wait, it's just one payment. [Anusha
punches up the chai joke in the voice pass.]

[ARNIE — one short block, see §8]

[FOOTER] — see §10.
```

## 3. Section-by-section skeleton for cornerstone pages

Every public content page follows:
```
H1 matching the target query's intent
Opening: 2–3 sentences answering the query DIRECTLY (no throat-clearing)
Body: 3–5 H2 sections, each one sub-question (mine "People also ask")
Fact table where relevant (chapter weightages, exam format)
Honest transition: what a website can't do for you → what practice does
Primary CTA (PlayStoreCTA)
Updated date + source line
FAQ block (3–5 questions) where natural
```

## 4. CTA hierarchy (CORRECTED 10 Jul — web checkout becomes the primary
conversion in Web-3)

**Once Web-3 ships, the conversion CTA everywhere on the site is the WEB
unlock:** pay ₹250 on the website itself, which unlocks the website AND the app together
(higher margin than a Play purchase — this is deliberate business
strategy, never stated in public copy). Before Web-3, "Start free" is the
primary CTA and checkout remains a labelled placeholder.

- **Entry CTA** (new visitors, top of funnel): "Start free — no sign-in
  needed" / "Practise this chapter free". Free access first, always.
- **Conversion CTA** (pricing page, upgrade page, free-cap moments):
  "Unlock everything — ₹250 once. Works here and in the app."
- **Companion CTA** (secondary, never primary): `Get it on Google Play`
  badge — the app is the daily-practice companion, not the checkout.
Text variants for in-page links:
- "Start free — 20 questions per chapter" (specificity variant)
- "Try the mock test free" (mock-test page; sign-in required — per-account rule)
- "Practise this chapter free — right here" (syllabus/article pages)
- "Get ARN Ready — it's free to start" (brand variant)
Never: "Download now!!", "Don't miss out", "Join thousands of...".
**Policy fence (both directions, absolute):** the site may sell freely;
the ANDROID APP never links to or mentions web checkout (Play policy —
architecture §10). Web pages may say "also available in the app"; app
screens never say "buy on the website".

## 5. App feature descriptions (canonical short versions)

Reuse these everywhere (site, Play listing, YouTube descriptions) so the
product story stays consistent:
- **Chapter practice** — All 12 syllabus chapters, easy to hard, with clear
  explanations after every answer.
- **Exam mode** — Timed-feel, no explanations till the end, scored the
  strict way. The dress rehearsal.
- **Mock test** — 100 questions, 120 minutes [VERIFY], weighted chapter by
  chapter like the actual NISM paper. Flag, skip, return — just like the
  real interface.
- **Flashcards** — Quick-recall cards for every chapter. Free forever.
- **Mistakes deck** — Every question you get wrong follows you around
  (kindly) until you beat it twice.
- **Today screen** — One recommended next step every day, and an exam
  countdown that informs rather than panics.
- **Arnie** — The panda who's studying along with you. He celebrates
  rarely, so it means something.

## 6. FAQ questions + short draft answers (WORKING)

1. **Is ARNReady free?** — Genuinely free to start: 20 questions per chapter,
   one full mock, all flashcards. The complete bank and unlimited mocks are
   a one-time ₹250.
2. **Is this official NISM material?** — No. ARNReady is independent and not
   affiliated with NISM, SEBI, or AMFI. Questions are original, written from
   the syllabus concepts — not copied from any paper.
3. **What is the NISM Series V-A exam?** — [2 sentences: mandatory
   certification for mutual fund distributors in India; 100Q/120min/50%
   pass, no negative marking. All [VERIFY].]
4. **Will this alone make me pass?** — It's designed to get you genuinely
   exam-ready, and it will never *tell* you you're ready before you are.
   But nobody honest guarantees a pass, so we won't either.
5. **Why is the scoring so strict?** — [The honesty story, 2 sentences.]
6. **Do I need a subscription?** — No. ₹250 once, yours forever — on the
   website and in the app, same Google account, pay on either.
7. **How do I delete my account?** — In the app: Profile → Delete Account.
   Details: /delete-account.
8. **I paid but premium isn't showing.** — [Use the device-proven app
   restore-purchases flow (proved 10 Jul) + support email fallback. Do not
   describe web-payment recovery until Web-3 E2E testing passes.]
9. **Is there an iOS version?** — [SLOT: Anusha's honest current answer.]
10. **Who built this?** — Anusha Murthy (ASM Tech). See /about.

## 7. About ARNReady draft (skeleton)

```
H1: Why ARNReady exists
Para 1 [SLOT — Anusha's origin story, first person. The model must NOT
        invent this. Placeholder questions to prompt her: what annoyed you
        about existing prep options? why this exam? why "honest scoring"?]
Para 2: What it is — the app, the philosophy in 3 sentences, the price
        and why it's one-time.
Para 3: Who's behind it — ASM Tech, one developer, contact.
Para 4: Independence disclaimer (§10) + sources (NISM workbook edition).
Arnie appears once, with the one-line intro from §8.
```

## 8. Arnie intro copy (canonical)

> This is Arnie. He's a panda, he's preparing for the same exam as you,
> and he refuses to celebrate until you've actually earned it. We find this
> motivating and slightly rude.

(One-liner variant: "Arnie celebrates rarely, so it means something.")
Rules: Arnie never explains features, never begs, never panics about dates.
He is a companion, not a salesman. The black blob was not Arnie.

## 9. NISM V-A positioning copy (canonical lines, reuse verbatim)

- "The honest prep app for the NISM Series V-A exam."
- "Practice weighted exactly like the real 100-question paper." [VERIFY]
- "Knowledge is free. Mastery is earned."
- "It won't tell you you're ready until you are."
- "One-time ₹250. About the price of a good chai and a decent samosa."
  [Anusha's voice pass owns the food math.]
- "Pay once, anywhere — the website and the app unlock together."
  (Truth boundary: the entitlement covers web + app ONLY. The book is a
  separate purchase — never imply the ₹250 includes it, or vice versa.)

## 10. Footer / disclaimer block (every page)

```
ARNReady is built by ASM Tech and is an independent study aid. It is not
affiliated with, endorsed by, or approved by NISM, SEBI, or AMFI.
"NISM" is used only to describe the exam the app helps you prepare for.
Privacy · Delete account · Support · © {year} ASM Tech
```

## 11. Play Store listing alignment notes

- The site and listing must tell the SAME story in the same words — reuse §5
  feature descriptions and §9 positioning lines in the listing copy
  (war-room B-7 owns final listing copy; this scaffold feeds it).
- Short description candidate (≤80 chars):
  `NISM Series V-A exam prep — honest scoring, real mock tests, free to start.`
- Screenshots on the website must be the SAME set as the listing (single
  source in screenshots/, whatever B-7 finalises).
- The listing may not use "NISM" in the app NAME (locked rule) but may
  describe the exam in the description — mirror the footer disclaimer there.

## 12. Compliance pages copy skeletons

**Current-file note (10 Jul):** `privacy.html` is already a substantive draft
and has no `noindex`; it is not final. `delete-account.html` is currently an
email-only flow and does not yet describe the deployed in-app deletion path.
The following are the target specs, not descriptions of current completion.

**/privacy** — sections: what we collect (Google account basics, study
progress, purchase state, and the current launch-notification email form),
processors (including Formspree while that form exists), where product data
lives (Firebase, India-adjacent region
asia-south1), what we DON'T do (sell data, third-party marketing), ads
(AdMob in the Android app; the eventual web-ad vendor/cookie treatment must be
named only after the web format is chosen), payments (Google Play Billing now;
Razorpay only once Web-3 is live; we never see card details), data deletion
(link /delete-account), contact, dated. Draft via a reputable generator, then
human/legal accuracy pass — [VERIFY by Anusha].

**/delete-account** — H1 "Delete your ARNReady account". Primary: in-app
steps (Profile → Delete Account → confirm). Deployed behaviour: the callable
recursively deletes `users/{uid}` and the Firebase Auth user; the app then
wipes local ARNReady keys and signs out Google + Firebase. Purchase-audit
records are retained. Device QA on a real throwaway account is still pending,
so final permanence/restoration wording remains [VERIFY]. Fallback: email
{support} from the account's Gmail, with the process and response-time promise
approved before publication.

**/support** — H1 "Support". Email, honest one-developer note, 48-hour aim,
link to /delete-account and (once live) /faq.

*All WORKING until the voice pass. ARNReady · ASM Tech · arnready.com*
