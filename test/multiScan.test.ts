import { describe, expect, it } from 'vitest';
import { buildScanner, findMatches, hasMatch } from '../scripts/lib/multiScan.mjs';

/**
 * M1-r BLOCKER: the leak gate's per-pattern `includes` sweep was
 * O(artefacts × patterns × textlen) — ~90s on a real export and killable by
 * a CI timeout. This Rabin–Karp scanner must be correct (find exactly the
 * substrings present) and fast (one O(textlen) pass regardless of pattern
 * count). These tests pin correctness, including the failure modes the gate
 * relies on, plus a large-input case that would be intractable for the old
 * quadratic scan.
 */
describe('buildScanner / findMatches', () => {
  it('finds patterns that occur and omits those that do not', () => {
    const s = buildScanner(['alpha-fingerprint-1234', 'bravo-fingerprint-5678', 'charlie-absent-0000']);
    const text = 'prefix alpha-fingerprint-1234 middle bravo-fingerprint-5678 suffix';
    expect(findMatches(s, text).sort()).toEqual(['alpha-fingerprint-1234', 'bravo-fingerprint-5678']);
    expect(hasMatch(s, text)).toBe(true);
  });

  it('matches at the very start and very end of the text', () => {
    const s = buildScanner(['startpattern-aaaa', 'endpattern-zzzz']);
    expect(findMatches(s, 'startpattern-aaaa .... endpattern-zzzz').sort()).toEqual([
      'endpattern-zzzz',
      'startpattern-aaaa',
    ]);
  });

  it('matches patterns of differing lengths (anchor = shortest pattern length)', () => {
    const s = buildScanner(['ch01_q002', 'a-much-longer-fingerprint-value-here']);
    expect(findMatches(s, 'x ch01_q002 y').sort()).toEqual(['ch01_q002']);
    expect(findMatches(s, 'z a-much-longer-fingerprint-value-here z')).toEqual([
      'a-much-longer-fingerprint-value-here',
    ]);
    // A hash-collision candidate that is NOT actually present must be rejected
    // by the startsWith verification, not falsely reported.
    expect(findMatches(s, 'ch01_q003 only')).toEqual([]);
  });

  it('reports nothing for an empty scanner or too-short text', () => {
    expect(findMatches(buildScanner([]), 'anything at all here')).toEqual([]);
    expect(hasMatch(buildScanner([]), 'anything')).toBe(false);
    expect(findMatches(buildScanner(['longer-than-text-pattern']), 'short')).toEqual([]);
  });

  it('ignores empty/non-string patterns and de-dupes', () => {
    const s = buildScanner(['dup-pattern-xxxx', 'dup-pattern-xxxx', '', null as unknown as string]);
    expect(findMatches(s, 'a dup-pattern-xxxx b')).toEqual(['dup-pattern-xxxx']);
  });

  it('scales to thousands of patterns over a large text in one pass', () => {
    // 5,000 distinct 24-char patterns; only a handful are planted in the text.
    const patterns = Array.from({ length: 5000 }, (_, i) => `fp${String(i).padStart(6, '0')}-canonicaltext`);
    const planted = [patterns[0], patterns[2500], patterns[4999]];
    const filler = 'lorem ipsum dolor sit amet '.repeat(5000); // ~135k chars
    const text = `${filler}${planted.join(' ')}${filler}`;
    const s = buildScanner(patterns);
    expect(findMatches(s, text).sort()).toEqual([...planted].sort());
  });
});
