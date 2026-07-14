/**
 * Atomic, crash-safe publication of the build-time export (M1-S6, hardened in
 * the second re-review round).
 *
 * The export has two reader-facing trees — `content/` (SSG source) and
 * `.leakcheck/` (leak-gate manifests). The earlier approach renamed each of
 * the two directories into place separately, so a crash between the two
 * renames could leave `content/` and `.leakcheck/` from DIFFERENT generations,
 * and a crash mid-rename could leave a tree missing entirely. Two independent
 * directory renames can never be made a single atomic unit.
 *
 * Instead, both trees are published UNDER ONE generation directory
 * (`.export/<slot>/content`, `.export/<slot>/leakcheck`) and the reader paths
 * are stable symlinks that resolve through a single `.export/current` pointer:
 *
 *     content     -> .export/current/content
 *     .leakcheck  -> .export/current/leakcheck
 *     .export/current -> genA | genB   (the one thing that ever switches)
 *
 * Publishing is a single `rename()` of a new symlink onto `.export/current`,
 * which POSIX guarantees atomic — so BOTH trees switch generations together,
 * in one step. A crash before the rename leaves the previous generation fully
 * live; a crash after it leaves the new generation fully live. There is no
 * window in which the trees are mixed or missing, and therefore no recovery
 * pass is needed. Generations ping-pong between two slots, so at most the
 * current + one previous generation exist on disk (the previous is a free
 * manual rollback point; the next run overwrites it).
 *
 * Extracted into scripts/lib so it is unit-testable without a Firestore
 * credential, matching freeManifestExclusion.mjs / samplerManifest.mjs.
 */
import { mkdirSync, rmSync, renameSync, readlinkSync, symlinkSync, lstatSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

export const EXPORT_BASENAME = '.export';

function symlinkExists(p) {
  try {
    lstatSync(p); // lstat, not exists: a dangling symlink still "exists" here
    return true;
  } catch {
    return false;
  }
}

/**
 * Pick the inactive generation slot, wipe it, and create its empty content/
 * and leakcheck/ subtrees. Returns the paths the exporter writes into. The
 * live `current` generation is never touched, so a failure any time before
 * publishGeneration leaves the previous export fully intact.
 */
export function stageGeneration(exportDir) {
  mkdirSync(exportDir, { recursive: true });
  const current = path.join(exportDir, 'current');
  let active = null;
  if (symlinkExists(current)) {
    try {
      active = readlinkSync(current);
    } catch {
      active = null;
    }
  }
  // Build into whichever slot is NOT currently live.
  const slot = active === 'genA' ? 'genB' : 'genA';
  const genDir = path.join(exportDir, slot);
  rmSync(genDir, { recursive: true, force: true });
  const contentDir = path.join(genDir, 'content');
  const leakDir = path.join(genDir, 'leakcheck');
  mkdirSync(path.join(contentDir, 'questions'), { recursive: true });
  mkdirSync(path.join(contentDir, 'flashcards'), { recursive: true });
  mkdirSync(leakDir, { recursive: true });
  return { slot, genDir, contentDir, leakDir };
}

/**
 * Validate a staged generation is complete before it can be published.
 * Throws (leaving the live generation untouched) if any required artefact is
 * missing or empty — a half-written generation must never go live.
 */
export function validateStagedGeneration(contentDir, leakDir) {
  const requireFile = (p, label) => {
    if (!existsSync(p)) throw new Error(`staged export invalid — missing ${label} (${p})`);
  };
  const requireNonEmptyDir = (p, label) => {
    if (!existsSync(p) || readdirSync(p).length === 0) {
      throw new Error(`staged export invalid — ${label} is empty (${p})`);
    }
  };
  requireNonEmptyDir(path.join(contentDir, 'questions'), 'content/questions');
  requireNonEmptyDir(path.join(contentDir, 'flashcards'), 'content/flashcards');
  requireFile(path.join(contentDir, 'chapter-stats.json'), 'content/chapter-stats.json');
  requireFile(path.join(leakDir, 'paid-manifest.json'), 'paid manifest');
  requireFile(path.join(leakDir, 'free-question-manifest.json'), 'free-question manifest');
  requireFile(path.join(leakDir, 'sampler-manifest.json'), 'sampler manifest');
}

function ensureReaderSymlink(linkPath, target) {
  try {
    const st = lstatSync(linkPath);
    if (st.isSymbolicLink() && readlinkSync(linkPath) === target) return; // already correct
    rmSync(linkPath, { recursive: true, force: true }); // stale real dir or wrong link
  } catch {
    /* absent — fall through and create it */
  }
  symlinkSync(target, linkPath);
}

/**
 * Atomically publish the staged `slot` as the live generation, then ensure the
 * reader-facing `content`/`.leakcheck` symlinks resolve through `current`. The
 * ONLY publish step is the single `rename` onto `current`; everything after it
 * is idempotent and self-heals on re-run. `root` is the repo root that holds
 * the reader symlinks; `exportDir` is `<root>/.export`.
 */
export function publishGeneration(root, exportDir, slot) {
  const current = path.join(exportDir, 'current');
  const pending = path.join(exportDir, 'current.pending');
  rmSync(pending, { force: true });
  symlinkSync(slot, pending); // relative target within exportDir
  renameSync(pending, current); // ← the single atomic publish: both trees switch at once
  ensureReaderSymlink(path.join(root, 'content'), path.join(EXPORT_BASENAME, 'current', 'content'));
  ensureReaderSymlink(path.join(root, '.leakcheck'), path.join(EXPORT_BASENAME, 'current', 'leakcheck'));
}
