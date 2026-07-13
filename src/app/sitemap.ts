import type { MetadataRoute } from 'next';
import { publishedChapters, publishedSubtopics } from '@/lib/content';

// Required for output: 'export' — a metadata route with any per-request
// data source must declare itself statically at build time.
export const dynamic = 'force-static';

const BASE_URL = 'https://arnready.com';

// Static public routes (manual §1). The retired /questions route is
// deliberately excluded — it 301s to /chapters (firebase.json), never
// indexed under its own URL.
const STATIC_ROUTES = [
  '',
  '/chapters',
  '/nism-series-v-a',
  '/syllabus',
  '/pricing',
  '/about',
  '/faq',
  '/privacy',
  '/delete-account',
  '/support',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
  }));

  const chapterEntries: MetadataRoute.Sitemap = [];
  for (const chapter of publishedChapters()) {
    chapterEntries.push({ url: `${BASE_URL}/chapters/${chapter}` });
    for (const subtopic of publishedSubtopics(chapter)) {
      chapterEntries.push({ url: `${BASE_URL}/chapters/${chapter}/${subtopic.subtopicSlug}` });
    }
  }

  return [...staticEntries, ...chapterEntries];
}
