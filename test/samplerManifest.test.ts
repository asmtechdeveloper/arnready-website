import { describe, expect, it } from 'vitest';
import { computeSamplerManifest, SAMPLER_SIZE } from '../scripts/lib/samplerManifest.mjs';

const teachingDoc = (overrides: Record<string, unknown> = {}) => ({
  docType: 'chapterTeaching',
  chapter: 1,
  status: 'approved',
  blocks: [{ type: 'paragraph', text: 'Chapter teaching text.' }],
  ...overrides,
});

const cardDoc = (subtopic: string, count: number) => ({
  chapter: 1,
  subtopic,
  cards: Array.from({ length: count }, (_, i) => ({ front: `${subtopic} ${i}`, back: 'b', isFree: undefined as boolean | undefined })),
});

describe('computeSamplerManifest', () => {
  it('returns the first SAMPLER_SIZE canonical-order card ids for a published chapter', () => {
    const rawByChapter = new Map([[1, [teachingDoc(), cardDoc('Investors and Financial Goals', 15)]]]);
    const manifest = computeSamplerManifest(rawByChapter);
    expect(manifest[1]).toHaveLength(SAMPLER_SIZE);
    expect(manifest[1]).toEqual(
      Array.from({ length: SAMPLER_SIZE }, (_, i) => `1:investors-and-financial-goals:${i}`),
    );
  });

  it('omits a chapter entirely when it has no published (approved) teaching', () => {
    const rawByChapter = new Map([[1, [teachingDoc({ status: 'draft' }), cardDoc('Investors and Financial Goals', 15)]]]);
    const manifest = computeSamplerManifest(rawByChapter);
    expect(manifest[1]).toBeUndefined();
  });

  it('omits a chapter when its teaching doc is a rejected duplicate (matches the website hub gate exactly)', () => {
    const rawByChapter = new Map([[1, [teachingDoc(), teachingDoc(), cardDoc('Investors and Financial Goals', 15)]]]);
    const manifest = computeSamplerManifest(rawByChapter);
    expect(manifest[1]).toBeUndefined();
  });

  // M1-B5: a draft or paid-only section/card must never enter the manifest
  // that governs what the public hub is allowed to render — verified here
  // at the export/manifest boundary, not just buildCanonicalDeck directly.
  it('never includes cards from a draft-status section in the sampler manifest (hub still exists — just an empty sampler)', () => {
    const rawByChapter = new Map([
      [1, [teachingDoc(), { ...cardDoc('Investors and Financial Goals', 15), status: 'draft' }]],
    ]);
    const manifest = computeSamplerManifest(rawByChapter);
    expect(manifest[1]).toEqual([]);
  });

  it('never includes cards from an isFree:false section in the sampler manifest (hub still exists — just an empty sampler)', () => {
    const rawByChapter = new Map([
      [1, [teachingDoc(), { ...cardDoc('Investors and Financial Goals', 15), isFree: false }]],
    ]);
    const manifest = computeSamplerManifest(rawByChapter);
    expect(manifest[1]).toEqual([]);
  });

  it('never includes an individual isFree:false card in the sampler manifest', () => {
    const paid = cardDoc('Investors and Financial Goals', 3);
    paid.cards[0] = { ...paid.cards[0]!, isFree: false };
    const rawByChapter = new Map([[1, [teachingDoc(), paid]]]);
    const manifest = computeSamplerManifest(rawByChapter);
    // One of the three cards was paid-only, so only 2 remain public.
    expect(manifest[1]).toHaveLength(2);
  });

  it('throws (fails loudly) rather than writing an ambiguous manifest when buildCanonicalDeck yields duplicate card ids', () => {
    // Two raw docs sharing the exact same subtopic name — a genuine content
    // bug (e.g. a duplicate Firestore write) — each restart cardIndex from
    // 0, producing the same cardId twice ("1:investors-and-financial-goals:0").
    const rawByChapter = new Map([
      [1, [teachingDoc(), cardDoc('Investors and Financial Goals', 2), cardDoc('Investors and Financial Goals', 2)]],
    ]);
    expect(() => computeSamplerManifest(rawByChapter)).toThrow(/duplicate card ids/);
  });
});
