import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { colors } from '@/styles/tokens';

/**
 * canvasBackground.test.ts — pins the ACTUAL locked background rule
 * (manual §0.7 "never white" for the background; design doc §4.1): the page
 * CANVAS is the cream `bg` token and is never white. White is explicitly
 * allowed for cards and contained surfaces (design doc §4.1: "White is
 * allowed for cards and contained surfaces, not as the page canvas") — which
 * is how every signed-off M0/M1 card renders (`rounded-card bg-white
 * shadow-card`). This test guards the rule that genuinely matters — a white
 * page canvas — without banning the sanctioned white-card pattern. The exact
 * `bg` token value is separately checksum-pinned by `test/tokens.test.ts`;
 * this file deliberately holds no raw hex literal (the raw-hex guard forbids
 * them outside `src/styles/tokens.ts`).
 */

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const GLOBALS_CSS = readFileSync(path.join(REPO_ROOT, 'src/app/globals.css'), 'utf8');
const LAYOUT = readFileSync(path.join(REPO_ROOT, 'src/app/layout.tsx'), 'utf8');

describe('page canvas background rule (never white)', () => {
  it('the cream `bg` canvas token is distinct from white', () => {
    expect(colors.bg).not.toBe(colors.white);
  });

  it('globals.css applies the `bg-bg` cream token to the body canvas, not white', () => {
    const bodyRule = GLOBALS_CSS.match(/body\s*\{[^}]*\}/s)?.[0] ?? '';
    expect(bodyRule).toContain('bg-bg');
    expect(bodyRule).not.toMatch(/\bbg-white\b/);
  });

  it('the root layout <body> does not paint the canvas white', () => {
    const bodyTag = LAYOUT.match(/<body[^>]*>/s)?.[0] ?? '';
    expect(bodyTag).not.toMatch(/\bbg-white\b/);
  });
});
