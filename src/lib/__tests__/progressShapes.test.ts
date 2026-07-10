/**
 * Byte-level parity fixtures: the web's Firestore document shapes vs the
 * app's progressService / mockService / mistakesService writes. The expected
 * objects below are transcribed from the app source (the single write site).
 * If the app shapes ever change, change these fixtures IN THE SAME SESSION.
 */
import { describe, expect, it } from 'vitest';
import {
  buildExamAggregate,
  buildMistakeAdvance,
  buildMistakeJoin,
  buildMockRecord,
  buildNextBlob,
  buildSessionDoc,
  buildWrongList,
  docToBlob,
  SERVER_TIMESTAMP,
} from '../progressShapes';
import type { Question } from '../quizEngine';

const q = (id: string, correctIndex = 0, subtopic?: string, chapter = 3): Question => ({
  id,
  chapter,
  subtopic,
  question: 'q',
  options: ['a', 'b', 'c', 'd'],
  correctIndex,
});

const QUESTIONS = [q('ch03_q001', 0, 'Trustees'), q('ch03_q002', 1, 'AMC'), q('ch03_q003', 2)];
const ANSWERS = [0, 3, null]; // right, wrong, unanswered

describe('exam aggregate — users/{uid}/chapterProgress/{n}', () => {
  it('first attempt (no prev) matches the app write exactly', () => {
    const wrong = buildWrongList(QUESTIONS, ANSWERS);
    expect(
      buildExamAggregate(null, { correct: 1, attempted: 2, served: 3, scorePct: 10, wrong }),
    ).toEqual({
      lastExamScore: 1,
      lastExamTotal: 3,
      lastExamAttempted: 2,
      lastExamPct: 10,
      lastExamDate: SERVER_TIMESTAMP,
      lastExamWrong: [{ questionId: 'ch03_q002', subtopic: 'AMC' }],
      previousExamScore: null,
      previousExamTotal: null,
      bestExamScore: 1,
      bestExamTotal: 3,
      examAttempts: 1,
    });
  });

  it('later attempt carries previous* and max(best)', () => {
    const prev = {
      lastScore: 20, lastTotal: 30, lastAttempted: 30, lastPercentage: 67,
      bestScore: 25, bestTotal: 30, attempts: 4, practiced: 60, wrong: [],
    };
    const agg = buildExamAggregate(prev, {
      correct: 22, attempted: 30, served: 30, scorePct: 73, wrong: [],
    });
    expect(agg.previousExamScore).toBe(20);
    expect(agg.previousExamTotal).toBe(30);
    expect(agg.bestExamScore).toBe(25); // best unchanged — 22 < 25
    expect(agg.examAttempts).toBe(5);
  });

  it('unanswered questions never join the wrong list', () => {
    expect(buildWrongList(QUESTIONS, ANSWERS)).toHaveLength(1);
  });

  it('missing subtopic falls back to General (app parity)', () => {
    expect(buildWrongList([q('x', 0)], [2])).toEqual([
      { questionId: 'x', subtopic: 'General' },
    ]);
  });
});

describe('session log — users/{uid}/sessions/{autoId}', () => {
  it('matches the app writeSessionLog document exactly', () => {
    expect(
      buildSessionDoc({
        mode: 'exam', chapter: 3, correct: 1, attempted: 2, served: 3,
        scorePct: 10, endedEarly: true, timeTaken: 145,
        answers: ANSWERS, questions: QUESTIONS,
      }),
    ).toEqual({
      mode: 'exam',
      source: null,
      chapter: 3,
      completedAt: SERVER_TIMESTAMP,
      correct: 1,
      attempted: 2,
      served: 3,
      scorePct: 10,
      endedEarly: true,
      timeTaken: 145,
      answers: [
        { qId: 'ch03_q001', picked: 0, correct: true },
        { qId: 'ch03_q002', picked: 3, correct: false },
        { qId: 'ch03_q003', picked: null, correct: false },
      ],
    });
  });

  it('mock session: chapter null, defaults for endedEarly/source', () => {
    const doc = buildSessionDoc({
      mode: 'mock', chapter: null, correct: 60, attempted: 95, served: 100, scorePct: 60,
    });
    expect(doc.chapter).toBeNull();
    expect(doc.source).toBeNull();
    expect(doc.endedEarly).toBe(false);
    expect(doc.timeTaken).toBeNull();
    expect(doc.answers).toEqual([]);
  });

  it("mistakes re-attempt carries source: 'mistakes'", () => {
    expect(
      buildSessionDoc({
        mode: 'practice', chapter: 3, correct: 2, attempted: 2, served: 2,
        scorePct: 100, source: 'mistakes',
      }).source,
    ).toBe('mistakes');
  });
});

describe('screen blob — cache shape', () => {
  it('buildNextBlob matches app recordExamSession.next', () => {
    expect(
      buildNextBlob(null, { correct: 1, attempted: 2, served: 3, scorePct: 10, wrong: [] }),
    ).toEqual({
      lastScore: 1, lastTotal: 3, lastAttempted: 2, lastPercentage: 10,
      bestScore: 1, bestTotal: 3, attempts: 1, practiced: 0, wrong: [],
    });
  });

  it('docToBlob defaults mirror the app (derived pct, attempts inference)', () => {
    expect(docToBlob({ lastExamScore: 7, lastExamTotal: 10 })).toEqual({
      lastScore: 7, lastTotal: 10, lastAttempted: 10, lastPercentage: 70,
      bestScore: 7, bestTotal: 10, attempts: 1, practiced: 0, wrong: [],
    });
    expect(docToBlob(null)).toBeNull();
  });
});

describe('mockHistory entry — users/{uid}.mockHistory arrayUnion', () => {
  it('matches the app record: ISO date, lean fields only', () => {
    const rec = buildMockRecord({
      date: '2026-07-10T12:00:00.000Z', score: 61, total: 100,
      percentage: 61, timeTaken: 5820, weakChapters: [9, 12, 4],
    });
    expect(rec).toEqual({
      date: '2026-07-10T12:00:00.000Z',
      score: 61,
      total: 100,
      percentage: 61,
      timeTaken: 5820,
      weakChapters: [9, 12, 4],
    });
    // Lean by design: no answers/questions in history (non-reviewable).
    expect(Object.keys(rec)).toHaveLength(6);
  });
});

describe('mistake docs — users/{uid}/mistakes/{questionId}', () => {
  it('join shape matches the app', () => {
    expect(buildMistakeJoin(q('ch03_q002', 1, 'AMC'))).toEqual({
      questionId: 'ch03_q002',
      chapter: 3,
      subtopic: 'AMC',
      correctStreak: 0,
      retired: false,
      addedAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    });
  });

  it('advance retires at the locked streak of 2', () => {
    expect(buildMistakeAdvance(1, 2)).toEqual({
      correctStreak: 1, retired: false, updatedAt: SERVER_TIMESTAMP,
    });
    expect(buildMistakeAdvance(2, 2)).toEqual({
      correctStreak: 2, retired: true, updatedAt: SERVER_TIMESTAMP,
    });
  });
});
