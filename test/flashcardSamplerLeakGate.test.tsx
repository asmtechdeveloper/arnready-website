import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FlashcardSampler } from '@/components/FlashcardSampler';
import { buildCanonicalDeck } from '../scripts/lib/canonicalDeck.mjs';
import { computeSamplerManifest } from '../scripts/lib/samplerManifest.mjs';

/**
 * End-to-end regression for M1-B5's cardId-collision defect: a prohibited
 * card (isFree:false) sitting at raw index 0, followed by a public card at
 * raw index 1. Before the fix, excluding index 0 renumbered the surviving
 * card to cardId "...:0" — the id a forced render of the excluded card
 * would ALSO use, defeating the sampler manifest's exact-ID check. This
 * exercises the full chain export → render → leak-gate, not just
 * buildCanonicalDeck in isolation.
 */
const teachingDoc = {
  docType: 'chapterTeaching',
  chapter: 1,
  status: 'approved',
  blocks: [{ type: 'paragraph', text: 'Chapter teaching text.' }],
};
const section = {
  chapter: 1,
  subtopic: 'Investors and Financial Goals',
  cards: [
    { front: 'Prohibited card front text', back: 'Prohibited card back text', isFree: false }, // raw index 0
    { front: 'Public card front text', back: 'Public card back text' }, // raw index 1
  ],
};
const rawDocs = [teachingDoc, section];
const rawByChapter = new Map([[1, rawDocs]]);

describe('M1-B5: export → render → leak-gate for a prohibited card before a public card', () => {
  it('1+2. buildCanonicalDeck (the shared export/render boundary) excludes the prohibited card and gives the public card its ORIGINAL id "...:1"', () => {
    const deck = buildCanonicalDeck(rawDocs, 1);
    expect(deck.cards).toHaveLength(1);
    expect(deck.cards[0]?.cardId).toBe('1:investors-and-financial-goals:1');
    expect(deck.cards[0]?.front).toBe('Public card front text');
  });

  it('1+2. the rendered page (FlashcardSampler — the actual component hub/spoke pages use) excludes the prohibited card\'s text and renders the public card under its original id', () => {
    const deck = buildCanonicalDeck(rawDocs, 1);
    const { container, queryByText, getByText } = render(<FlashcardSampler cards={deck.cards} />);

    expect(queryByText('Prohibited card front text')).toBeNull();
    expect(queryByText('Prohibited card back text')).toBeNull();
    expect(getByText('Public card front text')).toBeInTheDocument();
    expect(container.querySelector('[data-card-id="1:investors-and-financial-goals:1"]')).not.toBeNull();
    // The excluded card's original id must not appear anywhere either.
    expect(container.querySelector('[data-card-id="1:investors-and-financial-goals:0"]')).toBeNull();
  });

  describe('3. a forced render of the prohibited "...:0" card fails the postbuild leak gate', () => {
    const REPO_ROOT = path.resolve(import.meta.dirname, '..');
    const SCRIPT_SRC = path.join(REPO_ROOT, 'scripts', 'check-paid-leak.mjs');
    const LIB_SRC = path.join(REPO_ROOT, 'scripts', 'lib', 'canon.mjs');
    const MULTISCAN_SRC = path.join(REPO_ROOT, 'scripts', 'lib', 'multiScan.mjs');
    let tempRoot: string;

    beforeEach(() => {
      tempRoot = mkdtempSync(path.join(tmpdir(), 'arnready-b5-leak-gate-'));
      mkdirSync(path.join(tempRoot, 'scripts', 'lib'), { recursive: true });
      copyFileSync(SCRIPT_SRC, path.join(tempRoot, 'scripts', 'check-paid-leak.mjs'));
      copyFileSync(LIB_SRC, path.join(tempRoot, 'scripts', 'lib', 'canon.mjs'));
      copyFileSync(MULTISCAN_SRC, path.join(tempRoot, 'scripts', 'lib', 'multiScan.mjs'));
    });

    afterEach(() => {
      rmSync(tempRoot, { recursive: true, force: true });
    });

    function run() {
      try {
        const stdout = execFileSync('node', [path.join('scripts', 'check-paid-leak.mjs')], {
          cwd: tempRoot,
          encoding: 'utf8',
        });
        return { code: 0, stdout };
      } catch (err) {
        const e = err as { status: number; stdout: string; stderr: string };
        return { code: e.status, stdout: e.stdout, stderr: e.stderr };
      }
    }

    it('fails when the hub force-renders the excluded card alongside the legitimate public card', () => {
      const leakDir = path.join(tempRoot, '.leakcheck');
      const outDir = path.join(tempRoot, 'out', 'chapters');
      mkdirSync(leakDir, { recursive: true });
      mkdirSync(outDir, { recursive: true });

      // The REAL manifest for this fixture, computed the same way
      // export-content.mjs computes it — not hand-typed — correctly omits
      // the prohibited card.
      const samplerManifest = computeSamplerManifest(rawByChapter);
      expect(samplerManifest[1]).toEqual(['1:investors-and-financial-goals:1']);
      writeFileSync(path.join(leakDir, 'sampler-manifest.json'), JSON.stringify(samplerManifest));
      writeFileSync(
        path.join(leakDir, 'paid-manifest.json'),
        JSON.stringify({ ids: ['paid-secret-id'], contentFps: ['z'.repeat(24)], publicFps: ['z'.repeat(24)] }),
      );
      writeFileSync(
        path.join(leakDir, 'free-question-manifest.json'),
        JSON.stringify({ ids: ['inert-free-q'], fps: ['y'.repeat(24)] }),
      );

      // Simulates a future regression that bypasses buildCanonicalDeck's
      // filtering: the hub renders BOTH the legitimate public card
      // ("...:1") and a force-rendered copy of the excluded card ("...:0").
      const forcedHub =
        '<div data-card-id="1:investors-and-financial-goals:1">Public card front text</div>' +
        '<div data-card-id="1:investors-and-financial-goals:0">Prohibited card front text</div>';
      writeFileSync(path.join(outDir, '1.html'), forcedHub);

      const result = run();
      expect(result.code).not.toBe(0);
      expect(result.stderr).toMatch(/renders unexpected card\(s\)/);
      expect(result.stderr).toMatch(/1:investors-and-financial-goals:0/);
    });
  });
});
