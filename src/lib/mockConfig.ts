/**
 * mockConfig — mirrored mock-mode constants from the app's canonical
 * ../ARNReady-App/config.js (M6).
 *
 * MIRRORED BY CITATION, NEVER RE-DERIVED. Unlike `quizEngine.ts` (whose
 * fixture generator live-imports the app module), `config.js` imports React
 * Native assets and cannot be loaded outside the app — so, exactly as
 * `nudgeGates.ts` does for the gate constants, this module re-states the
 * canonical values with a line citation each, and `test/mockConfig.test.ts`
 * pins every one. Changing ANY value here without the app changing first is
 * drift between the two products' mock — a §0.10 stop condition: stop and
 * ask Anusha, never edit in place.
 */

// Mock mirrors the real NISM V-A exam: 100 questions, 120 minutes.
// (../ARNReady-App/config.js:107-108, CONFIG.MOCK_QUESTIONS / MOCK_DURATION_MIN)
export const MOCK_QUESTIONS = 100;
export const MOCK_DURATION_MIN = 120;

// NISM V-A pass mark (%). WORKING value — awaits Anusha's verification
// alongside the other Guide exam facts. (../ARNReady-App/config.js:112,
// CONFIG.MOCK_PASS_MARK)
export const MOCK_PASS_MARK = 50;

// Verdict framing: at or above pass+margin reads "passed with margin".
// (../ARNReady-App/config.js:115, CONFIG.MOCK_PASS_MARGIN)
export const MOCK_PASS_MARGIN = 10;

// NISM-defined chapter weightage → questions per chapter in a 100Q mock.
// Keys are chapter numbers (1–12). Values sum to 100.
// LOCKED per NISM V-A syllabus. Do not change without Anusha's instruction.
// (../ARNReady-App/config.js:120-133, CONFIG.MOCK_CHAPTER_WEIGHTS)
export const MOCK_CHAPTER_WEIGHTS: Record<number, number> = {
  1: 8,
  2: 6,
  3: 4,
  4: 10,
  5: 10,
  6: 6,
  7: 8,
  8: 4,
  9: 15,
  10: 7,
  11: 7,
  12: 15,
};
