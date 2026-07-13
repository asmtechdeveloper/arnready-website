import type { SVGProps } from 'react';

/**
 * Feather-style icon set (design system: "Feather icons only", CLAUDE.md
 * §"Design system"). Paths are the Feather Icons project's own outlines
 * (ISC licence), inlined to avoid adding an npm dependency for a handful of
 * glyphs — a new dependency is a manual §0.10 stop condition.
 */
const PATHS = {
  menu: 'M3 12h18M3 6h18M3 18h18',
  x: 'M18 6 6 18M6 6l12 12',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  'chevron-right': 'M9 18l6-6-6-6',
  mail: 'M4 4h16v16H4zM22 6l-10 7L2 6',
  check: 'M20 6 9 17l-5-5',
  'check-circle': 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2ZM7 11V7a5 5 0 0 1 10 0v4',
  award:
    'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM8.21 13.89 7 23l5-3 5 3-1.21-9.12',
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
