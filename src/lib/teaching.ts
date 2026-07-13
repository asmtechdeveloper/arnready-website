/**
 * Ported from ../ARNReady-App/services/flashcardTeaching.js (manual §0.3 —
 * teaching normalization is ported, never re-derived). Pure functions only;
 * the app's Firestore fetch/memo layer is out of scope for M1's static
 * build. Behaviour, including the total-function guarantee (never throws;
 * malformed input normalizes to null/skipped), is preserved exactly.
 *
 * Object-injection guard (manual M1 step 1): block-type dispatch below uses
 * Object.hasOwn(BLOCK_TYPES, block.type) rather than `BLOCK_TYPES[block.type]`
 * bare lookup, so a doc carrying `type: 'constructor'` or `type: 'valueOf'`
 * can never resolve to an inherited Object.prototype member.
 */
import { subtopicSlug } from './flashcardDeck';

const TEACHING_DOC_TYPE = 'chapterTeaching';

export type Emphasis = 'regular' | 'bold' | 'italic' | 'boldItalic';
export type Segment = { text: string; emphasis: Emphasis };
export type ParagraphBlock = { type: 'paragraph'; segments: Segment[] };
export type HeadingBlock = { type: 'heading'; segments: Segment[] };
export type BulletsBlock = { type: 'bullets'; items: { segments: Segment[] }[] };
export type TeachingBlock = ParagraphBlock | HeadingBlock | BulletsBlock;

export type ChapterTeaching = {
  chapter: number;
  contentVersion: string | null;
  blocks: TeachingBlock[];
};

export type SubtopicTeaching = {
  subtopicSlug: string;
  subtopic: string;
  contentVersion: string | null;
  blocks: TeachingBlock[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawDoc = Record<string, any>;

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

const EMPHASIS = new Set<Emphasis>(['regular', 'bold', 'italic', 'boldItalic']);

function normalizeSegments(raw: unknown): Segment[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const segments: Segment[] = [];
  for (const seg of raw) {
    if (seg == null || typeof seg !== 'object') return null;
    if (!nonEmptyString(seg.text)) return null;
    const emphasis = seg.emphasis === undefined ? 'regular' : seg.emphasis;
    if (!EMPHASIS.has(emphasis)) return null;
    segments.push({ text: seg.text, emphasis });
  }
  return segments;
}

function normalizeInline(unit: RawDoc): Segment[] | null {
  if (unit.text !== undefined && unit.segments !== undefined) return null;
  if (unit.segments !== undefined) return normalizeSegments(unit.segments);
  return nonEmptyString(unit.text) ? [{ text: unit.text, emphasis: 'regular' }] : null;
}

function normalizeBulletItem(item: unknown): Segment[] | null {
  if (typeof item === 'string') {
    return nonEmptyString(item) ? [{ text: item, emphasis: 'regular' }] : null;
  }
  if (item != null && typeof item === 'object') {
    const obj = item as RawDoc;
    if (obj.text !== undefined) return null;
    return normalizeSegments(obj.segments);
  }
  return null;
}

// Object.create(null) — no inherited Object.prototype members, so an
// attacker-controlled `block.type` of 'constructor'/'toString'/etc. can
// never resolve to anything but `undefined` here.
const BLOCK_TYPES: Record<string, (b: RawDoc) => TeachingBlock | null> = Object.assign(Object.create(null), {
  paragraph: (b: RawDoc): ParagraphBlock | null => {
    const segments = normalizeInline(b);
    return segments ? { type: 'paragraph', segments } : null;
  },
  heading: (b: RawDoc): HeadingBlock | null => {
    const segments = normalizeInline(b);
    return segments ? { type: 'heading', segments } : null;
  },
  bullets: (b: RawDoc): BulletsBlock | null => {
    if (!Array.isArray(b.items) || b.items.length === 0) return null;
    const items: { segments: Segment[] }[] = [];
    for (const item of b.items) {
      const segments = normalizeBulletItem(item);
      if (segments == null) return null;
      items.push({ segments });
    }
    return { type: 'bullets', items };
  },
});

function unavailable(chapter: number, reason: string): null {
  console.warn(`[teaching] chapter ${chapter}: teaching unavailable — ${reason}`);
  return null;
}

function selectTeachingDoc(rawDocs: RawDoc[] | null | undefined, chapter: number): RawDoc | null {
  const matches = (rawDocs ?? []).filter((doc) => doc != null && typeof doc === 'object' && doc.docType === TEACHING_DOC_TYPE);
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    return unavailable(chapter, `${matches.length} teaching docs found (expected one)`);
  }
  const doc = matches[0]!;
  if (doc.status !== 'approved') {
    return unavailable(chapter, `status '${doc.status}' is not 'approved'`);
  }
  if (doc.chapter !== chapter) {
    return unavailable(chapter, `doc chapter ${doc.chapter} does not match`);
  }
  return doc;
}

type BlockNormalizeResult = { ok: true; blocks: TeachingBlock[] } | { ok: false; reason: string };

function normalizeBlocks(rawBlocks: unknown, warnScope: string): BlockNormalizeResult {
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    return { ok: false, reason: 'blocks missing or empty' };
  }
  const blocks: TeachingBlock[] = [];
  for (const block of rawBlocks) {
    const type = block != null && typeof block === 'object' ? (block as RawDoc).type : undefined;
    const supported = typeof type === 'string' && Object.hasOwn(BLOCK_TYPES, type);
    const normalize = supported ? BLOCK_TYPES[type] : null;
    if (!normalize) {
      console.warn(`[teaching] ${warnScope}: skipping unsupported block type '${String(type)}'`);
      continue;
    }
    const normalized = normalize(block as RawDoc);
    if (normalized == null) return { ok: false, reason: `malformed '${type}' block` };
    blocks.push(normalized);
  }
  if (blocks.length === 0) return { ok: false, reason: 'no supported blocks' };
  return { ok: true, blocks };
}

