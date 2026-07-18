import { describe, expect, it } from 'vitest';

import {
  EXPECTED_PROJECT_ID,
  isAppEnv,
  resolveFirebaseConfig,
  type RawConfig,
} from '@/lib/firebaseEnv';

/**
 * The dev/prod toggle (Anusha, 2026-07-18). These tests pin the two rules
 * that make the toggle safe rather than merely convenient:
 *
 *   1. NO DEFAULT — an unset/garbage env never resolves to a project.
 *   2. NO WRONG PROJECT — a config block pasted into the wrong variable set
 *      is rejected, not silently used.
 *
 * A regression in either would let a build authenticate real users against
 * the dev project (or a dev build against real users' data) with no signal.
 */
const DEV: RawConfig = {
  apiKey: 'dev-key',
  authDomain: 'arnready-dev.firebaseapp.com',
  projectId: 'arnready-dev',
  appId: '1:1:web:dev',
};
const PROD: RawConfig = {
  apiKey: 'prod-key',
  authDomain: 'arnready.firebaseapp.com',
  projectId: 'arnready',
  appId: '1:1:web:prod',
};
const both = { dev: DEV, prod: PROD };

describe('resolveFirebaseConfig — the dev/prod toggle', () => {
  it('resolves the dev set when APP_ENV is dev', () => {
    const result = resolveFirebaseConfig('dev', both);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.env).toBe('dev');
      expect(result.config.projectId).toBe('arnready-dev');
      expect(result.config.apiKey).toBe('dev-key');
    }
  });

  it('resolves the prod set when APP_ENV is prod — the two sets never bleed', () => {
    const result = resolveFirebaseConfig('prod', both);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.env).toBe('prod');
      expect(result.config.projectId).toBe('arnready');
      expect(result.config.apiKey).toBe('prod-key');
    }
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['unrecognised', 'staging'],
    ['cased differently', 'Dev'],
    ['whitespace', '  '],
  ])('refuses to guess a project when APP_ENV is %s', (_label, value) => {
    const result = resolveFirebaseConfig(value, both);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('NEXT_PUBLIC_APP_ENV');
  });

  it('reports every missing variable by name when the selected set is incomplete', () => {
    const result = resolveFirebaseConfig('prod', {
      dev: DEV,
      // The real state of the PROD_ set until the prod web app is registered.
      prod: { projectId: 'arnready' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('NEXT_PUBLIC_FIREBASE_PROD_API_KEY');
      expect(result.reason).toContain('NEXT_PUBLIC_FIREBASE_PROD_AUTH_DOMAIN');
      expect(result.reason).toContain('NEXT_PUBLIC_FIREBASE_PROD_APP_ID');
      // Present, so it must NOT be listed as missing.
      expect(result.reason).not.toContain('NEXT_PUBLIC_FIREBASE_PROD_PROJECT_ID');
    }
  });

  it('treats a blank-but-present variable as missing, not as a valid value', () => {
    const result = resolveFirebaseConfig('dev', {
      dev: { ...DEV, apiKey: '   ' },
      prod: PROD,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('NEXT_PUBLIC_FIREBASE_DEV_API_KEY');
  });

  it('rejects the prod config pasted into the dev variable set', () => {
    const result = resolveFirebaseConfig('dev', { dev: PROD, prod: PROD });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Project mismatch');
      expect(result.reason).toContain('arnready-dev');
    }
  });

  it('rejects the dev config pasted into the prod variable set — the dangerous direction', () => {
    const result = resolveFirebaseConfig('prod', { dev: DEV, prod: DEV });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('Project mismatch');
  });

  it('trims surrounding whitespace rather than failing a copy-paste', () => {
    const result = resolveFirebaseConfig('dev', {
      dev: { ...DEV, apiKey: '  dev-key  ' },
      prod: PROD,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config.apiKey).toBe('dev-key');
  });

  it('never throws, for any input', () => {
    const poison = [null, undefined, 0, [], {}, 'dev', Symbol('x')];
    for (const value of poison) {
      expect(() =>
        resolveFirebaseConfig(value as unknown as string, {
          dev: {},
          prod: {},
        }),
      ).not.toThrow();
    }
  });

  it('pins the expected project id for each environment', () => {
    expect(EXPECTED_PROJECT_ID).toEqual({ dev: 'arnready-dev', prod: 'arnready' });
  });

  it('isAppEnv accepts only the two literals', () => {
    expect(isAppEnv('dev')).toBe(true);
    expect(isAppEnv('prod')).toBe(true);
    for (const value of ['staging', '', undefined, null, 0]) {
      expect(isAppEnv(value)).toBe(false);
    }
  });
});
