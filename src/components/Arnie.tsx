import Image from 'next/image';

/**
 * Shared Arnie image component — one static PNG per surface (design system:
 * "Arnie is a PANDA (never 'red panda'), static PNGs, one per surface,
 * celebrations only on earned moments"). Never render more than one Arnie
 * scene per page.
 */
const SCENES = {
  waving: { file: 'waving.png', alt: 'Arnie the panda waving hello' },
  thinking: { file: 'thinking.png', alt: 'Arnie the panda thinking' },
  working: { file: 'working.png', alt: 'Arnie the panda studying at a desk' },
  celebrating: { file: 'celebrating.png', alt: 'Arnie the panda celebrating' },
  proud: { file: 'proud.png', alt: 'Arnie the panda looking proud' },
  meditating: { file: 'meditating.png', alt: 'Arnie the panda meditating, calm' },
  reading: { file: 'reading.png', alt: 'Arnie the panda reading' },
  dozing: { file: 'dozing.png', alt: 'Arnie the panda dozing off' },
  warns: { file: 'warns.png', alt: 'Arnie the panda giving a gentle warning' },
  breathe: { file: 'breathe.png', alt: 'Arnie the panda taking a calming breath' },
  'checks-in': { file: 'checks-in.png', alt: 'Arnie the panda checking in' },
  'makes-it-stick': { file: 'makes-it-stick.png', alt: 'Arnie the panda making a concept stick' },
  'works-it-out': { file: 'works-it-out.png', alt: 'Arnie the panda working out a problem' },
  'setting-the-scene': { file: 'setting-the-scene.png', alt: 'Arnie the panda setting the scene' },
} as const;

export type ArnieMood = keyof typeof SCENES;

export function Arnie({
  mood,
  size = 160,
  className,
}: {
  mood: ArnieMood;
  size?: number;
  className?: string;
}) {
  const scene = SCENES[mood];
  return (
    <Image
      src={`/arnie/${scene.file}`}
      alt={scene.alt}
      width={size}
      height={size}
      className={className}
      priority={false}
    />
  );
}
