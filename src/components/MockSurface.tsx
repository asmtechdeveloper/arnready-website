'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { appShell, mockSurface as copy } from '@/lib/copy';
import { useAuth } from '@/lib/authStore';
import { useEntitlement } from '@/lib/entitlementStore';
import { ensureUserDocument } from '@/lib/ensureUserDocument';
import { isFirebaseConfigured } from '@/lib/firebaseClient';
import { MOCK_CHAPTER_WEIGHTS, MOCK_DURATION_MIN, MOCK_QUESTIONS } from '@/lib/mockConfig';
import { canTakeMock, getMockHistory, type MockHistoryEntry } from '@/lib/mockService';
import { firestoreBackend } from '@/lib/progressBackend';
import { fetchMockQuestions } from '@/lib/questionDelivery';
import { assembleMock, type Question } from '@/lib/quizEngine';
import { Arnie } from '@/components/Arnie';
import { Icon } from '@/components/Icon';
import { MockPlayer } from '@/components/MockPlayer';
import { SignInButton } from '@/components/SignInButton';

/**
 * `/app/mock` client surface (M6) — the web PreMockScreen, ported from
 * ../ARNReady-App/screens/PreMockScreen.js. The mock has no chapter param,
 * so `StudySurface` (chapter-shaped) does not fit; the auth/loading/error
 * chrome below mirrors its states with the same components and copy.
 *
 * The check sequence, on mount and on every Retry:
 *
 *   0. WAIT for entitlement to be KNOWN (M6-B1). The store deliberately
 *      starts `{ isPaid: false, known: false }`, so an ungated read of
 *      `isPaid` reports "free" for every user during the window before the
 *      listener settles. Acting on that is unrecoverable HERE in a way it is
 *      not on the M5 surfaces (whose `load` re-runs when entitlement
 *      changes): a paid user could press Start in that window and sit a
 *      120-minute paper drawn from the FREE pool, with the free premium
 *      pitch on its results. So no eligibility read is issued and no Start
 *      control is rendered until `known` is true.
 *   1. `await ensureUserDocument()` — AWAITED, unlike AuthProvider's
 *      fire-and-forget: a free user must never start a 120-minute mock
 *      whose submit write the deployed rules would refuse because
 *      `users/{uid}` is absent. 'error'/'unavailable' → the error state.
 *   2. `canTakeMock` + `getMockHistory` through the ProgressBackend seam.
 *      `canTakeMock` deliberately THROWS on a failed read (ScreenState
 *      policy §3): a failed eligibility check must show the error surface —
 *      NEVER the used-mock paywall pitch it would default to.
 *
 * ONE SETTLED ENTITLEMENT SNAPSHOT drives one attempt (M6-B1): the settled
 * check records the `isPaid` it was computed under, a check whose snapshot
 * no longer matches the store is not `current` (so a live grant/revoke
 * re-checks rather than rendering a stale tier), and `start()` binds that
 * snapshot for the pool fetch — a listener update landing mid-start can
 * never change the paper a run was begun on.
 *
 * The app refreshes eligibility/history on screen FOCUS (PreMock is a tab
 * root); the web equivalent is re-running the check when `MockPlayer` exits
 * back to this surface, so a just-submitted attempt is reflected at once.
 *
 * NO nudge machinery renders here — PremiumNudge/UpgradeWall stay
 * unimported. The used-mock pitch is plain surface copy under the nudge
 * law: it pitches what premium ADDS, never relief from the limit.
 */

const wrapper = 'mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop';
const card = 'rounded-card bg-white p-8 text-center shadow-card sm:p-11';
const primaryLink =
  'inline-flex min-h-11 items-center rounded-pill bg-purple px-6 text-sm font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark';

/** en-IN short date, ported from PreMockScreen.js `formatDate`. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** The settled outcome of one eligibility check, tagged with the attempt it
 * answers AND the settled entitlement snapshot it was computed under — a
 * stale result is never mistaken for the current one (the same discipline as
 * `StudySurface`'s `SettledResult`, extended for entitlement per M6-B1). */
type SettledCheck = { attempt: number; paidSnapshot: boolean } & (
  | { status: 'eligible'; history: MockHistoryEntry[] }
  | { status: 'used'; history: MockHistoryEntry[] }
  | { status: 'error' }
);

/** The paper lifecycle after Start — kept SEPARATE from the eligibility
 * check so a late entitlement snapshot re-running the check effect can
 * never clobber a live run. */
type PaperState =
  | { status: 'assembling' }
  | { status: 'error' }
  | { status: 'running'; questions: Question[] };

