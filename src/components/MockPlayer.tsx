'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { MOCK_DURATION_MIN } from '@/lib/mockConfig';
import { recordMockAttempt } from '@/lib/mockService';
import { firestoreBackend } from '@/lib/progressBackend';
import { tallyWeakChapters, type Question } from '@/lib/quizEngine';
import { useRecordOnce } from '@/lib/useRecordOnce';
import { mockPlayer as copy } from '@/lib/copy';
import { Icon } from '@/components/Icon';
import { MockResults } from '@/components/MockResults';

/**
 * The 100-question timed mock run (M6), ported from
 * ../ARNReady-App/screens/MockTestScreen.js. This component is mounted by
 * the (next-step) mock surface with an ALREADY-ASSEMBLED paper — it never
 * assembles, orders, or filters questions itself (`assembleMock` is the
 * surface's job), and it never checks eligibility (`canTakeMock` is the
 * surface's job too).
 *
 * ZERO NUDGES (manual §1): the mock run is a zero-nudge surface. This file
 * imports no nudge or wall machinery of any kind — the exam's "never
 * interrupted after start" discipline applies doubly here. The premium
 * pitch lives ONLY in the post-submit `<MockResults>` block (the M2-B1
 * obligation), never mid-run.
 *
 * LOCKED behaviours carried from the app screen:
 *   - submit flow: all answered and none flagged → simple confirm;
 *     otherwise a confirm naming the unanswered/flagged counts;
 *   - attempts are recorded on submit ONLY (via `recordMockAttempt`,
 *     exactly once — `submittedRef` + `useRecordOnce`); a confirmed exit
 *     or a closed tab records NOTHING;
 *   - auto-submit when the countdown reaches zero, guarded so it can never
 *     fire twice;
 *   - the timer ticks from a ref, never inside a setState updater (the
 *     app's concurrent-rendering fix, ported as-is);
 *   - palette states, in priority order: flagged > answered > visited >
 *     not visited; active cell carries the purple border.
 *
 * Web equivalents of the app's platform affordances: the hardware-back
 * confirm becomes an Exit control + in-page confirm dialog, and a
 * `beforeunload` handler (registered only while the run is live and not
 * submitted) makes a tab close/refresh warn the same way.
 */

const INITIAL_SECS = MOCK_DURATION_MIN * 60;
/** Red-timer threshold: under 10 minutes (app: `timeLeft < 600`). */
const TIME_LOW_SECS = 600;
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

/** h:mm:ss, ported verbatim from MockTestScreen.js `formatTime`. */
function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type PaletteState = 'flagged' | 'answered' | 'visited' | 'notVisited';

/** App `gridBg`/`gridFg` priority, exactly: flagged > answered > visited. */
function paletteState(
  i: number,
  answers: readonly (number | null)[],
  visited: ReadonlySet<number>,
  flagged: ReadonlySet<number>,
): PaletteState {
  if (flagged.has(i)) return 'flagged';
  if (answers[i] !== null && answers[i] !== undefined) return 'answered';
  if (visited.has(i)) return 'visited';
  return 'notVisited';
}

/** Cell colours per state — theme/palette tokens only, mirroring the app's
 * grid (amber / green / the mirrored `paletteVisited` tokens / white). */
const CELL_TONE: Record<PaletteState, string> = {
  flagged: 'bg-amber text-ink',
  answered: 'bg-green text-white',
  visited: 'bg-palette-visited-bg text-palette-visited-fg',
  notVisited: 'bg-white text-muted',
};

interface MockOutcome {
  score: number;
  percentage: number;
  timeTaken: number;
  answers: (number | null)[];
}

