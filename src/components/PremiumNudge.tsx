import { Arnie } from '@/components/Arnie';
import { nudge } from '@/lib/copy';

export type PremiumNudgeVariant = 'practice' | 'exam' | 'flashcard';

/**
 * Nudge-law surface (manual §1): pitches what premium ADDS, never relief
 * from the nudge itself. Renders exactly one Arnie (mood pinned per variant,
 * plan D8), the surface's title/body from `copy.nudge[variant]`, a one-tap
 * "continue" primary action, and the dual CTA (D9: "Get the app" link +
 * "Web checkout — coming soon" informational text). No timer, no effect, no
 * auto-dismiss (D10c) — this component only ever renders because a parent
 * gate decided to render it; it never schedules its own appearance or exit.
 */
export function PremiumNudge({
  variant,
  onContinue,
  rotation = 0,
}: {
  variant: PremiumNudgeVariant;
  onContinue: () => void;
  /** Flashcard nudges rotate through three distinct copy variants (15/30/45 reveals). */
  rotation?: number;
}) {
  // `variants` is a fixed 3-entry literal (copy.ts §3) — index 0 always exists,
  // so the fallback below is a real guarantee, not just satisfying the
  // `noUncheckedIndexedAccess` compiler check for an out-of-range `rotation`.
  const content =
    variant === 'flashcard'
      ? (nudge.flashcard.variants[rotation] ?? nudge.flashcard.variants[0]!)
      : nudge[variant];
  const mood = variant === 'flashcard' ? nudge.flashcard.mood : nudge[variant].mood;
  const continueLabel = variant === 'flashcard' ? nudge.flashcard.continue : nudge[variant].continue;

  return (
    <div className="rounded-card bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <Arnie mood={mood} size={120} />
        <h2 className="text-xl font-bold text-ink">{content.title}</h2>
        <p className="text-[0.95rem] leading-6 text-muted">{content.body}</p>

        <button
          type="button"
          onClick={onContinue}
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-pill bg-purple px-6 text-base font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark active:bg-purple-dark disabled:cursor-not-allowed disabled:bg-purple/40 sm:w-auto"
        >
          {continueLabel}
        </button>

        <div className="mt-4 flex flex-col items-center gap-2 border-t border-line pt-4 text-sm">
          <a
            href={nudge.getApp.href}
            className="flex min-h-11 items-center font-semibold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
          >
            {nudge.getApp.label}
          </a>
          <p className="text-muted">{nudge.webSoon.label}</p>
        </div>
      </div>
    </div>
  );
}
