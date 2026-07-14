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
 * Atomically replace each `final` directory with its freshly-built `staging`
 * counterpart: discard the old final tree, then rename staging into place.
 * The rename is the atomic step — a build reading the final tree sees either
 * the entire old export or the entire new one, never a partial merge.
 */
export function commitStaging(pairs) {
  for (const { staging, final } of pairs) {
    if (!existsSync(staging)) throw new Error(`cannot commit — staging dir missing: ${staging}`);
    rmSync(final, { recursive: true, force: true });
    renameSync(staging, final);
  }
}
