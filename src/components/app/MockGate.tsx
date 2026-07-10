'use client';

/**
 * Pre-mock gate. LOCKED rules enforced here:
 * - Sign-in is REQUIRED for the mock — the one-free-mock-EVER counter lives
 *   on users/{uid}.mockHistory and is shared with the app; an unsigned
 *   visitor taking a mock would break the cross-platform counter.
 * - Free accounts: eligible only with an EMPTY mockHistory (app or web
 *   attempts both count). Paid: unlimited.
 * - Attempts are recorded on SUBMIT only, so eligibility is re-checked
 *   every time the player exits.
 * Free pool is build-time-exported free content (props) — every chapter
 * weight ≤ 20 free questions, so the full 100Q mock assembles from it.
 */
import { useCallback, useEffect, useState } from 'react';
import Arnie from '@/components/Arnie';
import MockPlayer from '@/components/app/MockPlayer';
import Paywall from '@/components/app/Paywall';
import SignInButton from '@/components/app/SignInButton';
import { CONFIG } from '@/lib/config';
import { canTakeMock } from '@/lib/mockService';
import { loadFullPool } from '@/lib/questionService';
import { assembleMock, type Question } from '@/lib/quizEngine';
import { useAuth, useEntitlement } from '@/lib/stores';

export default function MockGate({ freePool }: { freePool: Question[] }) {
  const { user, ready } = useAuth();
  const ent = useEntitlement();
  const settled = ready && (!user || ent.known);
  const isPaid = Boolean(user) && ent.isPaid;

  const [eligible, setEligible] = useState<boolean | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [building, setBuilding] = useState(false);

  const checkEligibility = useCallback(() => {
    setEligible(null);
    canTakeMock(isPaid).then(setEligible);
  }, [isPaid]);

  useEffect(() => {
    if (settled && user) checkEligibility();
  }, [settled, user, checkEligibility]);

  async function start() {
    setBuilding(true);
    let pool = freePool;
    if (isPaid) {
      const full = await loadFullPool();
      if (full.length > 0) pool = full;
    }
    setQuestions(assembleMock(pool, CONFIG.MOCK_CHAPTER_WEIGHTS));
    setBuilding(false);
  }

  if (questions) {
    return (
      <MockPlayer
        questions={questions}
        onExit={() => {
          setQuestions(null);
          checkEligibility();
        }}
      />
    );
  }

  if (!settled || (user && eligible === null)) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <Arnie mood="working" size={120} className="mx-auto" />
          <p className="mt-4 text-sm font-bold text-muted">One moment…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-card bg-white p-10 shadow-card">
          <Arnie mood="thinking" size={140} className="mx-auto" />
          <h1 className="mt-6 text-2xl font-black text-ink">
            The mock needs you signed in
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Everything else here works without an account — but your free mock
            is one per person, ever, shared between this site and the app. That
            promise only works if we know it&apos;s you. Sign in with Google
            and it takes ten seconds.
          </p>
          <div className="mt-6 flex justify-center">
            <SignInButton label="Sign in with Google" />
          </div>
          <p className="mt-4 text-xs text-muted">
            Not ready? Practice and flashcards stay open — no account needed.
          </p>
        </div>
      </div>
    );
  }

  if (!eligible) {
    return (
      <Paywall
        heading="You've used your free mock"
        sub="One free full mock per person, ever — app or web, it's the same counter. Unlock ARNReady for unlimited mocks with fresh questions every attempt."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-card bg-white p-8 shadow-card sm:p-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Arnie mood="reading" size={130} className="shrink-0" />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-black text-ink">The full mock</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {CONFIG.MOCK_QUESTIONS} questions in the official chapter
              weightage, {CONFIG.MOCK_DURATION_MIN} minutes on the clock. As
              close to the real thing as a browser gets.
            </p>
          </div>
        </div>

        <ul className="mt-8 space-y-3">
          {[
            `${CONFIG.MOCK_QUESTIONS} questions, ${CONFIG.MOCK_DURATION_MIN} minutes, auto-submits at 0:00.`,
            'No negative marking — an unanswered question is just a zero.',
            'Flag anything you want to revisit; the palette tracks it all.',
            'Keyboard works throughout: A–D or 1–4 to answer, arrows to move, F to flag.',
            'Your attempt is recorded only when you SUBMIT. Close the tab mid-mock and nothing is saved — and your free mock is not used up.',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-sm font-bold text-ink">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple" />
              {t}
            </li>
          ))}
        </ul>

        {!isPaid && (
          <p className="mt-6 rounded-xl bg-amber-soft p-4 text-sm font-bold text-amber">
            This is your one free mock — ever, across app and web. Take it when
            you can give it the full two hours.
          </p>
        )}

        <div className="mt-8 text-center sm:text-left">
          <button
            type="button"
            onClick={start}
            disabled={building}
            className="rounded-full bg-purple px-8 py-3 text-sm font-black text-white transition-colors hover:bg-purple-dark disabled:opacity-60"
          >
            {building ? 'Assembling your paper…' : 'Start the mock'}
          </button>
        </div>
      </div>
    </div>
  );
}
