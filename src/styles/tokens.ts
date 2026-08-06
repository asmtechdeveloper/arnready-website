/**
 * Design tokens — the ONLY file in this repo allowed to contain raw hex
 * colour values (CLAUDE.md §"Design system", manual §0.7). Every component,
 * every Tailwind class, every CSS file must reference these tokens (via
 * `tailwind.config.ts`'s generated utility classes) rather than hardcode a
 * hex value. Enforced by `scripts/check-no-raw-hex.mjs`.
 */
export const colors = {
  purple: '#534AB7',
  purpleDark: '#443C99',
  purpleSoft: '#EEEDF8',
  green: '#1D9E75',
  greenSoft: '#E4F4EE',
  bg: '#F5F5F0',
  amber: '#F59E0B',
  red: '#EF4444',
  ink: '#1A1A2E',
  // Darkened from the original #6B7280 (4.42:1 on bg) to clear WCAG AA's
  // 4.5:1 minimum for normal text — this token carries body copy and the
  // footer disclaimer (design doc §9).
  muted: '#5B6472',
  line: '#E5E7EB',
  white: '#FFFFFF',
} as const;

/**
 * Mock palette "visited, not answered" colours (M6) — mirrored from the app's
 * ../ARNReady-App/screens/MockTestScreen.js: cell background '#E0F2FE'
 * (gridBg, line 40), cell text '#0369A1' (gridFg, line 47), legend swatch
 * '#7DD3FC' (legend row, line 475). They exist only for the mock question
 * palette; they are deliberately NOT part of the locked §0.7 brand palette
 * (test/tokens.test.ts pins `colors` alone), and this file remains the one
 * permitted hex location (scripts/check-no-raw-hex.mjs).
 */
export const paletteVisited = {
  bg: '#E0F2FE',
  fg: '#0369A1',
  legend: '#7DD3FC',
} as const;

export const radii = {
  card: '20px',
  pill: '9999px',
  control: '12px',
} as const;

export const shadows = {
  card: '0 2px 16px rgba(26, 26, 46, 0.07)',
} as const;

export const spacing = {
  gutterMobile: '16px',
  gutterDesktop: '24px',
  sectionGapPublic: '72px',
  sectionGapProduct: '40px',
} as const;

export const maxWidth = {
  content: '1152px',
  reading: '720px',
} as const;
