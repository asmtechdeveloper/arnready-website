import type { MetadataRoute } from 'next';
import { CONFIG } from '@/lib/config';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = CONFIG.SITE_URL;
  const staticRoutes = [
    '',
    '/nism-series-v-a',
    '/syllabus',
    '/chapters',
    '/mock-test',
    '/flashcards',
    '/questions',
    '/pricing',
    '/about',
    '/faq',
    '/privacy',
    '/delete-account',
    '/support',
  ];
  return [
    ...staticRoutes.map((r) => ({
      url: `${base}${r}`,
      changeFrequency: 'weekly' as const,
      priority: r === '' ? 1 : 0.7,
    })),
    ...CONFIG.CHAPTERS.map((c) => ({
      url: `${base}/chapters/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
