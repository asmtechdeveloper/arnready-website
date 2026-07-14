import { describe, expect, it } from 'vitest';
import { canon, fieldFingerprints } from '../scripts/lib/canon.mjs';

describe('canon', () => {
  it('decodes entities before stripping non-alphanumerics', () => {
    expect(canon('P&amp;L Impact')).toBe(canon('P&L Impact'));
  });

  // M1-B2: React/Next can double-escape source text that already contains
  // an entity ("P&L" → "P&amp;L" on one pass, "P&amp;amp;L" on two). A
  // single decode pass turns "&amp;amp;" into "&amp;" (still escaped),
  // which then reads as literal letters "amp" once non-alphanumerics are
  // stripped — a different, wrong fingerprint that would let a
  // double-escaped leak evade the scan.
  describe('double-escaped entities decode to the same canonical form as the plain text', () => {
    it('named entity (&amp;amp; → &)', () => {
      expect(canon('P&amp;amp;L Impact')).toBe(canon('P&L Impact'));
    });

    it('decimal numeric entity (&amp;#38; → &)', () => {
      expect(canon('P&amp;#38;L Impact')).toBe(canon('P&L Impact'));
    });

    it('hexadecimal numeric entity (&amp;#x26; → &)', () => {
      expect(canon('P&amp;#x26;L Impact')).toBe(canon('P&L Impact'));
    });

    it('triple-escaped named entity still resolves (bounded repeated decoding)', () => {
      expect(canon('P&amp;amp;amp;L Impact')).toBe(canon('P&L Impact'));
    });
  });

  it('preserves an unknown/malformed named entity safely (never throws, stable output)', () => {
    expect(() => canon('&unknownEntity; text')).not.toThrow();
    expect(canon('&unknownEntity; text')).toBe(canon('&unknownEntity; text'));
  });

  it('preserves a numeric entity outside the valid Unicode range safely (never throws)', () => {
    expect(() => canon('&#4000000000; text')).not.toThrow();
    expect(() => canon('&#xFFFFFFFF; text')).not.toThrow();
  });

  it('canonicalization remains total for deeply nested entity escaping beyond the pass bound', () => {
    // 15 levels of nested escaping — deliberately more than
    // MAX_ENTITY_DECODE_PASSES — must terminate without throwing, even
    // though full resolution isn't guaranteed past the bound.
    let nested = '&';
    for (let i = 0; i < 15; i += 1) nested = nested.replace(/&/g, '&amp;');
    expect(() => canon(nested)).not.toThrow();
  });
});

describe('fieldFingerprints', () => {
  const longStem = 'This realistic exam stem describes a mutual fund distributor obligation clearly';
  const longOptionA = 'This option states the correct regulatory obligation for mutual fund distributors';
  const longOptionB = 'This option states an incorrect alternative regulatory framework entirely';
  const longExplanation = 'The correct answer follows from the regulatory obligation explained above in full';

  it('returns one fingerprint per field, never a single concatenated blob', () => {
    const fps = fieldFingerprints({ question: longStem, options: [longOptionA, longOptionB], explanation: longExplanation });
    expect(fps).toEqual([canon(longStem), canon(longOptionA), canon(longOptionB), canon(longExplanation)]);
    // None of the individual fingerprints is the whole-question concatenation.
    const wholeBlob = canon(longStem + longOptionA + longOptionB + longExplanation);
    expect(fps).not.toContain(wholeBlob);
  });

  it('drops fields shorter than the minimum length once canonicalised', () => {
    const fps = fieldFingerprints({ question: longStem, options: ['True', 'False'], explanation: '' });
    expect(fps).toEqual([canon(longStem)]);
  });

  it('never throws for missing options/explanation', () => {
    expect(() => fieldFingerprints({ question: longStem })).not.toThrow();
    expect(fieldFingerprints({ question: longStem })).toEqual([canon(longStem)]);
  });

  it('never throws for null/undefined question or non-array options', () => {
    expect(() => fieldFingerprints({ question: null, options: 'not-an-array', explanation: null })).not.toThrow();
    expect(fieldFingerprints({ question: null, options: 'not-an-array', explanation: null })).toEqual([]);
  });
});
