import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UpgradeWall } from '@/components/UpgradeWall';
import { arnieAlts, upgradeWall } from '@/lib/copy';

/**
 * M2 plan S4 / D2, D8, D11: <UpgradeWall> is the Q21+ free-cap boundary —
 * a HARD stop, not a nudge. It renders the wall copy from copy.ts (never
 * hardcoded prose), exactly one Arnie (mood `proud`), a single primary CTA
 * to `/pricing`, and a "back to the chapter" link built from
 * `returnTo.chapter`. There is deliberately no continue/dismiss affordance.
 */
describe('UpgradeWall', () => {
  it('renders the title and body from copy.upgradeWall', () => {
    render(<UpgradeWall returnTo={{ chapter: 3 }} />);
    expect(screen.getByText(upgradeWall.title)).toBeInTheDocument();
    expect(screen.getByText(upgradeWall.body)).toBeInTheDocument();
  });

  it('renders exactly one Arnie, mood proud', () => {
    render(<UpgradeWall returnTo={{ chapter: 3 }} />);
    expect(screen.getByAltText(arnieAlts.proud)).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('the primary CTA links to /pricing', () => {
    render(<UpgradeWall returnTo={{ chapter: 3 }} />);
    const cta = screen.getByRole('link', { name: upgradeWall.primaryCta.label });
    expect(cta).toHaveAttribute('href', upgradeWall.primaryCta.href);
    expect(cta).toHaveAttribute('href', '/pricing');
  });

  it.each([1, 3, 12])('the back link points to /chapters/%i for that returnTo.chapter', (chapter) => {
    render(<UpgradeWall returnTo={{ chapter }} />);
    const backLink = screen.getByRole('link', { name: upgradeWall.backToChapter });
    expect(backLink).toHaveAttribute('href', `/chapters/${chapter}`);
  });

  it('renders exactly one primary CTA (design §3.4)', () => {
    render(<UpgradeWall returnTo={{ chapter: 3 }} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2); // primary CTA + back-to-chapter link
    const primaryCandidates = links.filter((link) => link.className.includes('bg-purple'));
    expect(primaryCandidates).toHaveLength(1);
    expect(primaryCandidates[0]).toHaveAttribute('href', '/pricing');
  });

  it('has no continue or dismiss button — this is a hard boundary, not a nudge', () => {
    render(<UpgradeWall returnTo={{ chapter: 3 }} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('contains no emoji in rendered output', () => {
    const { container } = render(<UpgradeWall returnTo={{ chapter: 3 }} />);
    const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emojiPattern.test(container.textContent ?? '')).toBe(false);
  });
});
