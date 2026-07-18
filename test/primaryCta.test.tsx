import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import ChapterHubPage from '@/app/chapters/[chapter]/page';
import SubtopicSpokePage from '@/app/chapters/[chapter]/[subtopic]/page';
import { chapters } from '@/lib/copy';

/**
 * M1-B8: each chapter surface needs one FUNCTIONAL, visually primary CTA,
 * not just a quiet text link. Requires a real Firestore export (`content/`),
 * like test/signInPlacement.test.tsx.
 *
 * ── Deliberately updated in M3 (documented in docs/review-packets/M3_PACKET.md)
 * M1-B8 made the PRICING link the hub's primary CTA solely because sign-in
 * was a disabled stub at the time ("the disabled sign-in stub is
 * informational only until M3 wires real auth" — this file's original
 * comment). M3 wires real auth, so the manual's own shape is restored:
 * M1 step 2 specifies the hub carries "one sign-in CTA", and §1 places a
 * sign-in prompt "after the 10th sampler card". Sign-in is therefore the
 * hub's one primary CTA and the pricing link demotes to a quiet secondary.
 *
 * The invariant M1-B8 actually protects — the hub has exactly one
 * functional, visually primary CTA — is unchanged and still asserted; only
 * WHICH control holds that role has moved, per the canon.
 */
const hasContent = existsSync(path.resolve(import.meta.dirname, '..', 'content', 'flashcards', 'ch01.raw.json'));

describe.skipIf(!hasContent)('chapter surfaces have one functional, prominent primary CTA', () => {
  it('hub: the sign-in control is the one functional, visually primary CTA, and the pricing link is a quiet secondary', async () => {
    const jsx = await ChapterHubPage({ params: Promise.resolve({ chapter: '1' }) });
    const { getByText } = render(jsx);

    // Primary: functional (not disabled) and visually primary (filled purple).
    const signIn = getByText(chapters.hub.signIn.label).closest('button');
    expect(signIn).not.toBeNull();
    expect(signIn).toBeEnabled();
    expect(signIn?.className).toContain('bg-purple');

    // Secondary: still present and still correct, but no longer competing.
    const pricingLink = getByText(chapters.hub.pricingLink.label).closest('a');
    expect(pricingLink).not.toBeNull();
    expect(pricingLink).toHaveAttribute('href', chapters.hub.pricingLink.href);
    expect(pricingLink?.className).not.toContain('bg-purple');
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
