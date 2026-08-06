/**
 * Central copy module (manual §0.8): every user-facing string lives here,
 * marked WORKING until Anusha's voice pass. Pages import and render this
 * data; they do not hardcode prose. Page-level JSX composition (which words
 * become a <Link>, table markup, etc.) still lives in the page component —
 * only the copy module.
 */
export const WORKING = true;

export const brand = {
  name: 'ARNReady',
  legalName: 'ASM Tech',
  tagline: 'Get ARN Ready.',
  motto: 'Knowledge is free. Mastery is earned.',
};

export const contact = {
  supportEmail: 'asmtechdeveloper@gmail.com',
};

/** A link that can be spliced into the middle of a copy string (see linkify). */
export type LinkRule = { label: string; href: string };
/** Plain text plus optional link phrases to splice in — the copy stays one string. */
export type TextWithLinks = { text: string; links?: LinkRule[] };

export const footerDisclaimer = {
  body: 'ARNReady is built by ASM Tech and is an independent study aid. It is not affiliated with, endorsed by, or approved by NISM, SEBI, or AMFI. "NISM" is used only to describe the exam ARNReady helps you prepare for.',
  links: [
    { href: '/privacy', label: 'Privacy' },
    { href: '/delete-account', label: 'Delete account' },
    { href: '/support', label: 'Support' },
  ],
  copyrightYear: 2026,
};

