import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import ChapterHubPage from '@/app/chapters/[chapter]/page';
import SubtopicSpokePage from '@/app/chapters/[chapter]/[subtopic]/page';
import { chapters } from '@/lib/copy';

/**
 * M1-B8: each chapter surface needs one FUNCTIONAL, visually primary CTA,
 * not just a quiet text link — the disabled sign-in stub is informational
 * only until M3 wires real auth. Requires a real Firestore export
 * (`content/`), like test/signInPlacement.test.tsx.
 */
const hasContent = existsSync(path.resolve(import.meta.dirname, '..', 'content', 'flashcards', 'ch01.raw.json'));

describe.skipIf(!hasContent)('chapter surfaces have one functional, prominent primary CTA', () => {
  it('hub: the pricing link is styled as the primary CTA (not a quiet text link), and the sign-in stub stays disabled/informational', async () => {
    const jsx = await ChapterHubPage({ params: Promise.resolve({ chapter: '1' }) });
    const { getByText } = render(jsx);

    const pricingLink = getByText(chapters.hub.pricingLink.label).closest('a');
    expect(pricingLink).not.toBeNull();
    expect(pricingLink).toHaveAttribute('href', chapters.hub.pricingLink.href);
    expect(pricingLink?.className).toContain('bg-purple');

    const signInStub = getByText(chapters.hub.signIn.label).closest('button');
    expect(signInStub).toBeDisabled();
  });

  it('spoke: "Back to chapter" is styled as the primary CTA (not a quiet text link)', async () => {
    const jsx = await SubtopicSpokePage({
      params: Promise.resolve({ chapter: '1', subtopic: 'savings-vs-investments' }),
    });
    const { getByText } = render(jsx);

    const backLink = getByText(chapters.spoke.backToChapter).closest('a');
    expect(backLink).not.toBeNull();
    expect(backLink).toHaveAttribute('href', '/chapters/1');
    expect(backLink?.className).toContain('bg-purple');
  });
});
