import Link from 'next/link';

import { Arnie, type ArnieMood } from '@/components/Arnie';

/**
 * The minimal end-of-run results surface (M5 plan D10, step S7). Shared by the
 * practice, exam and flashcard players so the three completion screens read as
 * one system.
 *
 * DELIBERATELY PRESENTATIONAL, and deliberately entitlement-blind: it takes an
 * already-formatted `headline`/`detail` and never sees `isPaid`, a raw score
 * fraction, or the scoring denominator. Each player computes its own honest
 * figure through the locked `quizEngine` formulas and passes the finished
 * string in — so this file needs no `isPaid` classification and cannot
 * accidentally show a free-vs-paid comparison (manual §1: "Never compare the
 * two on one surface").
 *
 * One Arnie, one primary action — the design system's "one Arnie per surface,
 * one primary CTA" rule. The mood is chosen by the caller but is CALM by
 * intent for S7: score-gated celebration (the app's working/proud/celebrating
 * ladder) is an M7 polish decision, not made here, so an ordinary or low run
 * is never celebrated (design doc §3.2/§3.3, celebration rationing).
 */
export function ResultsCard({
  mood,
  title,
  headline,
  detail,
  action,
}: {
  mood: ArnieMood;
  title: string;
  /** The score/summary line — already formatted by the caller. */
  headline: string;
  /** Optional secondary line (e.g. the completion note the players kept). */
  detail?: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
      <div className="flex flex-col items-center gap-4 rounded-card bg-white p-8 text-center shadow-card sm:p-11">
        <Arnie mood={mood} size={120} />
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        <p className="text-2xl font-extrabold text-purple">{headline}</p>
        {detail && <p className="text-[0.95rem] leading-6 text-muted">{detail}</p>}

        <Link
          href={action.href}
          className="mt-2 flex min-h-11 items-center justify-center rounded-pill bg-purple px-6 text-base font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark"
        >
          {action.label}
        </Link>
      </div>
    </div>
  );
}
