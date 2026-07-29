/**
 * seededRng — the ONE deterministic rng used by both sides of the quizEngine
 * parity fixture (M5 plan D5).
 *
 * `scripts/gen-quizengine-golden.mjs` drives the APP's real engine with this
 * rng to record expected outputs; `test/quizEnginePort.test.ts` drives the WEB
 * port with the same rng and the same recorded seed, and the two must agree
 * exactly. It lives here, imported by both, rather than being defined twice:
 * a fixture whose generator and test each carry their own copy of the random
 * source pins nothing — the two copies could drift apart and the test would
 * still pass against its own drifted expectations.
 *
 * Plain `.mjs` for the same reason `scripts/lib/canonicalDeck.mjs` is: the
 * generator runs under bare `node` with no path-alias resolution or build
 * step, while vitest imports it happily from the test side.
 *
 * mulberry32. Given a seed, produces the identical sequence in [0, 1) every
 * time, on every platform. Never `Math.random` — a fixture that consumed real
 * randomness would re-record different "expected" values on every run.
 */
export function makeSeededRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
