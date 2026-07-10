import type { MetadataRoute } from 'next';
import { CONFIG } from '@/lib/config';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Product surfaces are per-user; nothing there for a crawler.
        disallow: ['/app'],
      },
    ],
    sitemap: `${CONFIG.SITE_URL}/sitemap.xml`,
  };
}
