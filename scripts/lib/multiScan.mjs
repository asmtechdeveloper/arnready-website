/**
 * Multi-pattern substring scanner for the leak gate (M1-r BLOCKER).
 *
 * The gate scans ~1,900 build artefacts against tens of thousands of paid/
 * free text fingerprints. Testing every pattern against every artefact with
 * `String.prototype.includes` is O(artefacts × patterns × textlen) — on a
 * real export that is ~90s of CPU and climbs with content, so a CI host with
 * a tighter timeout kills the gate before it reports a result, leaving the
 * static export unprotected. This scanner finds every matching pattern in a
 * single O(textlen) pass per artefact regardless of pattern count.
 *
 * Technique: Rabin–Karp with a rolling hash over a fixed anchor window of
 * length K (= the shortest pattern's length, so no pattern is ever dropped).
 * Each pattern's first-K-char hash indexes it; scanning slides the window
 * across the text in O(1) per step, and only on a hash hit is a candidate
 * verified with `startsWith` — so a hash collision costs an extra verify,
 * never a false positive or a miss. Memory is O(patterns), far below an
 * Aho–Corasick trie over these long (avg ~73-char) fingerprints.
 *
 * Pure and dependency-free; unit-tested in test/multiScan.test.ts.
 */

// 2^31 - 1 (Mersenne prime). Every intermediate product below stays well
// under Number.MAX_SAFE_INTEGER (2^53), so no precision loss / overflow.
const MOD = 2147483647;
const BASE = 257;

function hashPrefix(s, k) {
  let h = 0;
  for (let i = 0; i < k; i += 1) h = (h * BASE + s.charCodeAt(i)) % MOD;
  return h;
}

/**
 * Build a scanner over `patterns`. Empty/duplicate patterns are ignored. The
 * anchor length K is the shortest surviving pattern's length so every pattern
 * is indexable; a scanner over no patterns matches nothing.
 */
export function buildScanner(patterns) {
  const pats = [...new Set((patterns ?? []).filter((p) => typeof p === 'string' && p.length > 0))];
  if (pats.length === 0) return { index: new Map(), k: 0, power: 1, empty: true };
  const k = pats.reduce((min, p) => Math.min(min, p.length), Infinity);
  const index = new Map(); // hash(first k chars) -> [pattern, ...]
  for (const p of pats) {
    const h = hashPrefix(p, k);
    const bucket = index.get(h);
    if (bucket) bucket.push(p);
    else index.set(h, [p]);
  }
  // BASE^(k-1) % MOD, used to drop the leaving character while rolling.
  let power = 1;
  for (let i = 0; i < k - 1; i += 1) power = (power * BASE) % MOD;
  return { index, k, power, empty: false };
}

/**
 * Return the distinct patterns from `scanner` that occur as substrings of
 * `text`. Never throws; returns [] for an empty scanner or too-short text.
 */
export function findMatches(scanner, text) {
  const { index, k, power, empty } = scanner;
  if (empty || typeof text !== 'string' || text.length < k) return [];
  const found = new Set();
  let h = hashPrefix(text, k);
  const last = text.length - k;
  for (let i = 0; ; i += 1) {
    const bucket = index.get(h);
    if (bucket) {
      for (const pat of bucket) {
        if (!found.has(pat) && text.startsWith(pat, i)) found.add(pat);
      }
    }
    if (i === last) break;
    // Roll the window from [i, i+k) to [i+1, i+1+k): drop text[i], add text[i+k].
    const drop = (text.charCodeAt(i) * power) % MOD;
    h = (((h - drop + MOD) % MOD) * BASE + text.charCodeAt(i + k)) % MOD;
  }
  return [...found];
}

/** True if ANY pattern occurs in `text` (early-exit variant of findMatches). */
export function hasMatch(scanner, text) {
  const { index, k, power, empty } = scanner;
  if (empty || typeof text !== 'string' || text.length < k) return false;
  let h = hashPrefix(text, k);
  const last = text.length - k;
  for (let i = 0; ; i += 1) {
    const bucket = index.get(h);
    if (bucket) {
      for (const pat of bucket) if (text.startsWith(pat, i)) return true;
    }
    if (i === last) break;
    const drop = (text.charCodeAt(i) * power) % MOD;
    h = (((h - drop + MOD) % MOD) * BASE + text.charCodeAt(i + k)) % MOD;
  }
  return false;
}
