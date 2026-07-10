/**
 * The ONLY Arnie renderer on the web — mirrors the app's ArnieScene rules:
 * one Arnie per surface, hidden from screen readers, celebrations rationed
 * to real earned moments. Arnie is a PANDA.
 */
import Image from 'next/image';

export const ARNIE_MOODS = {
  waving: '/arnie/arnie_waving.png',
  reading: '/arnie/arnie_reading.png',
  working: '/arnie/arnie_working.png',
  thinking: '/arnie/arnie_thinking.png',
  proud: '/arnie/arnie_proud.png',
  celebrating: '/arnie/arnie_celebrating.png',
  meditating: '/arnie/arnie_meditating.png',
  dozing: '/arnie/arnie_dozing.png',
} as const;

export type ArnieMood = keyof typeof ARNIE_MOODS;

/** Results-screen mood by score percentage — mirrors app CONFIG.RESULTS_ARNIE. */
export function arnieForScore(pct: number): ArnieMood {
  if (pct <= 39) return 'working';
  if (pct <= 75) return 'proud';
  return 'celebrating';
}

export default function Arnie({
  mood,
  size = 160,
  className = '',
  priority = false,
}: {
  mood: ArnieMood;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={ARNIE_MOODS[mood]}
      alt=""
      aria-hidden
      width={size}
      height={size}
      priority={priority}
      className={`select-none ${className}`}
    />
  );
}