export const nav = {
  primaryCta: { href: '/pricing', label: 'Get ARNReady' },
  signIn: { label: 'Sign in' },
  menuLabel: 'Menu',
  closeMenuLabel: 'Close menu',
  ariaLabel: 'Primary',
  ariaLabelMobile: 'Primary (mobile)',
  links: [
    { href: '/syllabus', label: 'Syllabus' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/faq', label: 'FAQ' },
  ],
};

/** Arnie image alt text, keyed by mood (design system: one Arnie per surface). */
export const arnieAlts = {
  waving: 'Arnie the panda waving hello',
  thinking: 'Arnie the panda thinking',
  working: 'Arnie the panda studying at a desk',
  celebrating: 'Arnie the panda celebrating',
  proud: 'Arnie the panda looking proud',
  meditating: 'Arnie the panda meditating, calm',
  reading: 'Arnie the panda reading',
  dozing: 'Arnie the panda dozing off',
  warns: 'Arnie the panda giving a gentle warning',
  breathe: 'Arnie the panda taking a calming breath',
  'checks-in': 'Arnie the panda checking in',
  'makes-it-stick': 'Arnie the panda making a concept stick',
  'works-it-out': 'Arnie the panda working out a problem',
  'setting-the-scene': 'Arnie the panda setting the scene',
} as const;

// ── Homepage ────────────────────────────────────────────────────────────
export const home = {
  meta: {
    title: 'ARNReady — Get ARN Ready',
    description:
      'The honest prep for the NISM Series V-A Mutual Fund Distributor exam — on the web and in the app.',
  },
  hero: {
    h1: 'Get ARN Ready.',
    sub: 'The honest prep for the NISM Series V-A Mutual Fund Distributor exam — on the web and in the app. Practice like it’s the real thing — because here, it is.',
    ctaPrimary: { href: '/pricing', label: 'Get ARNReady — it’s free to start' },
    ctaSecondary: { href: '/syllabus', label: 'See the syllabus' },
  },
  steps: [
    { title: '1. Learn', body: 'Flashcards and chapter teaching for all 12 syllabus chapters. Free.' },
    { title: '2. Test yourself', body: 'Exam mode and a full mock test, weighted like the real paper.' },
    {
      title: '3. Trust your score',
      body: 'ARNReady never inflates your readiness. When it says you’re ready, you’re ready.',
    },
  ],
  honesty: {
    h2: 'An app that won’t lie to you.',
    body: 'Most prep apps flatter you with easy scores. ARNReady’s scoring is deliberately strict, because the goal isn’t to make you feel ready — it’s to make you ready.',
  },
};

// ── /about ──────────────────────────────────────────────────────────────
export const about = {
  meta: {
    title: 'About ARNReady',
    description: 'Why ARNReady exists, who built it, and the honesty philosophy behind the scoring.',
  },
  h1: 'Why ARNReady exists',
  originSlot:
    '[SLOT — Anusha’s origin story, first person: what annoyed you about existing prep options, why this exam, why "honest scoring".]',
  body2:
    'ARNReady is an app, and now a website, built to get you genuinely ready for the NISM Series V-A Mutual Fund Distributor exam — practice, exam mode, and full mock tests, scored the strict way, so the number on screen means what it says. Premium removes the caps, not the honesty. It’s a one-time ₹250, because a subscription for a study aid felt wrong.',
  body3:
    'ARNReady is built and run by Anusha Murthy, trading as ASM Tech — one developer, one product, real answers when you write in.',
  arnieIntro:
    'This is Arnie. He’s a panda, he’s preparing for the same exam as you, and he refuses to celebrate until you’ve actually earned it. We find this motivating and slightly rude.',
  cta: { href: '/pricing', label: 'See free vs. premium' },
};

// ── /faq ────────────────────────────────────────────────────────────────
export const faq = {
  meta: {
    title: 'FAQ',
    description: 'Answers to common questions about ARNReady, the free tier, and the NISM Series V-A exam.',
  },
  h1: 'Frequently asked questions',
  items: [
    {
      q: 'Is ARNReady free?',
      a: 'Genuinely free to start: read every chapter and try 10 sampler flashcards without signing in. Sign in with Google (still free) and you get 20 real practice questions per chapter, every flashcard, one full mock test ever, and your mistakes deck. The complete question bank and unlimited mocks are a one-time ₹250.',
    },
    {
      q: 'Is this official NISM material?',
      a: 'No. ARNReady is independent and not affiliated with, endorsed by, or approved by NISM, SEBI, or AMFI. Questions are original, written from the syllabus concepts — never copied from any paper.',
    },
    {
      q: 'What is the NISM Series V-A exam?',
      a: 'The mandatory certification exam for mutual fund distributors in India: 100 questions, 120 minutes, 50% pass mark, no negative marking. [VERIFY]',
    },
    {
      q: 'Will this alone make me pass?',
      a: 'It’s designed to get you genuinely exam-ready, and it will never tell you that you’re ready before you are. But nobody honest guarantees a pass, so we won’t either.',
    },
    {
      q: 'Why is the scoring so strict?',
      a: 'Most prep apps flatter you with easy scores. ARNReady’s free scoring divides by at least 10 questions even if you attempt fewer, so a lucky streak can’t inflate your number — the goal is to make you ready, not to make you feel ready.',
    },
    {
      q: 'Do I need a subscription?',
      a: 'No. ₹250 once, yours forever — on the app today, and on the website once web checkout ships (coming soon).',
    },
    {
      q: 'How do I delete my account?',
      a: 'In the app: Profile → Delete Account. Full details on the delete-account page.',
      links: [{ label: 'the delete-account page', href: '/delete-account' }],
    },
    {
      q: 'I paid but premium isn’t showing.',
      a: 'On the app, use Restore Purchases from the account screen. If it still isn’t showing, email support with the Gmail you sign in with and we’ll sort it out within 48 hours.',
    },
    {
      q: 'Is there an iOS version?',
      a: 'Not yet — ARNReady is Android and web today. [ANUSHA-DECIDE: iOS timeline]',
    },
    {
      q: 'Who built this?',
      a: 'Anusha Murthy (ASM Tech). See the About ARNReady page.',
      links: [{ label: 'About ARNReady', href: '/about' }],
    },
  ],
  cta: { href: '/pricing', label: 'See free vs. premium' },
};

// ── /pricing ────────────────────────────────────────────────────────────
export const pricing = {
  meta: {
    title: 'Pricing',
    description: 'ARNReady is free to start. Everything, unlocked once, for ₹250.',
  },
  h1: 'Free to start. ₹250 once, for everything.',
  sub: 'No subscription, no discount theatrics, no countdown clock. One payment unlocks the full question bank, unlimited mocks, and answer review — on the app today, and on the website once web checkout ships.',
  free: {
    title: 'Free',
    note: 'No card, no trial clock.',
    items: [
      '20 real practice questions per chapter',
      'Chapter exam mode, same free question set',
      'One full mock test, ever',
      'Every flashcard, forever',
      'Mistakes deck and progress tracking',
    ],
  },
  premium: {
    title: 'Premium — ₹250 once',
    note: 'One-time. About the price of a good chai and a decent samosa.',
    items: [
      'The complete question bank, every chapter',
      'Unlimited mock tests',
      'Full answer review on every question',
      'Zero nudges, anywhere',
      'Pay once, anywhere — the website and the app unlock together',
    ],
    checkoutLabel: 'Web checkout — coming soon',
    checkoutTitle: 'Web checkout is coming soon',
    checkoutNote: 'Premium is live on the app today.',
  },
  bottom: {
    note: 'Pay once, anywhere — the website and the app unlock together, forever. No subscription, ever.',
    cta: { href: '/syllabus', label: 'Start free — no sign-in needed' },
  },
};

// ── /privacy ────────────────────────────────────────────────────────────
// Each section is an ordered list of blocks — 'p' (paragraph, optionally
// with spliced-in links), 'ul' (list of TextWithLinks items), or 'email'
// (renders the contact email as a link). No page component ever compares
// against a section's visible h2 text to decide what to render — that
// broke when a heading was reworded, hence the explicit 'email' block type.
type PrivacyBlock =
  | { type: 'p'; text: string; links?: LinkRule[] }
  | { type: 'ul'; items: TextWithLinks[] }
  | { type: 'email' };

export const privacy: { meta: { title: string; description: string }; h1: string; meta_updated: string; cta: { href: string; label: string }; sections: { h2: string; blocks: PrivacyBlock[] }[] } = {
  meta: { title: 'Privacy Policy', description: 'How ARNReady collects, stores, and protects your data.' },
  h1: 'Privacy Policy',
  meta_updated: 'Last updated: July 2026',
  cta: { href: '/support', label: 'Contact support' },
  sections: [
    {
      h2: 'Who we are',
      blocks: [
        {
          type: 'p',
          text: 'ARNReady is built and operated by Anusha Murthy, trading as ASM Tech, Bengaluru, India. If you have questions about this policy, email us at the address below.',
        },
        { type: 'email' },
      ],
    },
    {
      h2: 'What we collect',
      blocks: [
        { type: 'p', text: 'If you sign in with Google, on the app or on the website:' },
        {
          type: 'ul',
          items: [
            { text: 'Your name and email address from your Google account' },
            { text: 'Your display name, if you choose to set one' },
            { text: 'Your exam date, if you choose to enter it' },
          ],
        },
        { type: 'p', text: 'Automatically, once signed in:' },
        {
          type: 'ul',
          items: [
            { text: 'Your progress through chapters, flashcards, and mock tests' },
            { text: 'Questions you answered correctly and incorrectly' },
            { text: 'Crash and performance data via Firebase' },
            {
              text: 'Ad performance data via Google AdMob — Android app free users only. The website is ad-free; no ad data is collected here.',
            },
          ],
        },
        { type: 'p', text: 'We never collect your payment card details, your location, or your contacts.' },
      ],
    },
    {
      h2: 'Where your data lives',
      blocks: [
        {
          type: 'p',
          text: 'Your account and study data are stored in Google Firebase (Cloud Firestore), in the asia-south1 (Mumbai) region.',
        },
      ],
    },
    {
      h2: 'How we use it',
      blocks: [
        {
          type: 'ul',
          items: [
            { text: 'To save your progress across sessions, devices, and platforms' },
            { text: 'To show your score honestly and point out weak areas' },
            { text: 'To serve relevant ads to free users of the Android app' },
            { text: 'To fix bugs and improve the product' },
          ],
        },
      ],
    },
    {
      h2: 'Third parties',
      blocks: [
        {
          type: 'ul',
          items: [
            { text: 'Google Firebase — authentication and data storage' },
            { text: 'Google AdMob — advertising for free users of the Android app only' },
            {
              text: 'Google Play — payment processing for the app’s premium unlock; we never see your card details',
            },
            {
              text: 'Razorpay — planned for website checkout; not live yet. We will name it here again, with full detail, before it goes live, and we will never see your card details.',
            },
          ],
        },
        {
          type: 'p',
          text: 'None of these parties receive your data for their own marketing purposes beyond their standard platform terms.',
        },
      ],
    },
    {
      h2: 'Your data, your rights',
      blocks: [
        {
          type: 'ul',
          items: [
            {
              text: 'You can delete your account and all associated data — in the app (Profile → Delete Account) or by email. See the delete-account page for details.',
              links: [{ label: 'the delete-account page', href: '/delete-account' }],
            },
            {
              text: 'You can request a copy of your data at any time by emailing us',
              links: [{ label: 'emailing us', href: `mailto:${contact.supportEmail}` }],
            },
            { text: 'Paid users are ad-free everywhere — AdMob does not run on paid accounts' },
          ],
        },
      ],
    },
    {
      h2: 'Children',
      blocks: [
        {
          type: 'p',
          text: 'ARNReady is intended for adults preparing for a professional certification. We do not knowingly collect data from anyone under 18.',
        },
      ],
    },
    {
      h2: 'Changes to this policy',
      blocks: [
        {
          type: 'p',
          text: 'If we make material changes, we will notify you within the app or on this website. Continued use after notification means you accept the updated policy.',
        },
      ],
    },
  ],
};

// ── /delete-account ─────────────────────────────────────────────────────
export const deleteAccount = {
  meta: { title: 'Delete your account', description: 'How to permanently delete your ARNReady account and data.' },
  h1: 'Delete your ARNReady account',
  meta_updated: 'Last updated: July 2026',
  cta: { href: '/support', label: 'Contact support' },
  inApp: {
    h2: 'In the app (fastest)',
    body: 'Open ARNReady and go to Profile → Delete Account, then confirm. This immediately and permanently deletes your sign-in record and all your study data — chapter progress, scores, mock test history, and your mistakes deck.',
  },
  byEmail: {
    h2: 'By email',
    intro: 'If you can no longer access the app, email us from the Google account you used to sign in, with the subject "Delete my ARNReady account":',
    outro: 'We aim to complete deletion within 48 hours and will confirm by reply.',
  },
  table: {
    h2: 'What is deleted, and what isn’t',
    caption: 'Data retention on account deletion',
    columns: ['Data', 'Deleted?'],
    rows: [
      ['Your sign-in record (name, email)', 'Yes, permanently'],
      ['Chapter progress, scores, mock test history', 'Yes, permanently'],
      ['Mistakes deck and study data', 'Yes, permanently'],
      ['Premium unlock on the account', 'Yes — see the note below'],
      ['Payment audit records', 'Retained where required for tax and accounting compliance'],
      ['Google Play purchase records', 'Held by Google under its own policies'],
    ],
  },
  finalNote: {
    lead: 'Deleting your account is final.',
    rest: 'Your progress cannot be recovered, and premium access cannot be restored to a deleted account — even if you sign in again with the same Google account. Deleting your account does not entitle you to a refund.',
  },
  questions: {
    h2: 'Questions?',
    body: {
      text: 'Anything about your data or this process: email us, or see Support.',
      links: [
        { label: 'email us', href: `mailto:${contact.supportEmail}` },
        { label: 'Support', href: '/support' },
      ],
    } as TextWithLinks,
  },
};

// ── /support ────────────────────────────────────────────────────────────
export const support = {
  meta: { title: 'Support', description: 'Get help with ARNReady. One developer, honest answers, within 48 hours.' },
  h1: 'Support',
  cta: { href: '/faq', label: 'Read the FAQ' },
  email: {
    h2: 'Email',
    body: 'ARNReady is built and supported by one developer, so you’ll get a real answer from a real person — usually within 48 hours.',
    note: 'Include your app or website version and, for account issues, the Gmail you sign in with.',
  },
  common: {
    h2: 'Common requests',
    lines: [
      {
        text: 'Deleting your account and data: Delete account.',
        links: [{ label: 'Delete account', href: '/delete-account' }],
      },
      { text: 'How your data is handled: Privacy policy.', links: [{ label: 'Privacy policy', href: '/privacy' }] },
      { text: 'Questions about the exam or the free tier: FAQ.', links: [{ label: 'FAQ', href: '/faq' }] },
    ] as TextWithLinks[],
  },
};

// ── /chapters ───────────────────────────────────────────────────────────
export const chapters = {
  index: {
    meta: {
      title: 'Chapters',
      description: 'All 12 NISM Series V-A chapters — free teaching and sampler flashcards, no sign-in needed.',
    },
    h1: 'All 12 NISM Series V-A chapters',
    intro: 'Every chapter’s teaching is free to read, with 10 sampler flashcards to try — no sign-in needed. Sign in for the complete flashcard deck, practice questions, and your progress.',
    emptyNote: 'Chapters appear here as their teaching copy is approved. Check back soon.',
    cta: { href: '/pricing', label: 'See free vs. premium' },
  },
  hub: {
    chapterLabel: 'Chapter',
    subtopicsHeading: 'What’s inside this chapter',
    samplerHeading: 'Try 10 flashcards from this chapter',
    signIn: {
      label: 'Sign in with Google — free',
      title: 'Sign in with Google to unlock the rest of this chapter.',
      body: 'Sign in to unlock every flashcard, 20 practice questions, and your progress for this chapter. Free, and it takes a moment.',
    },
    pricingLink: { href: '/pricing', label: 'See what sign-in unlocks' },
    /** Metadata description — the only Firestore-derived values allowed in the interpolation are the chapter number and its title. */
    metaDescription: (chapter: number, title: string) =>
      `Free teaching and sampler flashcards for NISM Series V-A chapter ${chapter}: ${title}.`,
  },
  spoke: {
    titleSuffix: 'NISM Series V-A',
    backToChapter: 'Back to chapter',
    prevLabel: 'Previous',
    nextLabel: 'Next',
    /** Count-aware sampler heading (M1-S1/S4): a spoke shows only THIS topic's
     * share of the chapter's 10 sampler cards, which is 1–8, not 10. */
    samplerHeading: (count: number) => `Try ${count} sampler flashcard${count === 1 ? '' : 's'} from this topic`,
    /** Truthful zero-share message (M1-S4): a zero share is intentional — the
     * chapter's 10 sampler cards come from other topics — not a pending upload. */
    noCards: 'The chapter’s 10 sampler flashcards come from other topics — this one’s cards are in the full deck.',
    navAriaLabel: 'Subtopic navigation',
    /** Metadata description — the only Firestore-derived values allowed in the interpolation are the subtopic name and chapter number. */
    metaDescription: (subtopic: string, chapter: number) =>
      `${subtopic}: free NISM Series V-A teaching and sampler flashcards, chapter ${chapter}.`,
  },
  breadcrumbs: {
    chaptersLabel: 'Chapters',
    ariaLabel: 'Breadcrumb',
  },
};

// ── /syllabus ───────────────────────────────────────────────────────────
export const syllabus = {
  meta: {
    title: 'NISM Series V-A syllabus',
    description: 'The 12 chapters of the NISM Series V-A Mutual Fund Distributor exam syllabus.',
  },
  h1: 'NISM Series V-A syllabus',
  intro:
    'Twelve chapters make up the NISM Series V-A Mutual Fund Distributor exam. Exact chapter-wise weightage varies by exam edition — treat the order below as a study path, not a guaranteed mark split. [VERIFY]',
  chapters: [
    'Indian Securities Market — an overview',
    'Concept and Role of a Mutual Fund',
    'Legal Structure of Mutual Funds in India',
    'Legal and Regulatory Framework',
    'Scheme-Related Information',
    'Fund Distribution and Channel Management',
    'NAV, Total Expense Ratio, and Pricing',
    'Taxation',
    'Investor Services',
    'Risk, Return, and Performance of Funds',
    'Mutual Fund Scheme Performance',
    'Mutual Fund Scheme Selection',
  ],
  cta: { href: '/pricing', label: 'See free vs. premium' },
};

// ── /nism-series-v-a ────────────────────────────────────────────────────
export const nismSeriesVA = {
  meta: {
    title: 'NISM Series V-A exam guide',
    description: 'What the NISM Series V-A Mutual Fund Distributor exam is, how it works, and how to prepare.',
  },
  h1: 'The NISM Series V-A exam, explained',
  intro:
    'NISM Series V-A is the certification exam mutual fund distributors in India are required to pass. It tests the syllabus set by the National Institute of Securities Markets — everything from how mutual funds are structured to how to talk an investor through risk. ARNReady is an independent study aid for this exam; it is not affiliated with, endorsed by, or approved by NISM, SEBI, or AMFI.',
  format: {
    h2: 'Exam format',
    caption: 'NISM Series V-A exam format',
    columns: ['Property', 'Value'],
    rows: [
      ['Questions', '100, multiple choice [VERIFY]'],
      ['Duration', '120 minutes [VERIFY]'],
      ['Pass mark', '50% [VERIFY]'],
      ['Negative marking', 'None [VERIFY]'],
      ['Certificate validity', '3 years [VERIFY]'],
    ],
  },
  help: {
    h2: 'How ARNReady helps',
    body: 'Twelve chapters of practice, flashcards for quick recall, an exam mode that mirrors the real thing, and a full mock test weighted like the actual paper — scored the strict way, so it never tells you you’re ready before you are.',
  },
  cta: { href: '/syllabus', label: 'See the full syllabus' },
};

// ── Premium nudges + upgrade wall (manual §1 nudge law) ──────────────────
// WORKING until Anusha's voice pass. Every string pitches what premium ADDS,
// never relief from the nudge itself (the web is ad-free — there is nothing to
// remove). Dual CTA until M7 ships web checkout.
export const nudge = {
  // Interim: "Get the app" points at /pricing until the Play listing URL lands.
  getApp: { href: '/pricing', label: 'Get the app' }, // [ANUSHA: Play Store listing URL]
  webSoon: { label: 'Web checkout — coming soon' },   // informational, non-functional

  practice: {
    mood: 'checks-in' as const,
    title: 'You’re flying through these.',
    body: 'The free set runs to 20 questions per chapter. Premium opens every question beyond them — plus unlimited mock tests and the full mistakes engine, on the app today and the web soon.',
    continue: 'Keep practising',
  },

  exam: {
    mood: 'setting-the-scene' as const,
    title: 'One honest run, coming up.',
    body: 'This exam uses your 20 free questions for the chapter and won’t interrupt you once it starts. Premium adds the complete question bank, unlimited mocks, and full answer review — on the app today, the web soon.',
    continue: 'Start the exam',
  },

  // Three variants, shown at distinct reveals 15 / 30 / 45 (rotation = gatesShownThisRun).
  // Distinct copy each time honors "the same nudge never fires twice per run".
  flashcard: {
    mood: 'makes-it-stick' as const,
    continue: 'Keep flipping',
    variants: [
      {
        title: 'Fifteen cards deep.',
        body: 'The full deck is yours, free forever. Premium is for the exam side — every practice question past 20, unlimited mocks, and full answer review. On the app now, the web soon.',
      },
      {
        title: 'Thirty, and still going.',
        body: 'Flashcards stay free. When you’re ready to test yourself hard, premium opens the complete question bank and unlimited mock tests — app today, web soon.',
      },
      {
        title: 'Forty-five. That’s real work.',
        body: 'Every card is free. Premium adds the full mistakes engine and unlimited mocks, so the testing keeps up with your recall — app today, web soon.',
      },
    ],
  },
};

// ── Q21+ upgrade wall (hard boundary, not a nudge) ───────────────────────
export const upgradeWall = {
  mood: 'proud' as const,
  title: 'That’s all 20 free questions for this chapter.',
  body: 'You’ve used the full free practice set. Premium opens every remaining question in this chapter — and every chapter — plus unlimited mock tests and full answer review. On the app today; web checkout is coming soon.',
  primaryCta: { href: '/pricing', label: 'See premium' },
  backToChapter: 'Back to the chapter', // href built by the caller from returnTo
};

// ── Auth (M3) ────────────────────────────────────────────────────────────
// Sign-in is never a nudge: it opens the free tier, so it pitches what
// signing in ADDS and never implies pressure or scarcity. Cancelling is
// silent by design — a learner who closes the Google popup is told nothing,
// because nothing went wrong (manual §1: "always cancellable").
export const auth = {
  signIn: 'Sign in',
  signInWithGoogle: 'Sign in with Google',
  signingIn: 'Opening Google…',
  signOut: 'Sign out',
  /** Header/account label. Falls back to the email, then to a neutral noun. */
  signedInAs: (name: string | null, email: string | null) =>
    `Signed in as ${name?.trim() || email?.trim() || 'your account'}`,
  /** Shown only for a genuine failure — never for a cancelled popup. */
  error: 'Sign-in didn’t go through. Have another go in a moment.',
  /** Build has no usable Firebase config: honest, not alarming. */
  unavailable: 'Sign-in isn’t available right now. Everything free to read stays open.',
} as const;

// ── /app shell (M3) ──────────────────────────────────────────────────────
// M3 delivers the auth-side shell ONLY. The study surfaces (practice, exam,
// flashcards) land in M5; mock, mistakes and progress in M6. This copy says
// so plainly rather than implying features that aren't there — and it makes
// no premium pitch, because the shell is not a nudge surface.
export const appShell = {
  meta: {
    title: 'Your study room — ARNReady',
    description: 'Sign in to ARNReady to study for the NISM Series V-A exam.',
  },
  signedOut: {
    mood: 'waving' as const,
    title: 'Your study room',
    body: 'Sign in with Google to open every flashcard, 20 practice questions per chapter, and your progress. It’s free, and your work follows you between the app and the web.',
    /** Public reading stays open — the honest alternative to signing in. */
    browseInstead: { href: '/chapters', label: 'Or keep reading the chapters' },
  },
  signedIn: {
    mood: 'working' as const,
    title: 'You’re in.',
    body: 'Pick a chapter below to start practising, sit a chapter exam, or work through flashcards. Your mock test, mistakes deck, and progress live here too.',
    /** The three M6 surfaces, linked from the shell (the old comingSoon
     * roadmap retired when they shipped). */
    modesLabel: 'Mock, mistakes, and progress',
    modes: {
      mock: { href: '/app/mock', label: 'Mock test' },
      mistakes: { href: '/app/mistakes', label: 'Mistakes deck' },
      progress: { href: '/app/progress', label: 'Progress' },
    },
    browse: { href: '/chapters', label: 'Read the chapters' },
  },
  loading: 'Checking your account…',
  unavailable: {
    title: 'Sign-in isn’t available right now',
    body: 'Something’s off with our end of the sign-in setup. Everything free to read stays open while we sort it out.',
    browse: { href: '/chapters', label: 'Read the chapters' },
  },
} as const;

// ── Chapter × mode launcher (M5 D2) ──────────────────────────────────────
// Shared by the `/app` signed-in launcher and by `StudySurface`'s
// invalid-chapter picker (`ChapterModeLauncher`, one grid, two entry points).
export const studyLauncher = {
  heading: 'Choose a chapter to begin',
  modes: {
    practice: 'Practice',
    exam: 'Exam',
    flashcards: 'Flashcards',
  },
} as const;

// ── /app/practice, /app/exam, /app/flashcards — shared surface chrome ────
// (M5 S3, D1/D3/D11). Auth/param/loading/error states common to all three
// signed-in study routes, ahead of the players themselves (S4–S6). WORKING
// until Anusha's voice pass, same voice as the rest of the /app shell.
export const studySurface = {
  practice: {
    meta: {
      title: 'Practice — ARNReady',
      description: 'Sign in to practise NISM Series V-A questions, chapter by chapter.',
    },
  },
  exam: {
    meta: {
      title: 'Chapter exam — ARNReady',
      description: 'Sign in to sit a chapter exam for the NISM Series V-A syllabus.',
    },
  },
  flashcards: {
    meta: {
      title: 'Flashcards — ARNReady',
      description: 'Sign in to work through every flashcard for a NISM Series V-A chapter.',
    },
  },
  /** Invalid/missing `?chapter=` — the picker, never a guess at chapter 1. */
  pickChapter: {
    title: 'Pick a chapter to begin',
    body: 'This link is missing a valid chapter, so here’s the full list instead.',
  },
  loading: {
    practice: 'Loading your practice questions…',
    exam: 'Loading your exam…',
    flashcards: 'Loading your flashcards…',
  },
  /** A failed read is an error, never an empty surface (M5 plan D3). */
  error: {
    title: 'That didn’t load',
    body: 'Something went wrong fetching this chapter. Have another go.',
    retry: 'Try again',
  },
  /** Temporary — replaced by the real players in S4–S6. */
  comingSoon: {
    practice: 'The practice player lands next.',
    exam: 'The exam player lands next.',
    flashcards: 'The flashcard player lands next.',
  },
} as const;

// ── Practice player (M5 S4, D7/D11) ──────────────────────────────────────
// The Q1–Q20 (free) / full-bank (paid) question-by-question player mounted
// into `PracticeSurface`'s slot. No score or premium pitch lives here — the
// wall and nudge copy are `upgradeWall` and `nudge.practice` (M2), reused
// verbatim; this object only covers the question UI itself. WORKING until
// Anusha's voice pass.
export const practicePlayer = {
  /** "Q {current} of {total}" — 1-based for display, never the raw index. */
  counter: (current: number, total: number) => `Q ${current} of ${total}`,
  optionsLabel: 'Answer options',
  correct: 'Correct',
  incorrect: 'Incorrect',
  next: 'Next question',
  /** Shown once the last question in the set is answered, alongside the
   * "See results" action that opens the S7 results screen. */
  setComplete: 'That’s the last question in this practice set.',
  seeResults: 'See results',
} as const;

// ── Flashcard player (M5 S6, D9/D11) ─────────────────────────────────────
// The canonical-order, distinct-reveal-tracked deck player mounted into
// `FlashcardsSurface`'s slot. The 15/30/45 nudge copy is `nudge.flashcard`
// (M2), reused verbatim; this object only covers the card UI itself —
// reveal, self-grade, and forward/back navigation. No score or premium
// pitch lives here — the results screen is S7's scope. WORKING until
// Anusha's voice pass.
export const flashcardPlayer = {
  /** "Card {current} of {total}" — 1-based for display, never the raw index. */
  counter: (current: number, total: number) => `Card ${current} of ${total}`,
  reveal: 'Reveal the back',
  /** Forward-advance actions once a card is revealed — "I knew it" is the
   * default/primary grade (knew:true), "Didn’t know it" the explicit
   * override (knew:false). Both move the deck forward. */
  knew: 'I knew it',
  didntKnow: 'Didn’t know it',
  prev: 'Previous card',
  /** Shown once every card in the deck has been graded — no score, no
   * premium pitch: the results screen is S7's scope. */
  deckComplete: 'That’s every card in this chapter’s deck.',
} as const;

// ── Exam player (M5 S5, D8/D11) ──────────────────────────────────────────
// The untimed, single-sitting chapter exam mounted into `ExamSurface`'s
// slot. Unlike the practice player, an answer is never revealed as right or
// wrong and carries no explanation — "no peeking" until the run ends (S7's
// results screen). The pre-start nudge copy is `nudge.exam` (M2), reused
// verbatim; this object only covers the running exam UI itself. WORKING
// until Anusha's voice pass.
export const examPlayer = {
  badge: 'Exam mode — no peeking',
  /** "Q {current} of {total}" — 1-based for display, never the raw index. */
  counter: (current: number, total: number) => `Q ${current} of ${total}`,
  optionsLabel: 'Answer options',
  next: 'Next question',
  submit: 'Submit exam',
  /** Shown as the results detail line once the exam is submitted. */
  complete: 'Exam submitted.',
} as const;

// ── Mock player (M6) ─────────────────────────────────────────────────────
// The 100-question timed mock run mounted by the (next-step) mock surface.
// Wording adapted from the app's canonical mock copy — MockTestScreen.js's
// inline strings and appCopy.js's preMock / states / a11y sections — never
// invented. ZERO premium pitch lives here: the mock run is a zero-nudge
// surface (manual §1); the mock RESULTS pitch is the next step's scope.
// WORKING until Anusha's voice pass.
export const mockPlayer = {
  badge: 'Mock test',
  /** "Question {current} of {total}" — 1-based for display, never the raw index. */
  counter: (current: number, total: number) => `Question ${current} of ${total}`,
  optionsLabel: 'Answer options',
  prev: 'Previous',
  saveNext: 'Save & Next',
  /** Flag-toggle accessible names (app appCopy.a11y.flagQuestion / flagQuestionOn). */
  flagOff: 'Flag this question for review',
  flagOn: 'Remove flag from this question',
  timerLabel: 'Time remaining',
  exit: 'Exit',
  /** Desktop-only discoverability line for the keyboard shortcuts. */
  keyboardHint: 'Keyboard: 1–4 pick an answer · left/right arrows move · F flags',
  paletteToggle: 'Question palette',
  paletteLabel: 'Question palette',
  /** Palette cell accessible name — the state text keeps the four colours
   * legible to a screen reader (a11y baseline: never colour alone). */
  cellLabel: (n: number, state: string) => `Question ${n} — ${state}`,
  legend: {
    answered: 'Answered',
    visited: 'Visited',
    flagged: 'Flagged',
    notVisited: 'Not visited',
  },
  submit: 'Submit Test',
  confirmSubmit: {
    title: 'Submit Test?',
    allAnswered: 'All questions answered. Ready to see your score?',
    /** Ported string shape from MockTestScreen.js handleSubmit. */
    remaining: (unanswered: number, flaggedCount: number) => {
      const parts: string[] = [];
      if (unanswered) parts.push(`${unanswered} unanswered`);
      if (flaggedCount) parts.push(`${flaggedCount} flagged`);
      return `You have ${parts.join(' and ')} question${
        unanswered + flaggedCount !== 1 ? 's' : ''
      } — submit anyway?`;
    },
    cancelAllAnswered: 'Not yet',
    cancelRemaining: 'Review',
    confirm: 'Submit',
  },
  confirmExit: {
    title: 'Exit Exam?',
    body: 'Your progress will be lost.',
    cancel: 'Keep Going',
    confirm: 'Exit',
  },
  /** Zero assembled questions (app appCopy.states.mockEmpty*). */
  empty: {
    title: 'The mock paper is not ready yet',
    body: 'There are not enough questions in the bank to assemble a full mock. Check back soon.',
  },
} as const;

// ── Mock results (M6) ────────────────────────────────────────────────────
// The post-submit block inside the mock run, ported from the app's
// ResultsScreen mock branch (../ARNReady-App/screens/ResultsScreen.js:371-523,
// appCopy.results). Wording adapted, never invented; WORKING until Anusha's
// voice pass. The premium pitch (free users only) obeys the NUDGE LAW: it
// pitches what premium ADDS — unlimited mocks, a fresh weighted paper — never
// relief from the one-free-mock limit. Dual CTA until M8 ships web checkout.
// The app's Prepometer zone label + gauge and its score-banded Arnie ladder
// are NOT ported here: readiness zones are Prepometer machinery the web has
// not built, and score-gated celebration is an M7 polish decision (same
// deferral the M5 packet records for exam results). One calm Arnie instead.
export const mockResults = {
  mood: 'checks-in' as const,
  scoredLabel: 'You scored',
  /** "{score} / 100" — the mock is always scored over its full paper. */
  scoreLine: (score: number, total: number) => `${score} / ${total}`,
  /** Verdict bands (appCopy.results.mockVerdict) — calibration, not
   * judgement. {pass} is MOCK_PASS_MARK; band edges are pass and
   * pass + MOCK_PASS_MARGIN. */
  verdict: {
    passMargin: (pass: number) => `Passing is ${pass}%. You'd have passed — with margin to build.`,
    passJust: (pass: number) => `Passing is ${pass}%. You'd have passed — just. Margin is the next job.`,
    fail: (pass: number) =>
      `Passing is ${pass}%. Not there yet — but now you know exactly which chapters owe you marks.`,
  },
  /** Free-tier pitch block (appCopy.results.unlimitedMocksCta + the nudge
   * law). Primary CTA mirrors mockSurface.used / nudge.getApp exactly. */
  pitch: {
    title: 'Go Premium — Unlimited Mocks',
    body: 'Premium gets you unlimited mocks with a fresh weighted paper every time, plus the complete question bank — so you can track your readiness all the way to exam day.',
    cta: { href: '/pricing', label: 'Get the app' }, // [ANUSHA: Play Store listing URL]
    webSoon: 'Web checkout — coming soon',
    later: { href: '/app', label: 'Maybe later' },
  },
  /** Paid actions: retake is the primary (app takeAnotherMock); back is quiet. */
  takeAnother: 'Take Another Mock',
  backToStudy: { href: '/app', label: 'Back to study' },
  detailsShow: 'View performance details',
  detailsHide: 'Hide performance details',
  stats: {
    attempt: 'Score this attempt',
    time: 'Time taken',
    best: 'Best score',
    lowest: 'Toughest day',
    average: 'Average score',
    attempts: 'Mocks attempted',
    /** "{n} / 100" for the score rows (app dashCard rows). */
    outOf: (n: number, total: number) => `${n} / ${total}`,
  },
  weak: {
    heading: 'Chapters to revisit',
    /** appCopy.results.mockWeakChip — weightage-aware chip label. */
    chip: (ch: number, title: string, weight: number) => `Chapter ${ch} — ${title} · ${weight}% of exam`,
    /** Low-score framing (< 70%): overall practice beats chapter-chasing. */
    needsPractice: 'Arnie thinks you need more practice overall.',
    needsPracticeBody: 'Read the flashcards and work through Practice Mode before your next mock.',
    needsPracticeLink: { href: '/app', label: 'Read Flashcards' },
  },
} as const;

// ── /app/mock — pre-start surface (M6) ───────────────────────────────────
// PreMock parity: wording adapted from the app's canonical
// appCopy.preMock and appCopy.states sections — never invented. The
// used-mock pitch obeys the NUDGE LAW (manual §1): it pitches what premium
// ADDS (unlimited mocks, a fresh weighted paper every time), never relief
// from the one-free-mock limit. Dual CTA until M8 ships web checkout.
// WORKING until Anusha's voice pass.
export const mockSurface = {
  meta: {
    title: 'Mock test — ARNReady',
    description:
      'Sign in to sit a full NISM Series V-A mock test — 100 questions, timed like the real exam.',
  },
  /** Free users only (app preMock.freeBanner — the one-free-mock framing). */
  freeBanner: 'This is your one free mock. Make it count.',
  title: 'Before you begin',
  deviceAdvice: 'For the closest exam-like experience, take this mock on a laptop or desktop.',
  /** {questions}/{minutes} are filled from mockConfig at render — the copy
   * carries placeholders exactly as the app's does, never a second 100/120. */
  instructions: [
    '{questions} questions · {minutes} minutes — mirrors the real NISM V-A exam.',
    'Move freely between questions. Nothing is locked in until you submit.',
    'Change any answer as many times as you like before submitting.',
    'Flag a question to come back to it — the flag is just for you.',
    'Exit before submitting and the attempt is discarded — nothing is recorded.',
    'After you submit: score + weak chapters only. Mock questions are never shown again — each mock is a fresh simulation, not study material.',
  ],
  startButton: 'Start Mock Test',
  historyTitle: 'Past attempts',
  historyWeak: (list: string) => `Revisit: ${list}`,
  historyNoWeak: 'No weak chapters flagged',
  /** Free user whose one free mock is already taken (app preMock.used*). */
  used: {
    mood: 'meditating' as const,
    title: 'Your free mock is done',
    /** "{score}/100 · {date}" — the app's usedScoreLine shape. */
    scoreLine: (score: number, date: string) => `Your mock: ${score}/100 · ${date}`,
    body: 'You have taken your one free mock — and that score is real. Premium gets you unlimited mocks, a fresh weighted paper every time, so you can track your readiness all the way to exam day.',
    /** Interim dual CTA until M8: no Play listing URL exists in this repo yet
     * (see nudge.getApp's identical note) — "Get the app" points at /pricing. */
    cta: { href: '/pricing', label: 'Get the app' }, // [ANUSHA: Play Store listing URL]
    webSoon: 'Web checkout — coming soon', // informational, non-functional (pricing.premium.checkoutLabel)
    later: { href: '/app', label: 'Maybe later' },
  },
  /** Shown between Start and the paper mounting (app states.mockAssembling). */
  assembling: 'Assembling your paper…',
  /** Failed eligibility/pool read (app states.error*) — with retry, NEVER the
   * used-mock pitch (ScreenState policy §3). */
  error: {
    title: 'Could not load this right now',
    body: 'Check your connection and try again. Nothing you have done is lost.',
    retry: 'Try again',
  },
} as const;

// ── /app/mistakes — the mistakes deck (M6) ───────────────────────────────
// ZERO-NUDGE SURFACE (manual §1: the mistakes deck is nudge-free, both
// tiers) — no premium pitch anywhere in this section, and the deck is
// identical for free and paid. Wording adapted from the app's canonical
// appCopy.mistakes — never invented; the badge and retire lines are
// verbatim. The empty state is EARNED (every collected mistake cleared), so
// it is celebratory-calm — Arnie proud, not a party. WORKING until Anusha's
// voice pass.
export const mistakes = {
  meta: {
    title: 'Mistakes deck — ARNReady',
    description:
      'Sign in to re-attempt the questions you got wrong. Clear each one twice and it retires from your deck.',
  },
  /** App appCopy.mistakes.badge, verbatim. */
  badge: 'MISTAKES DECK · Your toughest questions',
  picker: {
    title: 'Your mistakes deck',
    /** The deck's own rules, plainly (adapted from app today.body). */
    body: 'Questions you got wrong, back for another go. Answer one correctly in two separate sessions and it retires for good.',
    /** Per-chapter count (adapted from app today.title "{n} mistakes are waiting"). */
    countLabel: (n: number) => (n === 1 ? '1 mistake waiting' : `${n} mistakes waiting`),
    /** App today.cta, verbatim — the one action per chapter card. */
    cta: 'Fix your mistakes',
    gridLabel: 'Chapters with mistakes',
  },
  /** All clear — the app's empty string, split into title/body. */
  empty: {
    mood: 'proud' as const,
    title: 'No mistakes waiting here.',
    body: 'Every question you missed has been cleared — Arnie is impressed.',
    back: { href: '/app', label: 'Back to study' },
  },
  /** One chapter's deck is clear — same earned state, way back to the picker. */
  emptyChapter: {
    body: 'Nothing waiting in this chapter’s deck.',
    back: { href: '/app/mistakes', label: 'Back to your mistakes deck' },
  },
  loading: 'Loading your mistakes…',
  /** App retireDone / retireProgress, verbatim (QuizScreen retire row). */
  retireDone: 'Nailed it twice. This one leaves your mistakes deck.',
  retireProgress: 'Got it. Answer it right in one more session and it retires from your deck.',
  /** Mistakes-specific end-of-set line (the practice one says "practice set"). */
  setComplete: 'That’s every mistake in this run.',
  completion: {
    mood: 'checks-in' as const,
    title: 'Mistakes run done.',
    /** Same honest accuracy shape as results.practice — no readiness claim. */
    headline: (correct: number, attempted: number, pct: number) =>
      `You got ${correct} of ${attempted} right — ${pct}%`,
    action: { href: '/app/mistakes', label: 'Back to your mistakes deck' },
  },
} as const;

// ── /app/progress — the read-only progress surface (M6) ─────────────────
// READ-ONLY and nudge-free: this surface records nothing and pitches
// nothing. THE DISPLAY LAW (app ChapterListScreen.js ChapterRow + manual §1
// "Never compare the two on one surface"): a chapter's readiness is its
// FULL-exam last percentage ONLY — a chapter without a full exam earns a
// NEUTRAL activity line (sample, then practice, then not started), never
// both on one row. Wording adapted from the app's canonical
// appCopy.chapters section — never invented. WORKING until Anusha's voice
// pass.
export const progress = {
  meta: {
    title: 'Your progress — ARNReady',
    description:
      'Sign in to see your chapter readiness and mock test history for the NISM Series V-A exam.',
  },
  title: 'Your progress',
  /** Adapted from app chapters.journeyEmpty — readiness moves on full Exam
   * Mode scores only; activity is acknowledged, never inflated. */
  intro:
    'Your 12-chapter road to the ARN. Readiness moves on full Exam Mode scores — sample and practice work is noted, never inflated.',
  loading: 'Loading your progress…',
  listLabel: 'Chapter progress',
  /** App chapters.weightChip, verbatim shape. */
  weightChip: (w: number) => `${w}% of exam`,
  /** The honest full-exam figure — no zone label, no claim beyond the pct. */
  readiness: (pct: number) => `${pct}%`,
  /** App chapters.sampleActivity — {score}/{total} is the blob's LOCKED
   * sample lastScore/lastTotal pair (denominator max(10, attempted)), never
   * the served count. */
  sampleActivity: (score: number, total: number) => `Free sample: ${score}/${total}`,
  /** App chapters.practiceActivity, verbatim shape. */
  practiceActivity: (n: number) => `Practised ${n} questions`,
  /** App chapters.notStarted, verbatim. */
  notStarted: 'Not started',
  /** App chapters.rowA11y, verbatim shape. */
  rowA11y: (id: number, title: string, weight: number, status: string) =>
    `Chapter ${id}: ${title}. ${weight}% of exam. ${status}`,
  mockHistory: {
    heading: 'Mock test history',
    /** Adapted from the app's preMock framing — the mock is the full
     * 100-question rehearsal of the real exam. */
    empty: {
      text: 'No mock on record yet. The full 100-question rehearsal is the truest check of your readiness.',
      link: { href: '/app/mock', label: 'Sit the mock test' },
    },
  },
} as const;

// ── End-of-run results (M5 S7, D10/D11) ──────────────────────────────────
// The minimal per-mode results screens: a score/summary line and one onward
// action. No premium pitch (the mock-results pitch is M6; practice/exam/
// flashcard results carry no nudge — they are post-run surfaces). Free and
// paid exam scores are shown per the LOCKED formulas and never side by side
// (manual §1). Score-gated Arnie celebration is deferred to M7 — the mood
// here is calm by intent. WORKING until Anusha's voice pass.
export const results = {
  practice: {
    mood: 'checks-in' as const,
    title: 'Practice run done.',
    /** "You got {correct} of {attempted} right — {pct}%" */
    headline: (correct: number, attempted: number, pct: number) =>
      `You got ${correct} of ${attempted} right — ${pct}%`,
    action: { href: '/app', label: 'Back to study' },
  },
  exam: {
    mood: 'checks-in' as const,
    title: 'Exam done.',
    /** Percentage only — the honest locked figure. Never a raw correct/served
     * fraction, which for a free sample would read as the misleading "7/20". */
    headline: (pct: number) => `Your score: ${pct}%`,
    action: { href: '/app', label: 'Back to study' },
  },
  flashcards: {
    mood: 'makes-it-stick' as const,
    title: 'Deck done.',
    /** Self-graded study data, NOT a readiness score — a plain count, no
     * percentage, no Prepometer language. */
    headline: (knew: number, total: number) => `You knew ${knew} of ${total} cards`,
    action: { href: '/app', label: 'Back to study' },
  },
} as const;
