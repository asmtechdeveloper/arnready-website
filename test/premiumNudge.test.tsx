import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PremiumNudge } from '@/components/PremiumNudge';
import { arnieAlts, nudge } from '@/lib/copy';

/**
 * M2 plan S3 / D8–D11: <PremiumNudge> renders exactly one Arnie (mood pinned
 * per variant), the surface's copy from copy.ts (never hardcoded prose), a
 * one-tap continue action, and the dual CTA (Get the app link + informational
 * "web checkout coming soon" text). No emoji anywhere (design system).
 */
describe('PremiumNudge', () => {
  it('practice variant: correct Arnie mood, title, and body', () => {
    render(<PremiumNudge variant="practice" onContinue={() => {}} />);
    expect(screen.getByAltText(arnieAlts['checks-in'])).toBeInTheDocument();
    expect(screen.getByText(nudge.practice.title)).toBeInTheDocument();
    expect(screen.getByText(nudge.practice.body)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: nudge.practice.continue })).toBeInTheDocument();
  });

  it('exam variant: correct Arnie mood, title, and body', () => {
    render(<PremiumNudge variant="exam" onContinue={() => {}} />);
    expect(screen.getByAltText(arnieAlts['setting-the-scene'])).toBeInTheDocument();
    expect(screen.getByText(nudge.exam.title)).toBeInTheDocument();
    expect(screen.getByText(nudge.exam.body)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: nudge.exam.continue })).toBeInTheDocument();
  });

  it('flashcard variant: correct Arnie mood and continue label', () => {
    render(<PremiumNudge variant="flashcard" onContinue={() => {}} />);
    expect(screen.getByAltText(arnieAlts['makes-it-stick'])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: nudge.flashcard.continue })).toBeInTheDocument();
  });

  it.each([0, 1, 2] as const)('flashcard rotation %i shows variants[%i]', (i) => {
    const expected = nudge.flashcard.variants[i];
    if (!expected) throw new Error(`fixture missing flashcard variant ${i}`);
    render(<PremiumNudge variant="flashcard" onContinue={() => {}} rotation={i} />);
    expect(screen.getByText(expected.title)).toBeInTheDocument();
    expect(screen.getByText(expected.body)).toBeInTheDocument();
  });

  it('flashcard defaults to variants[0] when rotation is omitted', () => {
    const expected = nudge.flashcard.variants[0];
    if (!expected) throw new Error('fixture missing flashcard variant 0');
    render(<PremiumNudge variant="flashcard" onContinue={() => {}} />);
    expect(screen.getByText(expected.title)).toBeInTheDocument();
  });

  it('clicking continue calls onContinue exactly once', () => {
    const onContinue = vi.fn();
    render(<PremiumNudge variant="practice" onContinue={onContinue} />);
    screen.getByRole('button', { name: nudge.practice.continue }).click();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders the dual CTA: "Get the app" link and the web-soon informational text', () => {
    render(<PremiumNudge variant="exam" onContinue={() => {}} />);
    const getAppLink = screen.getByRole('link', { name: nudge.getApp.label });
    expect(getAppLink).toHaveAttribute('href', nudge.getApp.href);
    expect(screen.getByText(nudge.webSoon.label)).toBeInTheDocument();
    // Informational text is not itself a button/link (non-interactive).
    expect(screen.queryByRole('button', { name: nudge.webSoon.label })).toBeNull();
    expect(screen.queryByRole('link', { name: nudge.webSoon.label })).toBeNull();
  });

  it('renders exactly one Arnie image per surface', () => {
    render(<PremiumNudge variant="practice" onContinue={() => {}} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('contains no emoji in rendered output', () => {
    const { container } = render(<PremiumNudge variant="flashcard" onContinue={() => {}} rotation={1} />);
    const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emojiPattern.test(container.textContent ?? '')).toBe(false);
  });
});