export function MockPlayer(props: {
  questions: Question[];
  isPaid: boolean;
  onExit: () => void;
}) {
  // `isPaid` is read for exactly ONE purpose: forwarding to `<MockResults>`,
  // where it decides the premium pitch's visibility AFTER the run. The run
  // itself has nothing entitlement-shaped to branch on (zero nudges, no wall,
  // no scoring-denominator split — a mock is always scored over its 100).
  const { questions, isPaid, onExit } = props;
  const TOTAL = questions.length;

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  // Index 0 is pre-visited: the paper opens on question 1 (app parity).
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [flagged, setFlagged] = useState<Set<number>>(() => new Set());
  const [timeLeft, setTimeLeft] = useState(INITIAL_SECS);
  const [dialog, setDialog] = useState<'submit' | 'exit' | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [outcome, setOutcome] = useState<MockOutcome | null>(null);
  const submitted = outcome !== null;

  // Refs so the timer callback always sees latest values without stale
  // closures — the app screen's exact discipline.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  const submittedRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const timeLeftRef = useRef(INITIAL_SECS);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ─── Submit — guarded so it can only ever run once (app `submittedRef`) ────
  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    window.clearInterval(timerRef.current);
    const finalAnswers = answersRef.current;
    const score = finalAnswers.reduce<number>(
      (acc, a, i) => acc + (a !== null && a === questions[i]?.correctIndex ? 1 : 0),
      0,
    );
    const percentage = TOTAL > 0 ? Math.round((score / TOTAL) * 100) : 0;
    const timeTaken = INITIAL_SECS - timeLeftRef.current;
    setDialog(null);
    setOutcome({ score, percentage, timeTaken, answers: finalAnswers });
  }, [questions, TOTAL]);

  // Record EXACTLY ONCE, through the M6 service only, when the run is
  // submitted. A null backend (signed out / Firebase unavailable) shows the
  // completion state but writes nothing — same null handling as ExamPlayer.
  // Incomplete attempts never reach here: exit and tab-close paths never set
  // `outcome` (LOCKED: recorded on submit only).
  useRecordOnce(submitted, () => {
    if (!outcome) return;
    const backend = firestoreBackend();
    if (!backend) return;
    void recordMockAttempt(backend, {
      score: outcome.score,
      total: TOTAL,
      percentage: outcome.percentage,
      timeTaken: outcome.timeTaken,
      weakChapters: tallyWeakChapters(questions, outcome.answers),
      answers: outcome.answers,
      questions,
    });
  });

  // ─── Timer — starts with the paper, ticks from the ref (app parity) ────────
  useEffect(() => {
    if (TOTAL === 0) return;
    timerRef.current = window.setInterval(() => {
      const next = Math.max(timeLeftRef.current - 1, 0);
      timeLeftRef.current = next;
      setTimeLeft(next);
      if (next === 0) {
        window.clearInterval(timerRef.current);
        doSubmit();
      }
    }, 1000);
    return () => window.clearInterval(timerRef.current);
  }, [TOTAL, doSubmit]);

  // ─── beforeunload — the web's hardware-back-confirm equivalent ─────────────
  // Registered only while the run is live and not submitted; removed on
  // submit and on unmount. A confirmed close records nothing.
  useEffect(() => {
    if (TOTAL === 0 || submitted) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [TOTAL, submitted]);

  // ─── Navigation helpers (app parity) ───────────────────────────────────────
  const goToQuestion = useCallback((idx: number) => {
    setCurrentQ(idx);
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  const goPrev = useCallback(() => {
    if (currentQ > 0) goToQuestion(currentQ - 1);
  }, [currentQ, goToQuestion]);

  const saveAndNext = useCallback(() => {
    if (currentQ < TOTAL - 1) goToQuestion(currentQ + 1);
  }, [currentQ, TOTAL, goToQuestion]);

  const toggleFlag = useCallback(() => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ)) next.delete(currentQ);
      else next.add(currentQ);
      return next;
    });
  }, [currentQ]);

  const selectAnswer = useCallback(
    (optionIndex: number) => {
      const q = questions[currentQ];
      if (!q || optionIndex < 0 || optionIndex >= q.options.length) return;
      setAnswers((prev) => {
        const next = [...prev];
        next[currentQ] = optionIndex;
        return next;
      });
    },
    [questions, currentQ],
  );

  // ─── Keyboard shortcuts (design doc §7: first-class for laptop mocks) ──────
  // 1–4 select an option, arrows move, F flags. Suspended while a confirm
  // dialog is open and once the run is submitted.
  useEffect(() => {
    if (TOTAL === 0 || submitted) return;
    const onKey = (e: KeyboardEvent) => {
      if (dialog !== null || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1 && e.key >= '1' && e.key <= '4') selectAnswer(Number(e.key) - 1);
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') saveAndNext();
      else if (e.key === 'f' || e.key === 'F') toggleFlag();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [TOTAL, submitted, dialog, selectAnswer, goPrev, saveAndNext, toggleFlag]);

  // Move focus into the confirm dialog when it opens (a11y: focus managed,
  // Escape cancels via the dialog's own key handler below).
  useEffect(() => {
    if (dialog !== null) dialogRef.current?.focus();
  }, [dialog]);

  // ─── Empty paper — never a 0-question timed run ────────────────────────────
  if (TOTAL === 0) {
    return (
      <div className="mx-auto max-w-reading px-gutter-mobile py-12 sm:px-gutter-desktop">
        <div className="rounded-card bg-white p-8 text-center shadow-card sm:p-11" role="status">
          <h1 className="text-2xl font-extrabold tracking-tight text-purple sm:text-3xl">
            {copy.empty.title}
          </h1>
          <p className="mx-auto mt-3 text-[0.95rem] leading-7 text-muted">{copy.empty.body}</p>
        </div>
      </div>
    );
  }

  // ─── Completion — the mock results block (recording already fired above;
  //     MockResults is read-only). `onRetake` returns to the pre-start
  //     surface, whose recheck refuses a consumed free mock. ────────────────
  if (outcome) {
    return (
      <MockResults
        score={outcome.score}
        total={TOTAL}
        percentage={outcome.percentage}
        timeTaken={outcome.timeTaken}
        weakChapters={tallyWeakChapters(questions, outcome.answers)}
        isPaid={isPaid}
        onRetake={onExit}
      />
    );
  }

  const question = questions[currentQ];
  if (!question) return null;

  const picked = answers[currentQ] ?? null;
  const isFlagged = flagged.has(currentQ);
  const isTimeLow = timeLeft < TIME_LOW_SECS;
  const isFirst = currentQ === 0;
  const isLast = currentQ === TOTAL - 1;
  const unanswered = answers.filter((a) => a === null).length;
  const flaggedCount = flagged.size;
  const allClear = unanswered === 0 && flaggedCount === 0;

  function handleSubmitClick() {
    if (submittedRef.current) return;
    setDialog('submit');
  }

  function handleConfirmExit() {
    setDialog(null);
    onExit();
  }

  const navButton =
    'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:cursor-default disabled:opacity-40';

  return (
    <div className="mx-auto max-w-content px-gutter-mobile pb-12 sm:px-gutter-desktop">
      {/* Timer bar — sticky and slim so it never eats the phone viewport. */}
      <div className="sticky top-0 z-30 -mx-gutter-mobile flex items-center justify-between border-b border-line bg-bg px-gutter-mobile py-2 sm:-mx-gutter-desktop sm:px-gutter-desktop">
        <div
          role="timer"
          aria-label={copy.timerLabel}
          className={`flex items-center gap-2 text-xl font-extrabold ${isTimeLow ? 'text-red' : 'text-ink'}`}
        >
          <Icon name="clock" size={18} />
          <span>{formatTime(timeLeft)}</span>
        </div>
        <button
          type="button"
          onClick={() => setDialog('exit')}
          className="flex min-h-11 items-center rounded-pill px-4 text-sm font-bold text-purple hover:bg-purple-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
        >
          {copy.exit}
        </button>
      </div>

      <div className="mt-6 lg:flex lg:items-start lg:gap-8">
        {/* ── Question panel ── */}
        <div className="lg:min-w-0 lg:flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-purple">{copy.badge}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {copy.counter(currentQ + 1, TOTAL)}
            </p>
            <button
              type="button"
              onClick={toggleFlag}
              aria-pressed={isFlagged}
              className={`flex min-h-11 min-w-[44px] items-center justify-center rounded-control border px-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple ${
                isFlagged ? 'border-amber bg-amber text-ink' : 'border-line bg-white text-muted hover:border-amber'
              }`}
            >
              <Icon name="flag" size={16} />
              <span className="sr-only">{isFlagged ? copy.flagOn : copy.flagOff}</span>
            </button>
          </div>

          <div className="mt-4 rounded-card bg-white p-6 shadow-card sm:p-8">
            <p className="text-lg font-bold text-ink">{question.question}</p>

            <div role="radiogroup" aria-label={copy.optionsLabel} className="mt-6 flex flex-col gap-3">
              {question.options.map((option, i) => {
                const isSelected = picked === i;
                // Unlike the exam player, a mock answer is never locked in:
                // change any answer any number of times before submitting
                // (app: "Nothing is locked in until you submit").
                const tone = isSelected
                  ? 'border-purple bg-purple-soft text-ink'
                  : 'border-line bg-white text-ink hover:border-purple';
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => selectAnswer(i)}
                    className={`flex min-h-11 min-w-[44px] items-center rounded-control border px-4 py-3 text-left text-[0.95rem] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple ${tone}`}
                  >
                    {OPTION_LABELS[i] ?? ''}. {option}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={goPrev}
                disabled={isFirst}
                className={`${navButton} border-line bg-white text-ink hover:border-purple`}
              >
                <Icon name="arrow-left" size={16} />
                <span>{copy.prev}</span>
              </button>
              <button
                type="button"
                onClick={saveAndNext}
                disabled={isLast}
                className={`${navButton} border-purple bg-purple text-white hover:bg-purple-dark`}
              >
                <span>{copy.saveNext}</span>
                <Icon name="arrow-right" size={16} />
              </button>
            </div>
          </div>

          <p className="mt-3 hidden text-xs text-muted lg:block">{copy.keyboardHint}</p>
        </div>

        {/* ── Palette panel: collapsible on mobile, always open on lg+ ── */}
        <div className="mt-8 lg:mt-0 lg:w-72 xl:w-80">
          <button
            type="button"
            onClick={() => setPaletteOpen((open) => !open)}
            aria-expanded={paletteOpen}
            aria-controls="mock-palette"
            className="flex min-h-11 w-full items-center justify-between rounded-control border border-line bg-white px-4 text-sm font-bold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple lg:hidden"
          >
            <span>{copy.paletteToggle}</span>
            <Icon name="chevron-right" size={16} className={paletteOpen ? 'rotate-90' : ''} />
          </button>

          <div id="mock-palette" className={`${paletteOpen ? 'block' : 'hidden'} mt-3 lg:mt-0 lg:block`}>
            <div className="rounded-card bg-white p-4 shadow-card">
              <div role="group" aria-label={copy.paletteLabel} className="grid grid-cols-5 gap-1.5">
                {questions.map((_, i) => {
                  const state = paletteState(i, answers, visited, flagged);
                  const active = i === currentQ;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goToQuestion(i)}
                      aria-label={copy.cellLabel(i + 1, copy.legend[state])}
                      aria-current={active ? 'true' : undefined}
                      className={`flex min-h-11 items-center justify-center rounded-control text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple ${CELL_TONE[state]} ${
                        active ? 'border-2 border-purple' : 'border border-line'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <ul className="mt-4 flex flex-col gap-1">
                {(
                  [
                    ['answered', 'bg-green'],
                    ['visited', 'bg-palette-visited-legend'],
                    ['flagged', 'bg-amber'],
                    ['notVisited', 'border border-line bg-white'],
                  ] as const
                ).map(([state, swatch]) => (
                  <li key={state} className="flex items-center gap-2 text-xs text-muted">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${swatch}`} />
                    <span>{copy.legend[state]}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleSubmitClick}
                className="mt-4 flex min-h-11 w-full items-center justify-center rounded-pill bg-amber px-6 text-base font-bold text-ink hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
              >
                {copy.submit}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm dialog (submit / exit) — in-page, accessible ── */}
      {dialog !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-gutter-mobile">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mock-dialog-title"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setDialog(null);
            }}
            className="w-full max-w-md rounded-card bg-white p-6 shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple sm:p-8"
          >
            <h2 id="mock-dialog-title" className="text-lg font-bold text-ink">
              {dialog === 'exit' ? copy.confirmExit.title : copy.confirmSubmit.title}
            </h2>
            <p className="mt-2 text-[0.95rem] leading-6 text-muted">
              {dialog === 'exit'
                ? copy.confirmExit.body
                : allClear
                  ? copy.confirmSubmit.allAnswered
                  : copy.confirmSubmit.remaining(unanswered, flaggedCount)}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="flex min-h-11 items-center justify-center rounded-pill border border-line bg-white px-6 text-sm font-bold text-ink hover:border-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
              >
                {dialog === 'exit'
                  ? copy.confirmExit.cancel
                  : allClear
                    ? copy.confirmSubmit.cancelAllAnswered
                    : copy.confirmSubmit.cancelRemaining}
              </button>
              <button
                type="button"
                onClick={dialog === 'exit' ? handleConfirmExit : doSubmit}
                className="flex min-h-11 items-center justify-center rounded-pill bg-purple px-6 text-sm font-bold text-white hover:bg-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-dark"
              >
                {dialog === 'exit' ? copy.confirmExit.confirm : copy.confirmSubmit.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run state exposed for tests — never written to Firestore from here
          (recording happens once, above, through the M6 service only). */}
      <span
        hidden
        data-testid="mock-player-state"
        data-index={currentQ}
        data-visited={visited.size}
        data-flagged={flagged.size}
      />
    </div>
  );
}
