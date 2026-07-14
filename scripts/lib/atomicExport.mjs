/**
 * Atomic export-tree replacement (M1-S6). The old export flow created
 * content/ and .leakcheck/ once and wrote INTO them, merging each run on top
 * of the last: a chapter that disappeared from Firestore left its stale
 * approved `.raw.json` behind, and that stale file kept producing a public
 * route on every subsequent build. Instead we build the whole export into a
 * fresh staging tree, validate it is complete, and only then atomically swap
 * it in for the live tree (old tree discarded wholesale, not merged).
 *
 * Extracted into scripts/lib so the staging/validation/swap logic is
 * unit-testable without a live Firestore credential, matching the pattern of
 * freeManifestExclusion.mjs / samplerManifest.mjs.
 */
import { mkdirSync, rmSync, renameSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** Remove any leftover directory and recreate it empty. Returns the path. */
export function freshDir(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Validate a staged export tree is complete before it is allowed to replace
 * the live one. Throws (aborting the export, leaving the old tree intact) if
 * any required artefact is missing or empty — a half-written staging tree
 * must never be swapped in.
 */
export function validateStagedExport(contentStage, leakStage) {
  const requireFile = (p, label) => {
    if (!existsSync(p)) throw new Error(`staged export invalid — missing ${label} (${p})`);
  };
  const requireNonEmptyDir = (p, label) => {
    if (!existsSync(p) || readdirSync(p).length === 0) {
      throw new Error(`staged export invalid — ${label} is empty (${p})`);
    }
  };
  requireNonEmptyDir(path.join(contentStage, 'questions'), 'content/questions');
  requireNonEmptyDir(path.join(contentStage, 'flashcards'), 'content/flashcards');
  requireFile(path.join(contentStage, 'chapter-stats.json'), 'content/chapter-stats.json');
  requireFile(path.join(leakStage, 'paid-manifest.json'), 'paid manifest');
  requireFile(path.join(leakStage, 'free-question-manifest.json'), 'free-question manifest');
  requireFile(path.join(leakStage, 'sampler-manifest.json'), 'sampler manifest');
}

/**
 * Replace every `final` directory with its freshly-built `staging`
 * counterpart as an all-or-nothing group. A directory rename cannot land
 * on top of an existing directory in one syscall, so each swap moves the
 * live tree aside to a `.previous` backup first, then renames staging into
 * place. Crucially the group is transactional:
 *   - the old generation (each `.previous` backup) is deleted ONLY after
 *     every pair has swapped in successfully;
 *   - if any rename throws, every already-swapped pair is rolled back to its
 *     backup before rethrowing.
 * So the caller's set of export trees (content/ + .leakcheck/) is always
 * entirely the new generation or entirely the old one — never a mix, and
 * never a `final` left missing because it was deleted before its replacement
 * landed. (An abrupt process kill mid-swap can still leave a recoverable
 * `.previous` backup on disk; a fresh export overwrites it via freshDir.)
 */
export function commitStaging(pairs) {
  for (const { staging } of pairs) {
    if (!existsSync(staging)) throw new Error(`cannot commit — staging dir missing: ${staging}`);
  }
  const committed = []; // { final, backup, hadOriginal } — for rollback / cleanup
  try {
    for (const { staging, final } of pairs) {
      const backup = `${final}.previous`;
      rmSync(backup, { recursive: true, force: true });
      const hadOriginal = existsSync(final);
      if (hadOriginal) renameSync(final, backup);
      try {
        renameSync(staging, final);
      } catch (err) {
        // This pair failed — restore its own live tree before unwinding.
        if (hadOriginal) renameSync(backup, final);
        throw err;
      }
      committed.push({ final, backup, hadOriginal });
    }
  } catch (err) {
    // Roll every already-swapped pair back to the old generation so the group
    // never ends up split across generations.
    for (const { final, backup, hadOriginal } of committed.reverse()) {
      rmSync(final, { recursive: true, force: true });
      if (hadOriginal) renameSync(backup, final);
    }
    throw err;
  }
  // Every pair swapped in — only now discard the old generation.
  for (const { backup } of committed) rmSync(backup, { recursive: true, force: true });
}
