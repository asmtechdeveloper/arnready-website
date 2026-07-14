import { describe, expect, it } from 'vitest';
import { canon, fieldFingerprints } from '../scripts/lib/canon.mjs';
import { computePublicBlobs, partitionFreeFieldFps } from '../scripts/lib/freeManifestExclusion.mjs';

const teachingDoc = (overrides: Record<string, unknown> = {}) => ({
  docType: 'chapterTeaching',
  chapter: 1,
  status: 'approved',
  blocks: [{ type: 'paragraph', text: 'Safety, liquidity, and returns are the three evaluation factors for any investment.' }],
  ...overrides,
});

const cardDoc = (subtopic: string, cards: { front: string; back: string }[]) => ({ chapter: 1, subtopic, cards });

describe('computePublicBlobs', () => {
  it('includes approved chapter teaching text', () => {
    const rawByChapter = new Map([[1, [teachingDoc()]]]);
    const blobs = computePublicBlobs(rawByChapter);
    expect(blobs.some((b) => b.includes(canon('Safety, liquidity, and returns')))).toBe(true);
  });

  it('excludes draft (non-approved) teaching text', () => {
    const rawByChapter = new Map([[1, [teachingDoc({ status: 'draft' })]]]);
    const blobs = computePublicBlobs(rawByChapter);
    expect(blobs.some((b) => b.includes(canon('Safety, liquidity, and returns')))).toBe(false);
  });

  it('includes only the first SAMPLER_SIZE canonical-order cards, not the full deck', () => {
    const manyCards = Array.from({ length: 20 }, (_, i) => ({
      front: `Card front number ${i} about investing`,
      back: `Card back number ${i} explaining the concept in detail`,
    }));
    const rawByChapter = new Map([[1, [cardDoc('Investors and Financial Goals', manyCards)]]]);
    const blobs = computePublicBlobs(rawByChapter);
    const combined = blobs.join(' ');
    expect(combined).toContain(canon('Card front number 0 about investing'));
    expect(combined).toContain(canon('Card front number 9 about investing'));
    // Card 10+ falls outside the public sampler and must not be included.
    expect(combined).not.toContain(canon('Card front number 10 about investing'));
    expect(combined).not.toContain(canon('Card front number 19 about investing'));
  });

  // M1-B5: a draft or paid-only section/card's text must never enter the
  // "genuinely public" blob — verified here at the free-manifest-exclusion
  // boundary too, not just buildCanonicalDeck directly.
  it('never includes card text from a draft-status section', () => {
    const rawByChapter = new Map([
      [1, [teachingDoc({ blocks: [] }), { ...cardDoc('Investors and Financial Goals', [{ front: 'Draft card front text', back: 'b' }]), status: 'draft' }]],
    ]);
    const blobs = computePublicBlobs(rawByChapter);
    expect(blobs.some((b) => b.includes(canon('Draft card front text')))).toBe(false);
  });

  it('never includes card text from an isFree:false section', () => {
    const rawByChapter = new Map([
      [1, [teachingDoc({ blocks: [] }), { ...cardDoc('Investors and Financial Goals', [{ front: 'Paid section card front text', back: 'b' }]), isFree: false }]],
    ]);
    const blobs = computePublicBlobs(rawByChapter);
    expect(blobs.some((b) => b.includes(canon('Paid section card front text')))).toBe(false);
  });

  it('never includes text from an individual isFree:false card', () => {
    const section = cardDoc('Investors and Financial Goals', [
      { front: 'Free card front text', back: 'b' },
      { front: 'Paid card front text', back: 'b' },
    ]);
    (section.cards[1] as { front: string; back: string; isFree?: boolean }).isFree = false;
    const rawByChapter = new Map([[1, [teachingDoc({ blocks: [] }), section]]]);
    const blobs = computePublicBlobs(rawByChapter);
    const combined = blobs.join(' ');
    expect(combined).toContain(canon('Free card front text'));
    expect(combined).not.toContain(canon('Paid card front text'));
  });

  it('never throws for empty/malformed chapter data', () => {
    expect(() => computePublicBlobs(new Map([[1, []]]))).not.toThrow();
    expect(() => computePublicBlobs(new Map([[1, [null, 'garbage', 42]]]))).not.toThrow();
  });

  // Regression: a published subtopic's NAME is real public text (rendered
  // in the hub's subtopic index, breadcrumbs, spoke title/H1, and prev/next
  // nav) — a question field that happens to equal a subtopic name (e.g. an
  // MCQ option that IS the subtopic's own name, like a real chapter-3
  // collision this test reproduces) must not be flagged as a leak.
  it('includes published subtopic names (not just teaching prose and card text)', () => {
    const subtopicName = 'Depositories and Depository Participants';
    const rawByChapter = new Map([
      [
        1,
        [
          teachingDoc({
            blocks: [],
            subtopics: [{ subtopicSlug: 'depositories-and-depository-participants', subtopic: subtopicName, status: 'approved', blocks: [{ type: 'paragraph', text: 'x' }] }],
          }),
          cardDoc(subtopicName, [{ front: 'f', back: 'b' }]),
        ],
      ],
    ]);
    const blobs = computePublicBlobs(rawByChapter);
    expect(blobs.some((b) => b.includes(canon(subtopicName)))).toBe(true);
  });

  it('does not include an unpublished subtopic\'s name (no approved teaching for it)', () => {
    const subtopicName = 'Some Unpublished Subtopic';
    const rawByChapter = new Map([[1, [teachingDoc({ blocks: [] }), cardDoc(subtopicName, [{ front: 'f', back: 'b' }])]]]);
    const blobs = computePublicBlobs(rawByChapter);
    expect(blobs.some((b) => b.includes(canon(subtopicName)))).toBe(false);
  });

  // Regressions for the reviewer-reported divergence: the extractor must
  // derive "public" text from the SAME strict validation the website
  // renderer applies (src/lib/teaching.ts, re-exported from
  // scripts/lib/teachingNormalize.mjs), not a looser approximation. Each
  // case below is content the website would NEVER render — so it must
  // never appear in the public exclusion blob either.
  describe('matches the website renderer\'s strict rejections exactly', () => {
    it('rejects text from duplicate teaching documents (reviewer-reported scenario)', () => {
      const duplicateText = 'This duplicate-document teaching text must never be treated as public because both copies are rejected';
      const rawByChapter = new Map([
        [1, [teachingDoc({ blocks: [{ type: 'paragraph', text: duplicateText }] }), teachingDoc({ blocks: [{ type: 'paragraph', text: duplicateText }] })]],
      ]);
      const blobs = computePublicBlobs(rawByChapter);
      expect(blobs.some((b) => b.includes(canon(duplicateText)))).toBe(false);
    });

    it('rejects ALL chapter-teaching text when one block is malformed (the whole doc is void, not just the bad block)', () => {
      const goodText = 'This paragraph is well formed but sits in a document that also contains one malformed block';
      const rawByChapter = new Map([
        [
          1,
          [
            teachingDoc({
              blocks: [
                { type: 'paragraph', text: goodText },
                { type: 'paragraph', segments: [] }, // malformed: empty segments
              ],
            }),
          ],
        ],
      ]);
      const blobs = computePublicBlobs(rawByChapter);
      expect(blobs.some((b) => b.includes(canon(goodText)))).toBe(false);
    });

    it('rejects a subtopic entry whose slug duplicates another entry\'s slug', () => {
      const dupSubtopicText = 'This duplicate subtopic slug teaching text must never be treated as public';
      const rawByChapter = new Map([
        [
          1,
          [
            teachingDoc({
              blocks: [],
              subtopics: [
                { subtopicSlug: 'savings-vs-investments', subtopic: 'Savings vs Investments', status: 'approved', blocks: [{ type: 'paragraph', text: dupSubtopicText }] },
                { subtopicSlug: 'savings-vs-investments', subtopic: 'Savings vs Investments', status: 'approved', blocks: [{ type: 'paragraph', text: 'other copy' }] },
              ],
            }),
            cardDoc('Savings vs Investments', [{ front: 'f', back: 'b' }]),
          ],
        ],
      ]);
      const blobs = computePublicBlobs(rawByChapter);
      expect(blobs.some((b) => b.includes(canon(dupSubtopicText)))).toBe(false);
    });

    it('rejects a subtopic entry whose stored slug drifts from the canonical slug of its own subtopic text', () => {
      const driftText = 'This identity-drift subtopic teaching text must never be treated as public';
      const rawByChapter = new Map([
        [
          1,
          [
            teachingDoc({
              blocks: [],
              subtopics: [
                { subtopicSlug: 'wrong-slug', subtopic: 'Savings vs Investments', status: 'approved', blocks: [{ type: 'paragraph', text: driftText }] },
              ],
            }),
            cardDoc('Savings vs Investments', [{ front: 'f', back: 'b' }]),
          ],
        ],
      ]);
      const blobs = computePublicBlobs(rawByChapter);
      expect(blobs.some((b) => b.includes(canon(driftText)))).toBe(false);
    });

    it('rejects an orphan subtopic entry with no matching real flashcard subtopic in the deck', () => {
      const orphanText = 'This orphan subtopic teaching text must never be treated as public because no matching deck subtopic exists';
      const rawByChapter = new Map([
        [
          1,
          [
            teachingDoc({
              blocks: [],
              subtopics: [
                { subtopicSlug: 'savings-vs-investments', subtopic: 'Savings vs Investments', status: 'approved', blocks: [{ type: 'paragraph', text: orphanText }] },
              ],
            }),
            // No cardDoc('Savings vs Investments', ...) — orphan, not a real deck subtopic.
          ],
        ],
      ]);
      const blobs = computePublicBlobs(rawByChapter);
      expect(blobs.some((b) => b.includes(canon(orphanText)))).toBe(false);
    });
  });
});

