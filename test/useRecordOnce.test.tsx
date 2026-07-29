import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { useRecordOnce } from '@/lib/useRecordOnce';

/**
 * useRecordOnce (M5 S7) — the record-once latch, pinned directly.
 *
 * The players' own tests can't fully exercise the latch: their `done` flips
 * true on a normal re-render, long after StrictMode's mount-time double-invoke
 * (which fires while `done` is still false). Here `done` is true AT MOUNT, so
 * StrictMode's setup→cleanup→setup double-invoke genuinely runs the effect
 * twice on one instance — and the latch must still emit exactly one call.
 * Without the `fired` ref guard this test double-fires.
 */
function Harness({ done, record }: { done: boolean; record: () => void }) {
  useRecordOnce(done, record);
  return null;
}

afterEach(() => cleanup());

describe('useRecordOnce', () => {
  it('fires exactly once even under StrictMode double-invoke when done is true at mount', () => {
    const record = vi.fn();
    render(
      <StrictMode>
        <Harness done record={record} />
      </StrictMode>,
    );
    expect(record).toHaveBeenCalledTimes(1);
  });

  it('does not fire while done is false, then fires once when done flips true', () => {
    const record = vi.fn();
    const { rerender } = render(<Harness done={false} record={record} />);
    expect(record).not.toHaveBeenCalled();

    rerender(<Harness done record={record} />);
    expect(record).toHaveBeenCalledTimes(1);

    // A later re-render with a fresh inline callback must not fire again.
    rerender(<Harness done record={() => record()} />);
    expect(record).toHaveBeenCalledTimes(1);
  });
});
