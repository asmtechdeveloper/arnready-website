import { describe, expect, it, vi } from 'vitest';
import { normalizeChapterTeaching, normalizeSubtopicTeaching } from '@/lib/teaching';

const paragraph = (text: string) => ({ type: 'paragraph', text });
const validDoc = (overrides: Record<string, unknown> = {}) => ({
  docType: 'chapterTeaching',
  chapter: 1,
  status: 'approved',
  contentVersion: 'v1',
  blocks: [paragraph('Intro paragraph.')],
  ...overrides,
});

const subtopicDoc = (subtopic: string) => ({ chapter: 1, subtopic, cards: [{ front: 'f', back: 'b' }] });

describe('normalizeChapterTeaching', () => {
  it('normalizes a valid approved doc', () => {
    const result = normalizeChapterTeaching([validDoc()], 1);
    expect(result).toEqual({
      chapter: 1,
      contentVersion: 'v1',
      blocks: [{ type: 'paragraph', segments: [{ text: 'Intro paragraph.', emphasis: 'regular' }] }],
    });
  });

  it('returns null and never throws for missing status', () => {
    const doc = validDoc();
    // @ts-expect-error deliberately malformed fixture
    delete doc.status;
    expect(() => normalizeChapterTeaching([doc], 1)).not.toThrow();
    expect(normalizeChapterTeaching([doc], 1)).toBeNull();
  });

  it('returns null and never throws for wrong chapter', () => {
    const doc = validDoc({ chapter: 2 });
    expect(() => normalizeChapterTeaching([doc], 1)).not.toThrow();
    expect(normalizeChapterTeaching([doc], 1)).toBeNull();
  });

  it("never throws and returns null for type: 'constructor' block (prototype pollution attempt)", () => {
    const doc = validDoc({ blocks: [{ type: 'constructor', text: 'x' }] });
    expect(() => normalizeChapterTeaching([doc], 1)).not.toThrow();
    // Unsupported type is skipped, leaving zero supported blocks → unavailable.
    expect(normalizeChapterTeaching([doc], 1)).toBeNull();
  });

  it("never throws and returns null for type: 'valueOf' block (prototype pollution attempt)", () => {
    const doc = validDoc({ blocks: [{ type: 'valueOf', text: 'x' }] });
    expect(() => normalizeChapterTeaching([doc], 1)).not.toThrow();
    expect(normalizeChapterTeaching([doc], 1)).toBeNull();
  });

  it('never throws and returns null for empty segments', () => {
    const doc = validDoc({ blocks: [{ type: 'paragraph', segments: [] }] });
    expect(() => normalizeChapterTeaching([doc], 1)).not.toThrow();
    expect(normalizeChapterTeaching([doc], 1)).toBeNull();
  });

  it('never throws for null/undefined/garbage input', () => {
    expect(() => normalizeChapterTeaching(null, 1)).not.toThrow();
    expect(() => normalizeChapterTeaching(undefined, 1)).not.toThrow();
    expect(() => normalizeChapterTeaching([null, 'x', 42, { weird: true }], 1)).not.toThrow();
    expect(normalizeChapterTeaching(null, 1)).toBeNull();
  });

  it('never throws when rawDocs itself is not an array (malformed Firestore export)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => normalizeChapterTeaching({} as unknown, 1)).not.toThrow();
    expect(() => normalizeChapterTeaching('not-an-array' as unknown, 1)).not.toThrow();
    expect(() => normalizeChapterTeaching(42 as unknown, 1)).not.toThrow();
    expect(normalizeChapterTeaching({} as unknown, 1)).toBeNull();
    spy.mockRestore();
  });

  it('never throws when status or chapter is a conversion-poison object ({ toString: null, valueOf: null })', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const poison = { toString: null, valueOf: null };
    const docBadStatus = validDoc({ status: poison });
    const docBadChapter = validDoc({ chapter: poison });
    expect(() => normalizeChapterTeaching([docBadStatus], 1)).not.toThrow();
    expect(() => normalizeChapterTeaching([docBadChapter], 1)).not.toThrow();
    expect(normalizeChapterTeaching([docBadStatus], 1)).toBeNull();
    expect(normalizeChapterTeaching([docBadChapter], 1)).toBeNull();
    spy.mockRestore();
  });

  it('never throws when an unsupported block type is a conversion-poison object', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doc = validDoc({ blocks: [{ type: { toString: null, valueOf: null }, text: 'x' }] });
    expect(() => normalizeChapterTeaching([doc], 1)).not.toThrow();
    expect(normalizeChapterTeaching([doc], 1)).toBeNull();
    spy.mockRestore();
  });

  it('rejects a doc when more than one teaching doc is present', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(normalizeChapterTeaching([validDoc(), validDoc()], 1)).toBeNull();
    spy.mockRestore();
  });

  it('ignores drafts — only approved status renders', () => {
    const doc = validDoc({ status: 'draft' });
    expect(normalizeChapterTeaching([doc], 1)).toBeNull();
  });

  it('skips an unsupported block type but keeps supported ones', () => {
    const doc = validDoc({
      blocks: [{ type: 'paragraph', text: 'Kept.' }, { type: 'video', url: 'x' }],
    });
    const result = normalizeChapterTeaching([doc], 1);
    expect(result?.blocks).toHaveLength(1);
  });

  it('normalizes heading and bullets blocks, legacy string items included', () => {
    const doc = validDoc({
      blocks: [
        { type: 'heading', text: 'H' },
        { type: 'bullets', items: ['one', { segments: [{ text: 'two', emphasis: 'bold' }] }] },
      ],
    });
    const result = normalizeChapterTeaching([doc], 1);
    expect(result?.blocks).toEqual([
      { type: 'heading', segments: [{ text: 'H', emphasis: 'regular' }] },
      {
        type: 'bullets',
        items: [
          { segments: [{ text: 'one', emphasis: 'regular' }] },
          { segments: [{ text: 'two', emphasis: 'bold' }] },
        ],
      },
    ]);
  });
});