describe('partitionFreeFieldFps', () => {
  const longOverlap = 'Safety, liquidity, and returns are the three evaluation factors for any investment';
  const longDistinguishable = 'This distinguishable free-question stem never appears in any teaching or sampler content';

  it('excludes a free field fingerprint that legitimately overlaps with approved teaching/sampler text', () => {
    const rawByChapter = new Map([[1, [teachingDoc({ blocks: [{ type: 'paragraph', text: longOverlap }] })]]]);
    const publicBlobs = computePublicBlobs(rawByChapter);
    const freeQuestion = { question: longOverlap, options: [], explanation: '' };
    const freeByChapter = new Map([[1, [freeQuestion]]]);

    const { all, scannable, excludedCount } = partitionFreeFieldFps(freeByChapter, publicBlobs);
    expect(all).toEqual(fieldFingerprints(freeQuestion));
    expect(scannable).toEqual([]);
    expect(excludedCount).toBe(all.length);
  });

  it('keeps a distinguishable free field fingerprint scannable (not excluded)', () => {
    const rawByChapter = new Map([[1, [teachingDoc()]]]);
    const publicBlobs = computePublicBlobs(rawByChapter);
    const freeQuestion = { question: longDistinguishable, options: [], explanation: '' };
    const freeByChapter = new Map([[1, [freeQuestion]]]);

    const { scannable, excludedCount } = partitionFreeFieldFps(freeByChapter, publicBlobs);
    expect(scannable).toEqual(fieldFingerprints(freeQuestion));
    expect(excludedCount).toBe(0);
  });

  it('never throws for empty maps', () => {
    expect(() => partitionFreeFieldFps(new Map(), [])).not.toThrow();
    expect(partitionFreeFieldFps(new Map(), [])).toEqual({ all: [], scannable: [], excludedCount: 0 });
  });

  // The exact scenario the reviewer reproduced: a duplicate teaching
  // document's text must stay scannable for a matching free question,
  // because the website rejects BOTH copies and never renders that text —
  // if the gate excluded it, a real leak of that text would go undetected.
  it('a free fingerprint matching a duplicate-teaching-document\'s text stays scannable (reviewer regression)', () => {
    const duplicateText = 'This duplicate-document teaching text must never exclude a matching free question fingerprint';
    const rawByChapter = new Map([
      [1, [teachingDoc({ blocks: [{ type: 'paragraph', text: duplicateText }] }), teachingDoc({ blocks: [{ type: 'paragraph', text: duplicateText }] })]],
    ]);
    const publicBlobs = computePublicBlobs(rawByChapter);
    const freeQuestion = { question: duplicateText, options: [], explanation: '' };
    const freeByChapter = new Map([[1, [freeQuestion]]]);

    const { scannable, excludedCount } = partitionFreeFieldFps(freeByChapter, publicBlobs);
    expect(scannable).toEqual(fieldFingerprints(freeQuestion));
    expect(excludedCount).toBe(0);
  });

  it('a free fingerprint matching an orphan subtopic entry\'s text stays scannable', () => {
    const orphanText = 'This orphan subtopic teaching text must never exclude a matching free question fingerprint either';
    const rawByChapter = new Map([
      [
        1,
        [
          teachingDoc({
            blocks: [],
            subtopics: [
              { subtopicSlug: 'savings-vs-investments', subtopic: 'Savings vs Investments', status: 'approved', blocks: [{ type: 'paragraph', text: orphanText }] },
            ],
          }),
        ],
      ],
    ]);
    const publicBlobs = computePublicBlobs(rawByChapter);
    const freeQuestion = { question: orphanText, options: [], explanation: '' };
    const freeByChapter = new Map([[1, [freeQuestion]]]);

    const { scannable, excludedCount } = partitionFreeFieldFps(freeByChapter, publicBlobs);
    expect(scannable).toEqual(fieldFingerprints(freeQuestion));
    expect(excludedCount).toBe(0);
  });
});
