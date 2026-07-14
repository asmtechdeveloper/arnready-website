import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import SubtopicSpokePage from '@/app/chapters/[chapter]/[subtopic]/page';

/**
 * M1-B9: the spoke's Previous/Next nav must never use raw "←"/"→" glyphs —
 * the design system is Feather-icons-only (src/components/Icon.tsx), and a
 * raw glyph also leaks into the link's accessible name. Requires a real
 * Firestore export (`content/`), like test/signInPlacement.test.tsx.
 */
const hasContent = existsSync(path.resolve(import.meta.dirname, '..', 'content', 'flashcards', 'ch01.raw.json'));

describe.skipIf(!hasContent)('spoke prev/next navigation has no raw arrow glyphs', () => {
  it('renders no "←" or "→" glyph anywhere on the page', async () => {
    // "savings-vs-investments" sits in the middle of chapter 1's ordered
    // subtopics, so both a prev and a next link render.
    const jsx = await SubtopicSpokePage({
      params: Promise.resolve({ chapter: '1', subtopic: 'savings-vs-investments' }),
    });
    const { container } = render(jsx);
    expect(container.textContent).not.toContain('←');
    expect(container.textContent).not.toContain('→');
  });

  it('gives the prev/next links clean, text-only accessible names', async () => {
    const jsx = await SubtopicSpokePage({
      params: Promise.resolve({ chapter: '1', subtopic: 'savings-vs-investments' }),
    });
    const { getByRole } = render(jsx);
    expect(getByRole('link', { name: 'Previous: Investors and Financial Goals' })).toHaveAttribute(
      'href',
      '/chapters/1/investors-and-financial-goals',
    );
    expect(getByRole('link', { name: 'Next: Different Asset Classes' })).toHaveAttribute(
      'href',
      '/chapters/1/different-asset-classes',
    );
  });
});
