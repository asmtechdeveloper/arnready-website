'use client';

import { useEffect, useRef } from 'react';

/**
 * Fire `record` EXACTLY ONCE, the first time `done` becomes true, and never
 * again on any later re-render (M5 plan D10, step S7).
 *
 * Why a ref latch and not just an effect dependency: a results screen
 * re-renders freely (parent state, entitlement flips, React StrictMode's
 * double-invoke in dev). The app and the website write to the SAME
 * `users/{uid}` tree, so a second session write silently corrupts the app's
 * Prepometer — it fails no parity test, because the parity test only covers a
 * single call. The latch guarantees the write is emitted once per mounted run,
 * regardless of how the effect is scheduled or re-run.
 *
 * The `fired` latch, not the dependency list, is what bounds the call to once.
 * Callers pass an inline closure, so `record`'s identity changes every render
 * and the effect re-runs — but every re-run after the first hits the latched
 * early return, so the write is still emitted exactly once. `done` flipping
 * true is the trigger; the latch makes the extra runs (and StrictMode's
 * double-invoke) no-ops.
 */
export function useRecordOnce(done: boolean, record: () => void): void {
  const fired = useRef(false);

  useEffect(() => {
    if (!done || fired.current) return;
    fired.current = true;
    record();
  }, [done, record]);
}
