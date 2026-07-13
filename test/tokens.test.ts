import { describe, expect, it } from 'vitest';
import { colors } from '@/styles/tokens';

describe('design tokens', () => {
  it('match the locked palette (manual §0.7)', () => {
    expect(colors.purple).toBe('#534AB7');
    expect(colors.green).toBe('#1D9E75');
    expect(colors.bg).toBe('#F5F5F0');
    expect(colors.amber).toBe('#F59E0B');
    expect(colors.red).toBe('#EF4444');
  });

  it('never uses white as the page canvas token', () => {
    expect(colors.bg).not.toBe(colors.white);
  });
});
