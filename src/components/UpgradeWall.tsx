import Link from 'next/link';
import { Arnie } from '@/components/Arnie';
import { upgradeWall } from '@/lib/copy';

/**
 * The Q21+ free-cap wall (plan D2/S4) — a HARD boundary, not a nudge. Free
 * practice genuinely ends at 20 questions per chapter, so unlike
 * `<PremiumNudge>` this surface has no "continue" or dismiss affordance:
 * only the one primary CTA to `/pricing` and a way back to the chapter hub.
 * Renders exactly one Arnie (mood `proud`, plan D8). The footer disclaimer
 * lives in the shared layout, not here.
 */
export function UpgradeWall({ returnTo }: { returnTo: { chapter: number } }) {
  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      <div className="flex flex-col items-center gap-4 rounded-card bg-white p-8 text-center shadow-card sm:p-11">
        <Arnie mood="proud" size={120} />
        <h1 className="text-xl font-bold text-ink">{upgradeWall.title}</h1>
        <p className="text-[0.95rem] leading-6 text-muted">{upgradeWall.body}</p>

        <Link
          href={upgradeWall.primaryCta.href}
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-pill bg-purple px-6 text-base font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark active:bg-purple-dark sm:w-auto"
        >
          {upgradeWall.primaryCta.label}
        </Link>

        <div className="mt-4 w-full border-t border-line pt-4">
          <Link
            href={`/chapters/${returnTo.chapter}`}
            className="flex min-h-11 items-center justify-center font-semibold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
          >
            {upgradeWall.backToChapter}
          </Link>
        </div>
      </div>
    </div>
  );
}
