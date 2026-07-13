import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const firebaseJson = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '..', 'firebase.json'), 'utf8'));

describe('firebase.json hosting redirects', () => {
  it('redirects the retired /questions route to /chapters', () => {
    const redirects: { regex: string; destination: string; type: number }[] = firebaseJson.hosting.redirects;
    const match = redirects.find((r) => r.regex.includes('/questions'));
    expect(match).toBeDefined();
    expect(match?.destination).toBe('/chapters');
    expect(match?.type).toBe(301);
  });
});