function normalizeChapterTeachingFromDoc(doc: RawDoc | null, chapter: number): ChapterTeaching | null {
  if (doc == null) return null;
  const result = normalizeBlocks(doc.blocks, `chapter ${chapter}`);
  if (!result.ok) return unavailable(chapter, result.reason);
  return {
    chapter,
    contentVersion: nonEmptyString(doc.contentVersion) ? doc.contentVersion : null,
    blocks: result.blocks,
  };
}

function normalizeSubtopicTeachingFromDoc(
  doc: RawDoc | null,
  chapter: number,
  rawDocs: RawDoc[] | null | undefined,
): Record<string, SubtopicTeaching> {
  if (doc == null || doc.subtopics == null) return {};
  if (!Array.isArray(doc.subtopics)) {
    console.warn(`[teaching] chapter ${chapter}: subtopics is not an array — none delivered`);
    return {};
  }

  const validSlugs = new Set(
    (rawDocs ?? [])
      .filter((d) => d != null && typeof d === 'object' && d.docType == null && nonEmptyString(d.subtopic))
      .map((d) => subtopicSlug(d.subtopic)),
  );

  const slugCounts = new Map<string, number>();
  for (const entry of doc.subtopics) {
    const s = entry?.subtopicSlug;
    if (nonEmptyString(s)) slugCounts.set(s, (slugCounts.get(s) ?? 0) + 1);
  }

  const bySlug: Record<string, SubtopicTeaching> = {};
  const skip = (label: string, reason: string) => {
    console.warn(`[teaching] chapter ${chapter}: subtopic teaching '${label}' rejected — ${reason}`);
  };
  for (const entry of doc.subtopics as RawDoc[]) {
    const label = nonEmptyString(entry?.subtopicSlug)
      ? entry.subtopicSlug
      : nonEmptyString(entry?.subtopic)
        ? entry.subtopic
        : '(unlabelled)';
    if (entry == null || typeof entry !== 'object') {
      skip(label, 'not an object');
      continue;
    }
    if ((slugCounts.get(entry.subtopicSlug) ?? 0) > 1) {
      skip(label, 'duplicate subtopicSlug');
      continue;
    }
    if (entry.status !== 'approved') {
      skip(label, `status '${entry.status}' is not 'approved'`);
      continue;
    }
    if (!nonEmptyString(entry.subtopic)) {
      skip(label, 'subtopic missing');
      continue;
    }
    const slug = subtopicSlug(entry.subtopic);
    if (entry.subtopicSlug !== slug) {
      skip(label, `slug does not match canonical '${slug}' of its subtopic — identity drift`);
      continue;
    }
    if (!validSlugs.has(slug)) {
      skip(label, `'${slug}' is not a flashcard subtopic of this chapter`);
      continue;
    }
    const result = normalizeBlocks(entry.blocks, `chapter ${chapter} subtopic '${slug}'`);
    if (!result.ok) {
      skip(label, result.reason);
      continue;
    }
    bySlug[slug] = {
      subtopicSlug: slug,
      subtopic: entry.subtopic,
      contentVersion: nonEmptyString(entry.contentVersion) ? entry.contentVersion : null,
      blocks: result.blocks,
    };
  }
  return bySlug;
}

/** Pure normalization: raw chapter docs → ChapterTeaching or null. Never throws. */
export function normalizeChapterTeaching(rawDocs: RawDoc[] | null | undefined, chapterNumber: number): ChapterTeaching | null {
  const chapter = Number(chapterNumber);
  return normalizeChapterTeachingFromDoc(selectTeachingDoc(rawDocs, chapter), chapter);
}

/** Pure normalization: raw chapter docs → { [subtopicSlug]: entry } (possibly empty). Never throws. */
export function normalizeSubtopicTeaching(
  rawDocs: RawDoc[] | null | undefined,
  chapterNumber: number,
): Record<string, SubtopicTeaching> {
  const chapter = Number(chapterNumber);
  return normalizeSubtopicTeachingFromDoc(selectTeachingDoc(rawDocs, chapter), chapter, rawDocs);
}
