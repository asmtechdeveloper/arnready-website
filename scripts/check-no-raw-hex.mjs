/**
 * check-no-raw-hex — design-system guard (CLAUDE.md §"Design system": "no
 * raw hex anywhere else"). The only file allowed to contain a hex colour
 * literal is src/styles/tokens.ts; everything else (including root-level
 * config files and tests) must reference tokens via Tailwind classes or the
 * tokens module. No exceptions — test/tokens.test.ts pins the locked
 * palette via a checksum (see that file), not literal hex, specifically so
 * this guard can scan it like any other file.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ALLOWED = new Set([path.join(ROOT, 'src', 'styles', 'tokens.ts')]);
const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  'out',
  'content',
  '.leakcheck',
  '.git',
  'public',
  // Agent scratch space, including `.claude/worktrees/*` — each of those is a
  // SEPARATE checkout of this repo, so its own `src/styles/tokens.ts` is not
  // the allowlisted path and the guard flagged it as an illegal duplicate.
  // That made the mandatory lint gate depend on unrelated local state: it
  // passed or failed by whether a worktree happened to exist (Codex M6-B2).
  '.claude',
]);
const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.css']);
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

/**
 * True for a nested checkout of any repository — a git worktree (whose `.git`
 * is a FILE pointing at the real gitdir) or a nested clone (a `.git`
 * directory). Belt to `.claude`'s braces: this guard scans THIS working tree,
 * and a checkout nested anywhere under it is somebody else's tree whose
 * contents this gate must never judge.
 */
function isNestedCheckout(dir) {
  return dir !== ROOT && existsSync(path.join(dir, '.git'));
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      if (isNestedCheckout(p)) continue;
      yield* walk(p);
    } else if (SCAN_EXT.has(path.extname(p))) yield p;
  }
}

const offences = [];
for (const file of walk(ROOT)) {
  if (ALLOWED.has(file)) continue;
  const raw = readFileSync(file, 'utf8');
  const matches = raw.match(HEX_RE);
  if (matches) {
    offences.push(`${path.relative(ROOT, file)}: ${matches.join(', ')}`);
  }
}

if (offences.length > 0) {
  console.error('\nRAW-HEX GUARD FAILED — colours must come from src/styles/tokens.ts\n');
  console.error(offences.join('\n'));
  process.exit(1);
}

console.log('Raw-hex guard PASSED — no hex colour literals outside src/styles/tokens.ts.');
