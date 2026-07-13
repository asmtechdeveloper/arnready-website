import type { MetadataRoute } from 'next';

// Required for output: 'export' — a metadata route with any per-request
// data source must declare itself statically at build time.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://arnready.com/sitemap.xml',
  };
}
