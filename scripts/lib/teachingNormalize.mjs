/**
 * Ported from ../ARNReady-App/services/flashcardTeaching.js (manual §0.3 —
 * teaching normalization is ported, never re-derived). Pure functions only.
 * Behaviour, including the total-function guarantee (never throws;
 * malformed input normalizes to null/skipped), is preserved exactly.
 *
 * THE single source of truth for teaching normalization (Blocker 3):
 * src/lib/teaching.ts is a thin typed wrapper around this module, and
 * scripts/export-content.mjs's free-manifest exclusion (scripts/lib/
 * freeManifestExclusion.mjs) calls it directly. Before this module existed,
 * export-content.mjs used a lighter, hand-rolled approximation that skipped
 * the duplicate-teaching-doc rejection, malformed-block rejection, and
 * duplicate/drifting/orphan subtopic-slug rejection the real website
 * renderer applies — so content the website would NEVER show as public
 * (e.g. text from a REJECTED duplicate teaching doc) could still get a free
 * question's field fingerprint excluded from the leak scan. Deriving both
 * the website's render and the leak-gate's "is this text public" decision
 * from the exact same function eliminates that divergence entirely, rather
 * than requiring the two implementations to be kept in lockstep by hand.
 *
 * Object-injection guard (manual M1 step 1): block-type dispatch below uses
 * Object.hasOwn(BLOCK_TYPES, block.type) rather than `BLOCK_TYPES[block.type]`
 * bare lookup, so a doc carrying `type: 'constructor'` or `type: 'valueOf'`
 * can never resolve to an inherited Object.prototype member.
 */
import { subtopicSlug } from './canonicalDeck.mjs';

const TEACHING_DOC_TYPE = 'chapterTeaching';

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Stringifies an untrusted value for a diagnostic message WITHOUT invoking
 * its own `toString`/`valueOf`/`Symbol.toPrimitive` — a Firestore-shaped doc
 * can legally carry a field like `{ toString: null, valueOf: null }`, and a
 * bare template-literal interpolation (`` `${value}` ``) throws a TypeError
 * on such a value instead of normalizing to null. `Object.prototype.toString
 * .call` is the built-in's own implementation, never the value's, so it
 * cannot be hijacked this way.
 */
function safeDiagnostic(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint' || t === 'symbol' || t === 'undefined') {
    return String(value);
  }
  try {
    return Object.prototype.toString.call(value);
  } catch {
    return '(unprintable)';
  }
}

const EMPHASIS = new Set(['regular', 'bold', 'italic', 'boldItalic']);

function normalizeSegments(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const segments = [];
  for (const seg of raw) {
    if (seg == null || typeof seg !== 'object') return null;
    if (!nonEmptyString(seg.text)) return null;
    const emphasis = seg.emphasis === undefined ? 'regular' : seg.emphasis;
    if (!EMPHASIS.has(emphasis)) return null;
    segments.push({ text: seg.text, emphasis });
  }
  return segments;
}

function normalizeInline(unit) {
  if (unit.text !== undefined && unit.segments !== undefined) return null;
  if (unit.segments !== undefined) return normalizeSegments(unit.segments);
  return nonEmptyString(unit.text) ? [{ text: unit.text, emphasis: 'regular' }] : null;
}

function normalizeBulletItem(item) {
  if (typeof item === 'string') {
    return nonEmptyString(item) ? [{ text: item, emphasis: 'regular' }] : null;
  }
  if (item != null && typeof item === 'object') {
    if (item.text !== undefined) return null;
    return normalizeSegments(item.segments);
  }
  return null;
}

// Object.create(null) — no inherited Object.prototype members, so an
// attacker-controlled `block.type` of 'constructor'/'toString'/etc. can
// never resolve to anything but `undefined` here.
const BLOCK_TYPES = Object.assign(Object.create(null), {
  paragraph: (b) => {
    const segments = normalizeInline(b);
    return segments ? { type: 'paragraph', segments } : null;
  },
  heading: (b) => {
    const segments = normalizeInline(b);
    return segments ? { type: 'heading', segments } : null;
  },
  bullets: (b) => {
    if (!Array.isArray(b.items) || b.items.length === 0) return null;
    const items = [];
    for (const item of b.items) {
      const segments = normalizeBulletItem(item);
      if (segments == null) return null;
      items.push({ segments });
    }
    return { type: 'bullets', items };
  },
});

