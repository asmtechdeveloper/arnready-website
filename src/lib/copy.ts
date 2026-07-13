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
  tagline: 'Get ARN Ready.',
  motto: 'Knowledge is free. Mastery is earned.',
};

export const contact = {
  supportEmail: 'asmtechdeveloper@gmail.com',
};

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
  signIn: { label: 'Sign in — coming soon' },
  menuLabel: 'Menu',
  closeMenuLabel: 'Close menu',
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
export const privacy = {
  meta: { title: 'Privacy Policy', description: 'How ARNReady collects, stores, and protects your data.' },
  h1: 'Privacy Policy',
  meta_updated: 'Last updated: July 2026',
  cta: { href: '/support', label: 'Contact support' },
  sections: [
    {
      h2: 'Who we are',
      paragraphs: [
        'ARNReady is built and operated by Anusha Murthy, trading as ASM Tech, Bengaluru, India. If you have questions about this policy, email us at the address below.',
      ],
    },
    {
      h2: 'What we collect',
      paragraphs: [
        'If you sign in with Google, on the app or on the website:',
      ],
      list: [
        'Your name and email address from your Google account',
        'Your display name, if you choose to set one',
        'Your exam date, if you choose to enter it',
      ],
      paragraphs2: ['Automatically, once signed in:'],
      list2: [
        'Your progress through chapters, flashcards, and mock tests',
        'Questions you answered correctly and incorrectly',
        'Crash and performance data via Firebase',
        'Ad performance data via Google AdMob — Android app free users only. The website is ad-free; no ad data is collected here.',
      ],
      paragraphs3: [
        'We never collect your payment card details, your location, or your contacts.',
      ],
    },
    {
      h2: 'Where your data lives',
      paragraphs: [
        'Your account and study data are stored in Google Firebase (Cloud Firestore), in the asia-south1 (Mumbai) region.',
      ],
    },
    {
      h2: 'How we use it',
      list: [
        'To save your progress across sessions, devices, and platforms',
        'To show your score honestly and point out weak areas',
        'To serve relevant ads to free users of the Android app',
        'To fix bugs and improve the product',
      ],
    },
    {
      h2: 'Third parties',
      list: [
        'Google Firebase — authentication and data storage',
        'Google AdMob — advertising for free users of the Android app only',
        'Google Play — payment processing for the app’s premium unlock; we never see your card details',
        'Razorpay — planned for website checkout; not live yet. We will name it here again, with full detail, before it goes live, and we will never see your card details.',
      ],
      paragraphs2: [
        'None of these parties receive your data for their own marketing purposes beyond their standard platform terms.',
      ],
    },
    {
      h2: 'Your data, your rights',
      list: [
        'You can delete your account and all associated data — in the app (Profile → Delete Account) or by email. See the delete-account page for details.',
        'You can request a copy of your data at any time by emailing us',
        'Paid users are ad-free everywhere — AdMob does not run on paid accounts',
      ],
    },
    {
      h2: 'Children',
      paragraphs: [
        'ARNReady is intended for adults preparing for a professional certification. We do not knowingly collect data from anyone under 18.',
      ],
    },
    {
      h2: 'Changes to this policy',
      paragraphs: [
        'If we make material changes, we will notify you within the app or on this website. Continued use after notification means you accept the updated policy.',
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
    body: 'Anything about your data or this process: email us, or see Support.',
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
    deleteLine: 'Deleting your account and data: Delete account.',
    privacyLine: 'How your data is handled: Privacy policy.',
    faqLine: 'Questions about the exam or the free tier: FAQ.',
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
