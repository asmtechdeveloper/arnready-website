/**
 * Shared text-canonicalization + fingerprinting used by export-content.mjs
 * (writes fingerprints) and check-paid-leak.mjs (scans for them). A single
 * source of truth so the two scripts can never drift apart (M0-D1).
 *
 * M0-D1 fixes, both applied here:
 *   - Entity normalization: HTML/XML named + numeric entities are decoded
 *     BEFORE stripping non-alphanumerics. Without this, a build artifact
 *     that escapes the source text (e.g. sitemap.xml turning "P&L" into
 *     "P&amp;L") canonicalizes to a DIFFERENT string ("pampl" vs "pl") and
 *     a real leak silently evades the fingerprint scan.
 *   - No truncation: fingerprints are the FULL canonicalized text, not a
 *     120-char prefix. A shared prefix across two distinct questions (e.g.
 *     seed/variation pairs whose stems differ only near the end) used to
 *     collide on the same truncated fingerprint, which could either mask
 *     which question actually leaked or misfire on unrelated text that
 *     happens to share the truncated prefix.
 *
 * M1-B2 fix: decoding is REPEATED until the output stabilizes (bounded, so
 * pathological input can't loop forever). React/Next can double-escape
 * source text that already contains an entity — "P&L" becomes "P&amp;L" on
 * one escaping pass and "P&amp;amp;L" on two. A single decode pass turns
 * "&amp;amp;" into "&amp;" (still escaped), which stripping non-alphanumerics
 * then reads as literal letters "amp" rather than "&" — a different, wrong
 * canonical string that would let the double-escaped copy evade the scan.
 */

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const ENTITY_PATTERN = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g;
// Bounds repeated decoding against pathological/adversarial input (e.g. a
// string engineered to keep re-forming entities); ordinary double-escaping
// resolves in 2 passes, so this leaves generous headroom.
const MAX_ENTITY_DECODE_PASSES = 10;

function decodeEntitiesOnce(s) {
  return s.replace(ENTITY_PATTERN, (match, ent) => {
    if (ent[0] === '#') {
      const isHex = ent[1] === 'x' || ent[1] === 'X';
      const codePoint = isHex ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      // String.fromCodePoint throws (not just returns garbage) outside the
      // valid Unicode range — a malformed/adversarial numeric entity with a
      // too-large decimal value must normalize to itself, never crash
      // canonicalization.
      const isValidCodePoint = Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff;
      if (!isValidCodePoint) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[ent] ?? match;
  });
}

function decodeEntities(s) {
  let current = s;
  for (let pass = 0; pass < MAX_ENTITY_DECODE_PASSES; pass += 1) {
    const next = decodeEntitiesOnce(current);
    if (next === current) return next;
    current = next;
  }
  return current;
}

/** Canonical form used for fingerprint matching: entity-decoded, alphanumerics only. */
export const canon = (s) => decodeEntities(String(s)).toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * A field-level fingerprint is too short/generic to scan for reliably below
 * this length once canonicalised (matches the prior whole-blob policy) —
 * short fragments like "true" or "none" would false-positive on unrelated
 * content across the site.
 */
const MIN_FIELD_LENGTH = 24;

/**
 * Field-level fingerprints for a question: one per stem, per option, and
 * per explanation — NEVER concatenated. Realistic rendered HTML inserts
 * markup between these fields (e.g. `<p>{stem}</p><li>{option}</li>`), so a
 * single fingerprint requiring stem+options contiguous never matches real
 * output, and a stem-only or explanation-only leak was invisible to it.
 * Each field is canonicalised and checked independently; fields shorter
 * than MIN_FIELD_LENGTH once canonicalised are dropped (too generic to
 * scan for without false positives — see MIN_FIELD_LENGTH).
 */
export function fieldFingerprints(q) {
  const fields = [];
  if (q.question != null) fields.push(canon(q.question));
  if (Array.isArray(q.options)) {
    for (const opt of q.options) fields.push(canon(opt));
  }
  if (q.explanation) fields.push(canon(q.explanation));
  return fields.filter((fp) => fp.length >= MIN_FIELD_LENGTH);
}
