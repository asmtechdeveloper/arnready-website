import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Entitlement store (M3) — the review protocol's M3 security checklist,
 * turned into tests:
 *
 *   - "isPaid listener: detach on sign-out"
 *   - "default UNPAID on error/missing doc (fail-closed)"
 *   - "no caching across accounts"
 *   - "auth state flaps (rapid sign-in/out) don't crash gated routes"
 *
 * plus manual §0.9's absolute rule: nothing here may ever WRITE isPaid.
 */

// ── Controllable Firestore double ────────────────────────────────────────
type Snapshot = { exists: () => boolean; data: () => Record<string, unknown> | undefined };

let live: {
  path: string;
  next: (snap: Snapshot) => void;
  error: (e: unknown) => void;
  detached: boolean;
} | null = null;
let attachCount = 0;
let detachCount = 0;

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  onSnapshot: (
    ref: { path: string },
    next: (snap: Snapshot) => void,
    error: (e: unknown) => void,
  ) => {
    attachCount += 1;
    const handle = { path: ref.path, next, error, detached: false };
    live = handle;
    return () => {
      detachCount += 1;
      handle.detached = true;
      if (live === handle) live = null;
    };
  },
}));

let dbAvailable = true;
vi.mock('@/lib/firebaseClient', () => ({
  getDb: () => (dbAvailable ? ({ __fake: true } as unknown) : null),
}));

const {
  hasLiveEntitlementListener,
  resetEntitlement,
  subscribeEntitlement,
  useEntitlement,
} = await import('@/lib/entitlementStore');

function snapshot(data: Record<string, unknown> | undefined): Snapshot {
  return { exists: () => data !== undefined, data: () => data };
}

function state() {
  return useEntitlement.getState();
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  resetEntitlement();
  live = null;
  attachCount = 0;
  detachCount = 0;
  dbAvailable = true;
});

describe('initial state', () => {
  it('starts unknown and unpaid — never paid-by-default', () => {
    expect(state()).toEqual({ isPaid: false, known: false });
  });
});

describe('reading isPaid (fail-closed on every branch)', () => {
  it('grants paid ONLY for an existing doc with isPaid === true', () => {
    subscribeEntitlement('uid-a');
    live!.next(snapshot({ isPaid: true }));
    expect(state()).toEqual({ isPaid: true, known: true });
  });

  it('treats a missing user document as unpaid, and settles', () => {
    subscribeEntitlement('uid-new');
    live!.next(snapshot(undefined));
    expect(state()).toEqual({ isPaid: false, known: true });
  });

  it('treats a document without the field as unpaid', () => {
    subscribeEntitlement('uid-a');
    live!.next(snapshot({ displayName: 'Someone' }));
    expect(state()).toEqual({ isPaid: false, known: true });
  });

  it.each([
    ['the string "true"', 'true'],
    ['the number 1', 1],
    ['an object', {}],
    ['null', null],
    ['undefined', undefined],
  ])('does not accept %s as entitlement (strict === true only)', (_label, value) => {
    subscribeEntitlement('uid-a');
    live!.next(snapshot({ isPaid: value }));
    expect(state().isPaid).toBe(false);
  });

  it('treats a listener error (permission denied, offline) as unpaid, and settles', () => {
    subscribeEntitlement('uid-a');
    live!.error(new Error('permission-denied'));
    expect(state()).toEqual({ isPaid: false, known: true });
  });

  it('revokes immediately when a server-side write flips isPaid back to false', () => {
    subscribeEntitlement('uid-a');
    live!.next(snapshot({ isPaid: true }));
    expect(state().isPaid).toBe(true);

    live!.next(snapshot({ isPaid: false }));
    expect(state()).toEqual({ isPaid: false, known: true });
  });

  it('settles as unpaid when Firebase is unconfigured, rather than hanging unknown', () => {
    dbAvailable = false;
    subscribeEntitlement('uid-a');
    expect(state()).toEqual({ isPaid: false, known: true });
    expect(hasLiveEntitlementListener()).toBe(false);
  });
});

