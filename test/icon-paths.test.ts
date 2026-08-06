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

  // ── M6 additions (mock player) ────────────────────────────────────────
  it('arrow-left — <line x1=19 y1=12 x2=5 y2=12/><polyline points="12 19 5 12 12 5"/>', () => {
    expect(PATHS['arrow-left']).toBe('M19 12H5M12 19l-7-7 7-7');
  });

  it('clock — <circle cx=12 cy=12 r=10/><polyline points="12 6 12 12 16 14"/>', () => {
    expect(PATHS.clock).toBe('M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0M12 6L12 12L16 14');
  });

  it('flag — <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1=4 y1=22 x2=4 y2=15/>', () => {
    expect(PATHS.flag).toBe('M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22V15');
  });

  // ── M6 additions (mock pre-start surface) ─────────────────────────────
  it('monitor — <rect x=2 y=3 width=20 height=14 rx=2 ry=2/><line x1=8 y1=21 x2=16 y2=21/><line x1=12 y1=17 x2=12 y2=21/>', () => {
    expect(PATHS.monitor).toBe(
      'M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 21h8M12 17v4',
    );
  });

  // ── M6 additions (mock results) ───────────────────────────────────────
  it('target — <circle cx=12 cy=12 r=10/><circle cx=12 cy=12 r=6/><circle cx=12 cy=12 r=2/>', () => {
    expect(PATHS.target).toBe(
      'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0M6 12a6 6 0 1 0 12 0a6 6 0 1 0-12 0M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
    );
  });

  it('trending-up — <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>', () => {
    expect(PATHS['trending-up']).toBe('M23 6l-9.5 9.5-5-5L1 18M17 6h6v6');
  });

  it('trending-down — <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>', () => {
    expect(PATHS['trending-down']).toBe('M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6');
  });

  it('bar-chart-2 — <line x1=18 y1=20 x2=18 y2=10/><line x1=12 y1=20 x2=12 y2=4/><line x1=6 y1=20 x2=6 y2=14/>', () => {
    expect(PATHS['bar-chart-2']).toBe('M18 20V10M12 20V4M6 20v-6');
  });

  it('repeat — <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>', () => {
    expect(PATHS.repeat).toBe(
      'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
    );
  });

  it('chevron-up — <polyline points="18 15 12 9 6 15"/>', () => {
    expect(PATHS['chevron-up']).toBe('M18 15l-6-6-6 6');
  });

  it('chevron-down — <polyline points="6 9 12 15 18 9"/>', () => {
    expect(PATHS['chevron-down']).toBe('M6 9l6 6 6-6');
  });

  it('alert-triangle — <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1=12 y1=9 x2=12 y2=13/><line x1=12 y1=17 x2=12.01 y2=17/>', () => {
    expect(PATHS['alert-triangle']).toBe(
      'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    );
  });
});
