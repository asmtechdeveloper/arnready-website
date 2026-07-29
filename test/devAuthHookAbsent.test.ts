import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The dev-only sign-in hook (M5 D13) must NOT reach the production static
 * export. `installDevAuthHook` gates its whole body on
 * `process.env.NODE_ENV !== 'production'`, which Next inlines to `false` for
 * `next build`, so the affordance is dead-code eliminated. This scans the real
 * `out/` for the marker string and fails if any build artefact still carries
 * it.
 *
 * SKIP-SAFE: if `out/` is absent (no build in this working tree yet), the test
 * is skipped rather than passing vacuously — the packet's evidence is the
 * authoritative run, produced from the final build. When `out/` exists (CI, or
 * after `npm run build`), this runs and must be clean.
 */
const OUT_DIR = path.resolve(import.meta.dirname, '..', 'out');
const MARKER = '__arnreadyDevAuth';

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

describe('dev sign-in hook is absent from the production export (D13)', () => {
  it.skipIf(!existsSync(OUT_DIR))(`no out/ artefact contains "${MARKER}"`, () => {
    const offenders: string[] = [];
    for (const file of walk(OUT_DIR)) {
      // Text-ish assets only; the export is HTML/JS/CSS/JSON/XML/TXT.
      if (!/\.(html?|js|mjs|css|json|txt|xml|map)$/.test(file)) continue;
      if (readFileSync(file, 'utf8').includes(MARKER)) {
        offenders.push(path.relative(OUT_DIR, file));
      }
    }
    expect(offenders, `dev hook leaked into: ${offenders.join(', ')}`).toEqual([]);
  });
});
