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
 */

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, ent) => {
    if (ent[0] === '#') {
      const isHex = ent[1] === 'x' || ent[1] === 'X';
      const codePoint = isHex ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return NAMED_ENTITIES[ent] ?? match;
  });
}

/** Canonical form used for fingerprint matching: entity-decoded, alphanumerics only. */
export const canon = (s) => decodeEntities(String(s)).toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Fingerprint = question + options, canonicalised, full length (no
 * truncation — see module doc). Question text alone is too generic
 * ("Which of the following…" collides across unrelated questions);
 * including options makes accidental collision between genuinely different
 * questions practically impossible.
 */
export const fingerprint = (q) =>
  canon(String(q.question) + (Array.isArray(q.options) ? q.options.join('') : ''));
