import type { SVGProps } from 'react';

/**
 * Feather icon set (design system: "Feather icons only", CLAUDE.md
 * §"Design system"). Outlines are the Feather Icons project's own paths,
 * inlined (rather than installing the npm package) to avoid a new
 * dependency for a handful of glyphs — a manual §0.10 stop condition.
 * Multi-primitive icons (mail, lock, award, check-circle) are converted to
 * a single combined `d` string (SVG paths may hold multiple unconnected
 * subpaths) so the renderer below only needs one <path> element. Pinned
 * against the official geometry by test/icon-paths.test.ts.
 *
 * Feather Icons — MIT License. Copyright (c) 2013-2023 Cole Bemis. Full
 * licence text in /THIRD_PARTY_NOTICES.md.
 * https://github.com/feathericons/feather
 */
export const PATHS = {
  menu: 'M3 12h18M3 6h18M3 18h18',
  x: 'M18 6 6 18M6 6l12 12',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  'chevron-right': 'M9 18l6-6-6-6',
  mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6L12 13L2 6',
  check: 'M20 6 9 17l-5-5',
  'check-circle': 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01L9 11.01',
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
  award: 'M5 8a7 7 0 1 0 14 0a7 7 0 1 0-14 0M8.21 13.89L7 23L12 20L17 23L15.79 13.88',
  'log-in': 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0a4 4 0 1 1 8 0',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  ...props
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
