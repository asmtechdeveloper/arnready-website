import { describe, expect, it } from 'vitest';
import { PATHS } from '@/components/Icon';

/**
 * Pins every icon's combined `d` string against the official Feather
 * Icons project geometry (github.com/feathericons/feather/tree/main/icons),
 * converting each icon's original <line>/<polyline>/<circle> primitives
 * into an equivalent path segment. Comments show the official primitives
 * each expected value was derived from, so a reviewer can verify by hand.
 */
describe('Icon PATHS pin exact official Feather geometry', () => {
  it('menu — <line x1=3 y1=12 x2=21 y2=12/><line x1=3 y1=6 x2=21 y2=6/><line x1=3 y1=18 x2=21 y2=18/>', () => {
    expect(PATHS.menu).toBe('M3 12h18M3 6h18M3 18h18');
  });

  it('x — <line x1=18 y1=6 x2=6 y2=18/><line x1=6 y1=6 x2=18 y2=18/>', () => {
    expect(PATHS.x).toBe('M18 6 6 18M6 6l12 12');
  });

  it('arrow-right — <line x1=5 y1=12 x2=19 y2=12/><polyline points="12 5 19 12 12 19"/>', () => {
    expect(PATHS['arrow-right']).toBe('M5 12h14M12 5l7 7-7 7');
  });

  it('chevron-right — <polyline points="9 18 15 12 9 6"/>', () => {
    expect(PATHS['chevron-right']).toBe('M9 18l6-6-6-6');
  });

  it('mail — rounded-rect path + <polyline points="22,6 12,13 2,6"/>', () => {
    expect(PATHS.mail).toBe(
      'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6L12 13L2 6',
    );
  });

  it('check — <polyline points="20 6 9 17 4 12"/>', () => {
    expect(PATHS.check).toBe('M20 6 9 17l-5-5');
  });

  it('check-circle — <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', () => {
    expect(PATHS['check-circle']).toBe('M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01L9 11.01');
  });

  it('lock — <rect x=3 y=11 width=18 height=11 rx=2 ry=2/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', () => {
    expect(PATHS.lock).toBe(
      'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
    );
  });

  it('award — <circle cx=12 cy=8 r=7/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>', () => {
    expect(PATHS.award).toBe('M5 8a7 7 0 1 0 14 0a7 7 0 1 0-14 0M8.21 13.89L7 23L12 20L17 23L15.79 13.88');
  });

  // ── M3 additions (auth surfaces) ──────────────────────────────────────
  it('log-in — <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1=15 y1=12 x2=3 y2=12/>', () => {
    expect(PATHS['log-in']).toBe('M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3');
  });

  it('log-out — <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1=21 y1=12 x2=9 y2=12/>', () => {
    expect(PATHS['log-out']).toBe('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9');
  });

  it('user — <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx=12 cy=7 r=4/>', () => {
    expect(PATHS.user).toBe('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0a4 4 0 1 1 8 0');
  });
});