describe('normalizeSubtopicTeaching', () => {
  const validSubtopics = [
    {
      subtopicSlug: 'savings-vs-investments',
      subtopic: 'Savings vs Investments',
      status: 'approved',
      contentVersion: 'v1',
      blocks: [paragraph('Save first.')],
    },
  ];

  it('normalizes approved entries whose slug matches a real deck subtopic', () => {
    const doc = validDoc({ subtopics: validSubtopics });
    const raw = [doc, subtopicDoc('Savings vs Investments')];
    const result = normalizeSubtopicTeaching(raw, 1);
    expect(result['savings-vs-investments']).toEqual({
      subtopicSlug: 'savings-vs-investments',
      subtopic: 'Savings vs Investments',
      contentVersion: 'v1',
      blocks: [{ type: 'paragraph', segments: [{ text: 'Save first.', emphasis: 'regular' }] }],
    });
  });

  it('returns empty object (never throws) when doc has no subtopics field', () => {
    const doc = validDoc();
    expect(() => normalizeSubtopicTeaching([doc], 1)).not.toThrow();
    expect(normalizeSubtopicTeaching([doc], 1)).toEqual({});
  });

  it('skips an entry whose slug is not a real flashcard subtopic of the chapter', () => {
    const doc = validDoc({ subtopics: validSubtopics });
    // No matching subtopicDoc supplied — slug not in the real deck.
    const result = normalizeSubtopicTeaching([doc], 1);
    expect(result).toEqual({});
  });

  it('rejects duplicate subtopicSlug entries entirely', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doc = validDoc({ subtopics: [...validSubtopics, ...validSubtopics] });
    const raw = [doc, subtopicDoc('Savings vs Investments')];
    const result = normalizeSubtopicTeaching(raw, 1);
    expect(result).toEqual({});
    spy.mockRestore();
  });

  it('rejects an entry whose stored slug drifts from the canonical slug of its subtopic text', () => {
    const doc = validDoc({
      subtopics: [{ ...validSubtopics[0], subtopicSlug: 'wrong-slug' }],
    });
    const raw = [doc, subtopicDoc('Savings vs Investments')];
    expect(normalizeSubtopicTeaching(raw, 1)).toEqual({});
  });

  it('never throws when rawDocs itself is not an array (malformed Firestore export)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doc = validDoc({ subtopics: validSubtopics });
    expect(() => normalizeSubtopicTeaching(doc, 1)).not.toThrow();
    expect(() => normalizeSubtopicTeaching('not-an-array', 1)).not.toThrow();
    expect(normalizeSubtopicTeaching('not-an-array', 1)).toEqual({});
    spy.mockRestore();
  });

  it('never throws and skips an entry whose status is a conversion-poison object', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const poison = { toString: null, valueOf: null };
    const doc = validDoc({ subtopics: [{ ...validSubtopics[0], status: poison }] });
    const raw = [doc, subtopicDoc('Savings vs Investments')];
    expect(() => normalizeSubtopicTeaching(raw, 1)).not.toThrow();
    expect(normalizeSubtopicTeaching(raw, 1)).toEqual({});
    spy.mockRestore();
  });

  it('never throws for a malformed subtopics array (not an array)', () => {
    const doc = validDoc({ subtopics: 'not-an-array' });
    expect(() => normalizeSubtopicTeaching([doc], 1)).not.toThrow();
    expect(normalizeSubtopicTeaching([doc], 1)).toEqual({});
  });

  it("never throws on type: 'constructor' entry shape and skips it", () => {
    const doc = validDoc({
      subtopics: [{ type: 'constructor', subtopicSlug: 'x', subtopic: 'X', status: 'approved', blocks: [] }],
    });
    expect(() => normalizeSubtopicTeaching([doc], 1)).not.toThrow();
    expect(normalizeSubtopicTeaching([doc], 1)).toEqual({});
  });

  it('isolates a malformed entry from valid siblings', () => {
    const doc = validDoc({
      subtopics: [
        ...validSubtopics,
        { subtopicSlug: 'broken', subtopic: 'Broken', status: 'approved', blocks: [] },
      ],
    });
    const raw = [doc, subtopicDoc('Savings vs Investments'), subtopicDoc('Broken')];
    const result = normalizeSubtopicTeaching(raw, 1);
    expect(Object.keys(result)).toEqual(['savings-vs-investments']);
  });
});