export function MockSurface() {
  const user = useAuth((s) => s.user);
  // `known` is read, not just `isPaid` (M6-B1): see the header — an unknown
  // entitlement must never be treated as "free" on this surface.
  const { isPaid, known } = useEntitlement();

  const [attempt, setAttempt] = useState(0);
  const [check, setCheck] = useState<SettledCheck | null>(null);
  const [paper, setPaper] = useState<PaperState | null>(null);

  // Retry / exit both return to the 'checking' phase and re-run the
  // eligibility check (the web equivalent of the app's focus refresh).
  const recheck = () => {
    setPaper(null);
    setAttempt((a) => a + 1);
  };

  useEffect(() => {
    // Step 0 — entitlement must be SETTLED before the tier is used at all
    // (M6-B1). No read is issued while `known` is false; the surface holds
    // its loading state below.
    if (user == null || !known) return;
    // The snapshot this whole attempt is computed under — captured once here
    // so the check, its render, and `start()` cannot disagree.
    const paidSnapshot = isPaid;
    let cancelled = false;
    (async (): Promise<SettledCheck | null> => {
      // Step 1 — the AWAITED user-document gate (see the header comment):
      // on 'error'/'unavailable' the surface must show the error state, never
      // a silent "eligible" whose submit write the rules would refuse.
      const ensured = await ensureUserDocument();
      if (ensured === 'signed-out') return null; // the signed-out card takes over
      if (ensured !== 'ensured') return { attempt, paidSnapshot, status: 'error' };

      const backend = firestoreBackend();
      if (!backend) return { attempt, paidSnapshot, status: 'error' };

      // Step 2 — eligibility + history. `canTakeMock` THROWS on a failed
      // read (ScreenState policy §3): the catch below maps it to the error
      // state — NEVER the used-mock pitch. Paid users short-circuit true
      // inside the service without a read. `getMockHistory` degrades to [].
      const [eligible, history] = await Promise.all([
        canTakeMock(backend, paidSnapshot),
        getMockHistory(backend),
      ]);
      // Newest first — the app reverses the stored order ("how am I
      // trending lately", PreMockScreen.js:44-45).
      const newestFirst = [...history].reverse();
      return {
        attempt,
        paidSnapshot,
        status: eligible ? 'eligible' : 'used',
        history: newestFirst,
      };
    })()
      .catch((): SettledCheck => ({ attempt, paidSnapshot, status: 'error' }))
      .then((outcome) => {
        if (!cancelled && outcome !== null) setCheck(outcome);
      });
    return () => {
      cancelled = true;
    };
  }, [user, known, isPaid, attempt]);

  // A check answers the current attempt only if its entitlement snapshot still
  // matches the store (M6-B1). A live grant/revoke therefore returns the
  // surface to its loading state while the re-check (triggered by the effect's
  // `isPaid` dependency) settles — never a ready state showing the old tier.
  // `known` is part of the condition, not just the effect guard: a uid switch
  // resets the store to `{ isPaid: false, known: false }` WITHOUT changing
  // `isPaid`, so a snapshot match alone would keep rendering the previous
  // account's settled ready state while the new account's entitlement is
  // still unknown.
  const current =
    known && check !== null && check.attempt === attempt && check.paidSnapshot === isPaid ? check : null;

  /**
   * `paidSnapshot` is the settled tier the pre-start was RENDERED under,
   * bound at click time (M6-B1). The started paper can therefore never be
   * drawn from the wrong pool because a listener update landed between the
   * click and the fetch resolving.
   */
  async function start(paidSnapshot: boolean) {
    setPaper({ status: 'assembling' });
    const result = await fetchMockQuestions(paidSnapshot);
    if (result.status === 'ok') {
      setPaper({
        status: 'running',
        questions: assembleMock(result.questions, MOCK_CHAPTER_WEIGHTS),
      });
    } else {
      setPaper({ status: 'error' });
    }
  }

  // ── Auth chrome — the exact states StudySurface/AppShell already ship ────
  if (!isFirebaseConfigured()) {
    return (
      <div className={wrapper}>
        <div className={card}>
          <h1 className="text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {appShell.unavailable.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">{appShell.unavailable.body}</p>
          <Link href={appShell.unavailable.browse.href} className={`mt-6 ${primaryLink}`}>
            {appShell.unavailable.browse.label}
          </Link>
        </div>
      </div>
    );
  }

  if (user === undefined) {
    return (
      <div className={wrapper}>
        <div className={card} role="status">
          <p className="text-[0.95rem] leading-7 text-muted">{appShell.loading}</p>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className={wrapper}>
        <div className={card}>
          <Arnie mood={appShell.signedOut.mood} size={140} className="mx-auto" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {appShell.signedOut.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">{appShell.signedOut.body}</p>
          <div className="mt-6 flex flex-col items-center gap-4">
            <SignInButton />
            <Link
              href={appShell.signedOut.browseInstead.href}
              className="flex min-h-11 items-center text-sm font-semibold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
            >
              {appShell.signedOut.browseInstead.label}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Paper lifecycle first: a live run is never clobbered by a re-check ───
  // The player's `isPaid` is deliberately the LIVE store value, not the
  // paper's bound snapshot: its only use is the results pitch's visibility,
  // and a user who is paid by the time they see results must never be shown
  // a premium pitch (review protocol §3.7), even if their paper was drawn
  // before the grant landed.
  if (paper?.status === 'running') {
    return <MockPlayer questions={paper.questions} isPaid={isPaid} onExit={recheck} />;
  }

  if (paper?.status === 'assembling') {
    return (
      <div className={wrapper}>
        <div className={card} role="status">
          <p className="text-[0.95rem] leading-7 text-muted">{copy.assembling}</p>
        </div>
      </div>
    );
  }

  // A failed pool fetch and a failed eligibility check share one honest
  // error state; Retry re-runs the whole check sequence (→ 'ready' when
  // eligibility still holds). NEVER the used-mock pitch (policy §3).
  if (paper?.status === 'error' || current?.status === 'error') {
    return (
      <div className={wrapper}>
        <div className={card} role="alert">
          <h1 className="text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {copy.error.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">{copy.error.body}</p>
          <button type="button" onClick={recheck} className={`mt-6 ${primaryLink}`}>
            {copy.error.retry}
          </button>
        </div>
      </div>
    );
  }

  // ── 'checking' — the eligibility check is in flight ──────────────────────
  if (current === null) {
    return (
      <div className={wrapper}>
        <div className={card} role="status">
          <p className="text-[0.95rem] leading-7 text-muted">{appShell.loading}</p>
        </div>
      </div>
    );
  }

  // ── 'blocked-used' — the one free mock is already taken ──────────────────
  if (current.status === 'used') {
    const only = current.history[0];
    return (
      <div className={wrapper}>
        <div className={card}>
          <Arnie mood={copy.used.mood} size={140} className="mx-auto" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {copy.used.title}
          </h1>
          {only != null && (
            <p className="mt-3 text-sm font-bold text-purple">
              {copy.used.scoreLine(only.score, formatDate(only.date))}
            </p>
          )}
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">{copy.used.body}</p>
          <div className="mt-6 flex flex-col items-center gap-3">
            {/* Exactly ONE primary CTA on this surface (design system). */}
            <Link href={copy.used.cta.href} className={primaryLink}>
              {copy.used.cta.label}
            </Link>
            <p className="text-xs text-muted">{copy.used.webSoon}</p>
            <Link
              href={copy.used.later.href}
              className="flex min-h-11 items-center text-sm font-semibold text-purple hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
            >
              {copy.used.later.label}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 'ready' — the pre-start screen (PreMock parity) ──────────────────────
  const instructions = copy.instructions.map((line) =>
    line
      .replace('{questions}', String(MOCK_QUESTIONS))
      .replace('{minutes}', String(MOCK_DURATION_MIN)),
  );

  return (
    <div className={wrapper}>
      <div className="flex flex-col gap-4">
        {/* The settled snapshot, not the live store read — the banner, the
            eligibility it reports, and the paper Start draws must all be the
            one tier (M6-B1). */}
        {!current.paidSnapshot && (
          <div className="rounded-card border-l-4 border-purple bg-purple-soft px-4 py-3.5">
            <p className="text-center text-[0.95rem] font-bold text-purple">{copy.freeBanner}</p>
          </div>
        )}

        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{copy.title}</h1>

        <div className="flex items-center gap-2.5 rounded-card bg-purple-soft p-3.5">
          <Icon name="monitor" size={20} className="shrink-0 text-purple" />
          <p className="text-sm font-semibold leading-5 text-purple-dark">{copy.deviceAdvice}</p>
        </div>

        <ul className="flex flex-col gap-3 rounded-card bg-white p-6 shadow-card sm:p-8">
          {instructions.map((line, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-6 text-muted">
              <span aria-hidden="true" className="text-purple">
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {/* Exactly ONE primary CTA on this surface — green, per the app. */}
        <button
          type="button"
          onClick={() => start(current.paidSnapshot)}
          className="mt-1 flex min-h-12 w-full items-center justify-center rounded-pill bg-green px-6 text-base font-bold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
        >
          {copy.startButton}
        </button>

        {current.history.length > 0 && (
          <section aria-label={copy.historyTitle} className="mt-4">
            <h2 className="text-base font-extrabold text-ink">{copy.historyTitle}</h2>
            <ol className="mt-3 rounded-card bg-white p-5 shadow-card">
              {current.history.map((h, i) => (
                <li
                  key={`${h.date}-${i}`}
                  className={`flex items-center gap-3.5 ${i > 0 ? 'mt-2.5 border-t border-line pt-2.5' : ''}`}
                >
                  <span className="min-w-16 text-base font-extrabold text-purple">
                    {h.score} / {h.total ?? MOCK_QUESTIONS}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xs font-semibold text-muted">{formatDate(h.date)}</span>
                    <span className="text-xs leading-4 text-muted">
                      {Array.isArray(h.weakChapters) && h.weakChapters.length > 0
                        ? copy.historyWeak(h.weakChapters.map((ch) => `Ch ${ch}`).join(', '))
                        : copy.historyNoWeak}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
