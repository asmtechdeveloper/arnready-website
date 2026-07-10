/**
 * Build-time content loaders. Server components only (fs) — the exported
 * JSON in content/ contains ONLY free material (see scripts/export-content.mjs
 * and the leak gate). Client components receive this data as props.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Question } from './quizEngine';

export interface FlashcardGroup {
  chapter: number;
  subtopic: string;
  cards: Array<{ front: string; back: string; cardType: string }>;
}

export interface ChapterStats {
  chapter: number;
  totalQuestions: number;
  seedCount: number;
  freeCount: number;
  flashcardCount: number;
  subtopics: string[];
}

const CONTENT = path.join(process.cwd(), 'content');
const pad = (n: number) => String(n).padStart(2, '0');

export function loadFreeQuestions(chapter: number): Question[] {
  const p = path.join(CONTENT, 'questions', `ch${pad(chapter)}.free.json`);
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function loadFlashcards(chapter: number): FlashcardGroup[] {
  const p = path.join(CONTENT, 'flashcards', `ch${pad(chapter)}.json`);
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function loadChapterStats(): ChapterStats[] {
  const p = path.join(CONTENT, 'chapter-stats.json');
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, 'utf8')).chapters;
}

export function statsForChapter(chapter: number): ChapterStats | undefined {
  return loadChapterStats().find((c) => c.chapter === chapter);
}

/** Free mock pool: every free question across all chapters (240 = 20 × 12). */
export function loadAllFreeQuestions(): Question[] {
  const all: Question[] = [];
  for (let ch = 1; ch <= 12; ch++) all.push(...loadFreeQuestions(ch));
  return all;
}
