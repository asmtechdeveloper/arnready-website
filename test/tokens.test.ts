import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { colors } from '@/styles/tokens';

/**
 * Pins src/styles/tokens.ts's colour values against the manual §0.7 locked
 * palette WITHOUT writing any hex literal in this file — the repo-wide
 * check-no-raw-hex.mjs guard scans this file like any other, with no
 * exception (a whole-file exemption previously let unrelated hex literals
 * slip in unnoticed). Changing any locked colour changes this hash, forcing
 * a deliberate update here rather than a silent drift.
 */
const LOCKED_PALETTE_SHA256 = '5227376e18c3c8726d0958bac5d1af3e9c0638b3daa880abc261fcc65a8e95e2';

function hashOf(value: Record<string, string>): string {
  const sorted = Object.fromEntries(Object.keys(value).sort().map((k) => [k, value[k]]));
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

describe('design tokens', () => {
  it('match the locked palette (manual §0.7)', () => {
    expect(hashOf(colors)).toBe(LOCKED_PALETTE_SHA256);
  });

  it('never uses white as the page canvas token', () => {
    expect(colors.bg).not.toBe(colors.white);
  });
});
