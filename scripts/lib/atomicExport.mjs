/**
 * Atomic, crash-safe publication of the build-time export (M1-S6, hardened
 * across three re-review rounds).
 *
 * The export has two reader-facing trees — `content/` (SSG source) and
 * `.leakcheck/` (leak-gate manifests). Renaming those two directories into
 * place separately can never be one atomic unit, so a crash between the two
 * renames could leave them from DIFFERENT generations, or a crash mid-rename
 * could leave a reader path missing.
 *
 * Instead, both trees live UNDER ONE generation directory
 * (`.export/<slot>/content`, `.export/<slot>/leakcheck`) and the reader paths
 * are STABLE symlinks that resolve through a single `.export/current` pointer:
 *
 *     content     -> .export/current/content
 *     .leakcheck  -> .export/current/leakcheck
 *     .export/current -> genA | genB      (the one thing a publish switches)
 *
 * Steady-state publishing is a single `rename()` of a new symlink onto
 * `.export/current`, which POSIX guarantees atomic — BOTH trees switch
 * generations together, or not at all.
 *
 * The reader symlinks are installed ONCE, by `ensureReaderLayout`, which the
 * exporter calls at startup BEFORE it stages or publishes anything — so by the
 * time `publishGeneration` switches `current`, both stable symlinks already
 * exist (they are never touched again). `ensureReaderLayout` also performs the
 * one-time migration from the legacy real-directory layout, and is fully
 * idempotent/recoverable: it captures any legacy real `content/`/`.leakcheck/`
 * into ONE generation (both into the same slot, so the two trees can never end
 * up from different generations) and points `current` at it with a single
 * atomic switch; a crash mid-migration leaves only a transient MISSING reader
 * path (never a mixed generation), which the next startup re-reconciles before
 * anything reads. Generations ping-pong between two slots (at most current +
 * one previous on disk; the previous is a free rollback point).
 *
 * Extracted into scripts/lib so it is unit-testable without a Firestore
 * credential, matching freeManifestExclusion.mjs / samplerManifest.mjs.
 */
import { mkdirSync, rmSync, renameSync, readlinkSync, symlinkSync, lstatSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

export const EXPORT_BASENAME = '.export';

function symlinkExists(p) {
  try {
    lstatSync(p); // lstat, not existsSync: a dangling symlink still "exists" here
    return true;
  } catch {
    return false;
  }
}

function isRealDirectory(p) {
  try {
    const st = lstatSync(p);
    return st.isDirectory() && !st.isSymbolicLink();
  } catch {
    return false;
  }
}

/** Atomically point `current` at `slot` (a single POSIX rename of a symlink). */
function switchCurrent(exportDir, slot) {
  const current = path.join(exportDir, 'current');
  const pending = path.join(exportDir, 'current.pending');
  rmSync(pending, { force: true });
  symlinkSync(slot, pending); // relative target within exportDir
  renameSync(pending, current); // ← atomic publish
}

function ensureReaderSymlink(linkPath, target) {
  try {
    const st = lstatSync(linkPath);
    if (st.isSymbolicLink() && readlinkSync(linkPath) === target) return; // already correct
    // A real directory here would be unexpected (legacy dirs are captured into
    // a generation earlier); remove it so the rename below can install the link.
    if (st.isDirectory() && !st.isSymbolicLink()) rmSync(linkPath, { recursive: true, force: true });
  } catch {
    /* absent — fall through and create it */
  }
  // Create/replace the reader symlink ATOMICALLY: build it at a temp path, then
  // rename onto linkPath (POSIX rename atomically replaces an existing symlink,
  // or creates it if absent). So even repairing a wrong link never leaves the
  // reader path missing.
  const tmp = `${linkPath}.linktmp`;
  rmSync(tmp, { force: true });
  symlinkSync(target, tmp);
  renameSync(tmp, linkPath);
}

/** Capture a legacy real reader dir into a generation slot, or create an empty subtree. Idempotent. */
function captureOrCreate(readerPath, genTarget, subdirs) {
  if (existsSync(genTarget)) return; // already captured (recovery re-run)
  mkdirSync(path.dirname(genTarget), { recursive: true }); // ensure the slot dir exists first
  if (isRealDirectory(readerPath)) {
    renameSync(readerPath, genTarget); // preserve the legacy real dir AS this generation
  } else {
    mkdirSync(genTarget, { recursive: true });
    for (const d of subdirs) mkdirSync(path.join(genTarget, d), { recursive: true });
  }
}

/**
 * Guarantee the stable reader layout exists BEFORE any publish, and complete
 * the one-time migration from the legacy real-directory export. Idempotent and
 * recoverable — safe to call at every export startup; it repairs any partial
 * migration left by an earlier crash. `root` holds the reader symlinks;
 * `exportDir` is `<root>/.export`.
 */
export function ensureReaderLayout(root, exportDir) {
  mkdirSync(exportDir, { recursive: true });
  const current = path.join(exportDir, 'current');
  const contentLink = path.join(root, 'content');
  const leakLink = path.join(root, '.leakcheck');

  // Bootstrap `current` if it does not yet resolve to a generation. Capture
  // any legacy real reader dirs into ONE slot (so the two trees are never from
  // different generations), then switch `current` to it atomically.
  if (!symlinkExists(current)) {
    const slot = 'genA';
    captureOrCreate(contentLink, path.join(exportDir, slot, 'content'), ['questions', 'flashcards']);
    captureOrCreate(leakLink, path.join(exportDir, slot, 'leakcheck'), []);
    switchCurrent(exportDir, slot);
  }

  // Install/repair the stable reader symlinks. They point through `current`, so
  // once they exist a publish only ever switches `current` — never these.
  ensureReaderSymlink(contentLink, path.join(EXPORT_BASENAME, 'current', 'content'));
  ensureReaderSymlink(leakLink, path.join(EXPORT_BASENAME, 'current', 'leakcheck'));
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
  const slot = active === 'genA' ? 'genB' : 'genA'; // build into whichever slot is NOT live
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
 * Validate a staged generation is complete before it can be published. Throws
 * (leaving the live generation untouched) if any required artefact is missing
 * or empty — a half-written generation must never go live.
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

/**
 * Publish the staged `slot` as the live generation. The reader symlinks must
 * already exist (installed by ensureReaderLayout at startup), so this is the
 * single atomic `current` switch — both content/ and .leakcheck/ go live
 * together, or not at all.
 */
export function publishGeneration(exportDir, slot) {
  switchCurrent(exportDir, slot);
}
