/**
 * check-no-raw-hex — design-system guard (CLAUDE.md §"Design system": "no
 * raw hex anywhere else"). The only file allowed to contain a hex colour
 * literal is src/styles/tokens.ts; everything else must reference tokens
 * via Tailwind classes or the tokens module.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const ALLOWED = new Set([path.join(SRC, 'styles', 'tokens.ts')]);
const SCAN_EXT = new Set(['.ts', '.tsx', '.css']);
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (SCAN_EXT.has(path.extname(p))) yield p;
  }
}

const offences = [];
for (const file of walk(SRC)) {
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
