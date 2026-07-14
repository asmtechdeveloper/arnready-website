import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import ChapterHubPage from '@/app/chapters/[chapter]/page';
import SubtopicSpokePage from '@/app/chapters/[chapter]/[subtopic]/page';
import { chapters } from '@/lib/copy';

/**
 * Manual §1: "Sign-in prompts appear in exactly three places, always
 * cancellable: after the 10th sampler card, on any practice/exam/mock CTA,
 * in the header." For the public chapter surfaces, that means the hub only
 * — never the spoke (M1-B6). Requires a real Firestore export (`content/`)
 * to render these Server Components against real data, so it's skipped
 * like test/sitemap.test.ts when that export hasn't been run.
 */
const hasContent = existsSync(path.resolve(import.meta.dirname, '..', 'content', 'flashcards', 'ch01.raw.json'));

describe.skipIf(!hasContent)('sign-in prompt placement (hub only, never on a spoke)', () => {
  it('the chapter hub renders the sign-in prompt after the sampler', async () => {
    const jsx = await ChapterHubPage({ params: Promise.resolve({ chapter: '1' }) });
    const { getByText } = render(jsx);
    expect(getByText(chapters.hub.signIn.label)).toBeInTheDocument();
  });

  it('a subtopic spoke page never renders a sign-in prompt', async () => {
    const jsx = await SubtopicSpokePage({
      params: Promise.resolve({ chapter: '1', subtopic: 'savings-vs-investments' }),
    });
    const { queryByText } = render(jsx);
    expect(queryByText(chapters.hub.signIn.label)).toBeNull();
    expect(queryByText(chapters.hub.signIn.body)).toBeNull();
  });
});
