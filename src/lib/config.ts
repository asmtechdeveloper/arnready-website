/**
 * Web config — MIRRORS the app repo's config.js for every LOCKED value
 * (gates, caps, exam/mock shape, weights, pass mark). The app repo's
 * CLAUDE.md is canon; never re-derive these, only mirror-edit.
 */

export interface ChapterMeta {
  id: number;
  title: string;
  slug: string;
  oneliner: string;
}

const slugify = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const CHAPTER_TITLES: Array<[number, string, string]> = [
  [1, 'Investment Landscape', 'Why your savings account is quietly losing to inflation.'],
  [2, 'Concept and Role of a Mutual Fund', 'The Melting Pot — how strangers pool money and why it works.'],
  [3, 'Legal Structure of Mutual Funds in India', 'Behind the Curtain — the stage you never see.'],
  [4, 'Legal and Regulatory Framework', 'The Guardians of the Mutual Fund Galaxy.'],
  [5, 'Scheme Related Information', 'Meet the Star Kids — SID, SAI and KIM.'],
  [6, 'Fund Distribution and Channel Management', 'MFD the Matchmaker — connecting investors and funds.'],
  [7, 'NAV, Total Expense Ratio and Pricing', 'The Numbers We Love and Hate.'],
  [8, 'Taxation', 'Everyone hates taxes. Except the NISM examiner.'],
  [9, 'Investor Services', 'At the Service of the Master — the investor.'],
  [10, 'Risk, Return and Performance of Funds', 'There really are no free lunches — the risk-return bargain.'],
  [11, 'Mutual Fund Scheme Performance', 'The Fund Manager — hero or lucky?'],
  [12, 'Mutual Fund Scheme Selection', 'Mutual Funds Sahi Hai. But which?'],
];

export const CONFIG = {
  SITE_URL: 'https://arnready.com',
  SITE_NAME: 'ARNReady',
  TAGLINE: 'Get ARN Ready',
  SUPPORT_EMAIL: 'asmtechdeveloper@gmail.com',

  UNLOCK_PRICE_DISPLAY: '₹250',

  // ── LOCKED freemium gates (mirror of app config) ──
  FREE_QUESTIONS_PER_CHAPTER: 20,
  AD_GATE_1: 10,
  AD_GATE_2: 15,

  // ── LOCKED quiz engine values ──
  EXAM_QUESTIONS: 30,
  MOCK_QUESTIONS: 100,
  MOCK_DURATION_MIN: 120,
  // WORKING value pending Anusha's verification (same status as the app).
  MOCK_PASS_MARK: 50,
  MOCK_PASS_MARGIN: 10,

  // LOCKED per NISM V-A syllabus. Do not change without Anusha's instruction.
  MOCK_CHAPTER_WEIGHTS: {
    1: 8, 2: 6, 3: 4, 4: 10, 5: 10, 6: 6,
    7: 8, 8: 4, 9: 15, 10: 7, 11: 7, 12: 15,
  } as Record<number, number>,

  MISTAKE_RETIRE_STREAK: 2,
  WEAK_CHAPTER_THRESHOLD_PCT: 60,

  TOTAL_CHAPTERS: 12,
  NISM_PORTAL_URL: 'https://certifications.nism.ac.in',

  FUNCTIONS_REGION: 'asia-south1',

  // Web break-gate hold before the unlock button enables (seconds).
  // WORKING default (10 Jul): timed break-gate + ad slot, pending Anusha.
  BREAK_GATE_SECONDS: 5,

  CHAPTERS: CHAPTER_TITLES.map(([id, title, oneliner]) => ({
    id,
    title,
    slug: `${id}-${slugify(title)}`,
    oneliner,
  })) as ChapterMeta[],
};

export function chapterById(id: number): ChapterMeta | undefined {
  return CONFIG.CHAPTERS.find((c) => c.id === id);
}
