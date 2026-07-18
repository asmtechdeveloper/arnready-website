import type { MetadataRoute } from 'next';

// Required for output: 'export' — a metadata route with any per-request
// data source must declare itself statically at build time.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // /app is the signed-in product root (M3). Manual §1 lists only the
    // public pages as indexable, and every /app surface requires auth, so
    // it is disallowed here and absent from the sitemap. The page-level
    // `robots: { index: false }` metadata is the belt to this braces.
    rules: { userAgent: '*', allow: '/', disallow: '/app' },
    sitemap: 'https://arnready.com/sitemap.xml',
  };
}
