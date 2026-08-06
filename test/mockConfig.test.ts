/**
 * mockConfig pins (M6).
 *
 * `src/lib/mockConfig.ts` MIRRORS ../ARNReady-App/config.js by citation (the
 * app config imports React Native assets, so no live cross-repo import is
 * possible — same situation as the nudgeGates constants). These pins are the
 * drift alarm: if any of them fails, either the app changed canon first (then
 * regenerate the mirror AND this file together, with Anusha's sign-off) or
 * someone edited the mirror in place (a §0.10 stop condition — revert).
 */
import { describe, expect, it } from 'vitest';

import {
  MOCK_CHAPTER_WEIGHTS,
  MOCK_DURATION_MIN,
  MOCK_PASS_MARGIN,
  MOCK_PASS_MARK,
  MOCK_QUESTIONS,
} from '@/lib/mockConfig';

describe('mockConfig mirrors ../ARNReady-App/config.js exactly', () => {
  it('pins MOCK_QUESTIONS = 100 (config.js:107)', () => {
    expect(MOCK_QUESTIONS).toBe(100);
  });

  it('pins MOCK_DURATION_MIN = 120 (config.js:108)', () => {
    expect(MOCK_DURATION_MIN).toBe(120);
  });

  it('pins MOCK_PASS_MARK = 50 (config.js:112 — WORKING value, awaits Anusha)', () => {
    expect(MOCK_PASS_MARK).toBe(50);
  });

  it('pins MOCK_PASS_MARGIN = 10 (config.js:115)', () => {
    expect(MOCK_PASS_MARGIN).toBe(10);
  });

  it('pins every chapter weight exactly (config.js:120-133, LOCKED per NISM V-A)', () => {
    expect(MOCK_CHAPTER_WEIGHTS).toEqual({
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
    });
  });

  it('covers chapters 1-12 exactly — no missing or extra chapters', () => {
    const chapters = Object.keys(MOCK_CHAPTER_WEIGHTS)
      .map(Number)
      .sort((a, b) => a - b);
    expect(chapters).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('weights sum to 100 — a full mock is exactly MOCK_QUESTIONS long', () => {
    const sum = Object.values(MOCK_CHAPTER_WEIGHTS).reduce((acc, w) => acc + w, 0);
    expect(sum).toBe(100);
    expect(sum).toBe(MOCK_QUESTIONS);
  });
});
