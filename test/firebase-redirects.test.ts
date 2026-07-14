import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const firebaseJson = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '..', 'firebase.json'), 'utf8'));

const redirects: { regex: string; destination: string; type: number }[] = firebaseJson.hosting.redirects;

describe('firebase.json hosting redirects', () => {
  it('redirects the retired /questions route to /chapters', () => {
    const match = redirects.find((r) => r.regex.includes('/questions'));
    expect(match).toBeDefined();
    expect(match?.destination).toBe('/chapters');
    expect(match?.type).toBe(301);
  });

  // M1-S5: the 12 legacy /chapter-N redirects previously pointed at a slugged
  // /chapters/N-slug scheme this milestone never implemented, so every old
  // bookmark and indexed URL 301'd straight to a 404. They must land on the
  // numeric hub route that actually exists (/chapters/N).
  describe('legacy /chapter-N redirects land on real numeric hub routes', () => {
    for (let ch = 1; ch <= 12; ch++) {
      it(`redirects /chapter-${ch} to /chapters/${ch}`, () => {
        const match = redirects.find((r) => r.regex === `^/chapter-${ch}(\\.html)?$`);
        expect(match, `redirect for /chapter-${ch} is defined`).toBeDefined();
        expect(match?.destination).toBe(`/chapters/${ch}`);
        expect(match?.type).toBe(301);
      });
    }

    it('no chapter redirect points at the retired slugged scheme', () => {
      const chapterRedirects = redirects.filter((r) => /^\^\/chapter-\d+/.test(r.regex));
      expect(chapterRedirects).toHaveLength(12);
      for (const r of chapterRedirects) {
        // A bare numeric /chapters/N destination — never /chapters/N-<slug>.
        expect(r.destination).toMatch(/^\/chapters\/\d+$/);
      }
    });
  });
});
