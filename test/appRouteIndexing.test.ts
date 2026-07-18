import { describe, expect, it } from 'vitest';

import robots from '@/app/robots';
import { metadata } from '@/app/app/page';

/**
 * `/app` is the signed-in product root. Manual §1 lists only the public pages
 * as indexable, so /app must be kept out of search — belt (robots.txt) and
 * braces (page-level noindex), because the two fail independently: robots.txt
 * discourages crawling but does not prevent indexing of a discovered URL,
 * while the meta tag only applies to a page that was actually fetched.
 */
describe('/app is not indexable', () => {
  it('robots.txt disallows /app', () => {
    const rules = robots().rules;
    expect(rules).toMatchObject({ userAgent: '*', allow: '/', disallow: '/app' });
  });

  it('the /app page declares noindex, nofollow', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('robots still points at the sitemap and allows the public site', () => {
    const result = robots();
    expect(result.sitemap).toBe('https://arnready.com/sitemap.xml');
    expect(result.rules).toMatchObject({ allow: '/' });
  });
});

describe('/app is absent from the sitemap', () => {
  it('no sitemap entry references /app', async () => {
    // The sitemap reads the Firestore export; without it the module still
    // returns its static routes, which is all this assertion needs.
    const { default: sitemap } = await import('@/app/sitemap');
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.filter((url) => /\/app(\/|$)/.test(url))).toEqual([]);
  });
});
