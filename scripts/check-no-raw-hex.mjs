/**
 * check-no-raw-hex — design-system guard (CLAUDE.md §"Design system": "no
 * raw hex anywhere else"). The only file allowed to contain a hex colour
 * literal is src/styles/tokens.ts; everything else (including root-level
 * config files and tests) must reference tokens via Tailwind classes or the
 * tokens module. No exceptions — test/tokens.test.ts pins the locked
 * palette via a checksum (see that file), not literal hex, specifically so
 * this guard can scan it like any other file.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
]);
const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.css']);
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (SCAN_EXT.has(path.extname(p))) yield p;
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
