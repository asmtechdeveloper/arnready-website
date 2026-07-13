import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sitemap from '@/app/sitemap';

const hasContent = existsSync(path.resolve(import.meta.dirname, '..', 'content', 'flashcards', 'ch01.raw.json'));

describe.skipIf(!hasContent)('sitemap', () => {
  it('includes /chapters and never includes the retired /questions route', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain('https://arnready.com/chapters');
    expect(urls.some((u) => u.includes('/questions'))).toBe(false);
  });

  it('includes at least one chapter hub and one subtopic spoke URL', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => /\/chapters\/\d+$/.test(u))).toBe(true);
    expect(urls.some((u) => /\/chapters\/\d+\/[a-z0-9-]+$/.test(u))).toBe(true);
  });

  it('produces no duplicate URLs', () => {
    const urls = sitemap().map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
