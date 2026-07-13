import Image from 'next/image';
import { arnieAlts } from '@/lib/copy';

/**
 * Shared Arnie image component — one static PNG per surface (design system:
 * "Arnie is a PANDA (never 'red panda'), static PNGs, one per surface,
 * celebrations only on earned moments"). Never render more than one Arnie
 * scene per page. Alt text lives in the central copy module.
 */
const FILES = {
  waving: 'waving.png',
  thinking: 'thinking.png',
  working: 'working.png',
  celebrating: 'celebrating.png',
  proud: 'proud.png',
  meditating: 'meditating.png',
  reading: 'reading.png',
  dozing: 'dozing.png',
  warns: 'warns.png',
  breathe: 'breathe.png',
  'checks-in': 'checks-in.png',
  'makes-it-stick': 'makes-it-stick.png',
  'works-it-out': 'works-it-out.png',
  'setting-the-scene': 'setting-the-scene.png',
} as const;

export type ArnieMood = keyof typeof FILES;

export function Arnie({
  mood,
  size = 160,
  className,
  priority = false,
}: {
  mood: ArnieMood;
  size?: number;
  className?: string;
  /** Set true only for an above-the-fold hero Arnie (e.g. the homepage). */
  priority?: boolean;
}) {
  return (
    <Image
      src={`/arnie/${FILES[mood]}`}
      alt={arnieAlts[mood]}
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
