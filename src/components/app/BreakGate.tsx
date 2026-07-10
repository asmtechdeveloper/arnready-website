'use client';

/**
 * The web equivalent of the app's rewarded-ad gate at Q11/Q16.
 * WORKING default (10 Jul, flagged to Anusha): a timed break with an ad
 * slot placeholder — the gate ORDER is locked, only the surface inside is
 * swappable. Renders nothing until entitlement is known (locked ad rule).
 */
import { useEffect, useState } from 'react';
import Arnie from '@/components/Arnie';
import { Coffee } from '@/components/Icon';
import { CONFIG } from '@/lib/config';

export default function BreakGate({
  questionNumber,
  message,
  continueLabel,
  onContinue,
}: {
  /** 1-based number of the question this gate unlocks (11 or 16). */
  questionNumber?: number;
  /** Override body copy (e.g. the flashcard deck's gate). */
  message?: string;
  continueLabel?: string;
  onContinue: () => void;
}) {
  const [remaining, setRemaining] = useState(CONFIG.BREAK_GATE_SECONDS);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="rounded-card bg-white p-10 shadow-card">
        <Arnie mood="meditating" size={140} className="mx-auto" />
        <h2 className="mt-6 flex items-center justify-center gap-2 text-2xl font-black text-ink">
          <Coffee size={22} className="text-purple" />
          Quick breather
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {message ??
            `You've earned questions ${questionNumber}–${(questionNumber ?? 0) + 4}. Take a moment — the next set unlocks in a few seconds.`}
        </p>

        {/* Ad slot placeholder — the web rewarded-ad format is an open
            Web-1 item. The gate order (Q11/Q16) is LOCKED regardless. */}
        <div
          className="mt-6 flex h-32 items-center justify-center rounded-xl border border-dashed border-line bg-cream text-xs font-bold text-muted"
          aria-hidden
        >
          Ad
        </div>

        <button
          type="button"
          disabled={remaining > 0}
          onClick={onContinue}
          className={`mt-6 w-full rounded-full px-8 py-3 text-sm font-black transition-colors ${
            remaining > 0
              ? 'cursor-not-allowed bg-line text-muted'
              : 'bg-purple text-white hover:bg-purple-dark'
          }`}
        >
          {remaining > 0
            ? `Continue in ${remaining}…`
            : (continueLabel ?? `Continue to question ${questionNumber}`)}
        </button>
      </div>
    </div>
  );
}