describe('listener lifecycle', () => {
  it('detaches the listener on sign-out and returns to unknown/unpaid', () => {
    subscribeEntitlement('uid-a');
    live!.next(snapshot({ isPaid: true }));
    expect(hasLiveEntitlementListener()).toBe(true);

    subscribeEntitlement(null);

    expect(detachCount).toBe(1);
    expect(hasLiveEntitlementListener()).toBe(false);
    expect(state()).toEqual({ isPaid: false, known: false });
  });

  it('does not churn the listener when the same uid re-subscribes', () => {
    subscribeEntitlement('uid-a');
    live!.next(snapshot({ isPaid: true }));

    subscribeEntitlement('uid-a');

    expect(attachCount).toBe(1);
    expect(detachCount).toBe(0);
    // A working listener must not be dropped back into the unknown state.
    expect(state()).toEqual({ isPaid: true, known: true });
  });

  it('keeps exactly one listener across repeated account switches', () => {
    subscribeEntitlement('uid-a');
    subscribeEntitlement('uid-b');
    subscribeEntitlement('uid-c');

    expect(attachCount).toBe(3);
    expect(detachCount).toBe(2);
    expect(hasLiveEntitlementListener()).toBe(true);
  });

  it('survives rapid sign-in/out flapping without throwing', () => {
    expect(() => {
      for (let i = 0; i < 50; i += 1) {
        subscribeEntitlement(`uid-${i}`);
        live?.next(snapshot({ isPaid: i % 2 === 0 }));
        subscribeEntitlement(null);
      }
    }).not.toThrow();
    expect(state()).toEqual({ isPaid: false, known: false });
    expect(hasLiveEntitlementListener()).toBe(false);
  });
});

describe('cross-account isolation (the leak this guard exists to prevent)', () => {
  it('an A→B switch with no signed-out gap never shows A’s paid state to B', () => {
    subscribeEntitlement('uid-paid-a');
    live!.next(snapshot({ isPaid: true }));
    expect(state().isPaid).toBe(true);

    // Direct switch — no null in between, exactly the app-repo bug case.
    subscribeEntitlement('uid-free-b');

    // Before B's first snapshot: unknown AND unpaid. Never A's value.
    expect(state()).toEqual({ isPaid: false, known: false });

    live!.next(snapshot(undefined));
    expect(state()).toEqual({ isPaid: false, known: true });
  });

  it('drops a late snapshot belonging to the PREVIOUS user (epoch guard)', () => {
    subscribeEntitlement('uid-paid-a');
    const staleListener = live!;

    subscribeEntitlement('uid-free-b');
    live!.next(snapshot(undefined));
    expect(state()).toEqual({ isPaid: false, known: true });

    // A's in-flight read lands after the switch — it must be ignored.
    staleListener.next(snapshot({ isPaid: true }));

    expect(state().isPaid).toBe(false);
  });

  it('drops a late ERROR belonging to the previous user', () => {
    subscribeEntitlement('uid-a');
    const staleListener = live!;

    subscribeEntitlement('uid-b');
    live!.next(snapshot({ isPaid: true }));
    expect(state().isPaid).toBe(true);

    staleListener.error(new Error('late failure for A'));

    // B is genuinely paid; A's late error must not revoke it.
    expect(state()).toEqual({ isPaid: true, known: true });
  });

  it('caches nothing: re-subscribing to a previously-paid uid starts unknown', () => {
    subscribeEntitlement('uid-a');
    live!.next(snapshot({ isPaid: true }));
    subscribeEntitlement(null);
    expect(state()).toEqual({ isPaid: false, known: false });

    subscribeEntitlement('uid-a');
    // No cached "this uid was paid last time" fast path — the listener is the
    // only source, so state stays unknown until Firestore answers again.
    expect(state()).toEqual({ isPaid: false, known: false });
  });

  it('treats undefined uid the same as signed out', () => {
    subscribeEntitlement('uid-a');
    live!.next(snapshot({ isPaid: true }));

    subscribeEntitlement(undefined);

    expect(state()).toEqual({ isPaid: false, known: false });
    expect(hasLiveEntitlementListener()).toBe(false);
  });
});