function unavailable(chapter, reason) {
  console.warn(`[teaching] chapter ${chapter}: teaching unavailable — ${reason}`);
  return null;
}

function selectTeachingDoc(rawDocs, chapter) {
  const docs = Array.isArray(rawDocs) ? rawDocs : [];
  const matches = docs.filter((doc) => doc != null && typeof doc === 'object' && doc.docType === TEACHING_DOC_TYPE);
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    return unavailable(chapter, `${matches.length} teaching docs found (expected one)`);
  }
  const doc = matches[0];
  if (doc.status !== 'approved') {
    return unavailable(chapter, `status '${safeDiagnostic(doc.status)}' is not 'approved'`);
  }
  if (doc.chapter !== chapter) {
    return unavailable(chapter, `doc chapter ${safeDiagnostic(doc.chapter)} does not match`);
  }
  return doc;
}

function normalizeBlocks(rawBlocks, warnScope) {
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    return { ok: false, reason: 'blocks missing or empty' };
  }
  const blocks = [];
  for (const block of rawBlocks) {
    const type = block != null && typeof block === 'object' ? block.type : undefined;
    const supported = typeof type === 'string' && Object.hasOwn(BLOCK_TYPES, type);
    const normalize = supported ? BLOCK_TYPES[type] : null;
    if (!normalize) {
      console.warn(`[teaching] ${warnScope}: skipping unsupported block type '${safeDiagnostic(type)}'`);
      continue;
    }
    const normalized = normalize(block);
    if (normalized == null) return { ok: false, reason: `malformed '${type}' block` };
    blocks.push(normalized);
  }
  if (blocks.length === 0) return { ok: false, reason: 'no supported blocks' };
  return { ok: true, blocks };
}

function normalizeChapterTeachingFromDoc(doc, chapter) {
  if (doc == null) return null;
  const result = normalizeBlocks(doc.blocks, `chapter ${chapter}`);
  if (!result.ok) return unavailable(chapter, result.reason);
  return {
    chapter,
    contentVersion: nonEmptyString(doc.contentVersion) ? doc.contentVersion : null,
    blocks: result.blocks,
  };
}

function normalizeSubtopicTeachingFromDoc(doc, chapter, rawDocs) {
  if (doc == null || doc.subtopics == null) return {};
  if (!Array.isArray(doc.subtopics)) {
    console.warn(`[teaching] chapter ${chapter}: subtopics is not an array — none delivered`);
    return {};
  }

  const validSlugs = new Set(
    (Array.isArray(rawDocs) ? rawDocs : [])
      .filter((d) => d != null && typeof d === 'object' && d.docType == null && nonEmptyString(d.subtopic))
      .map((d) => subtopicSlug(d.subtopic)),
  );

  const slugCounts = new Map();
  for (const entry of doc.subtopics) {
    const s = entry?.subtopicSlug;
    if (nonEmptyString(s)) slugCounts.set(s, (slugCounts.get(s) ?? 0) + 1);
  }

  const bySlug = {};
  const skip = (label, reason) => {
    console.warn(`[teaching] chapter ${chapter}: subtopic teaching '${label}' rejected — ${reason}`);
  };
  for (const entry of doc.subtopics) {
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
      skip(label, `status '${safeDiagnostic(entry.status)}' is not 'approved'`);
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

/**
 * Pure normalization: raw chapter docs → ChapterTeaching or null. Never
 * throws — `rawDocs` may be any Firestore-shaped JSON, including a
 * malformed non-array altogether.
 */
export function normalizeChapterTeaching(rawDocs, chapterNumber) {
  const chapter = Number(chapterNumber);
  return normalizeChapterTeachingFromDoc(selectTeachingDoc(rawDocs, chapter), chapter);
}

/** Pure normalization: raw chapter docs → { [subtopicSlug]: entry } (possibly empty). Never throws. */
export function normalizeSubtopicTeaching(rawDocs, chapterNumber) {
  const chapter = Number(chapterNumber);
  return normalizeSubtopicTeachingFromDoc(selectTeachingDoc(rawDocs, chapter), chapter, rawDocs);
}
