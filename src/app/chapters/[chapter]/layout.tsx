import { publishedChapters } from '@/lib/content';

// Next.js only propagates a dynamic segment's static params to a NESTED
// route (here, /chapters/[chapter]/[subtopic]) when generateStaticParams is
// defined on that segment's layout.tsx — the sibling page.tsx's own
// generateStaticParams only registers params for its own leaf route, never
// for child routes below it.
export const dynamicParams = false;

export function generateStaticParams() {
  return publishedChapters().map((chapter) => ({ chapter: String(chapter) }));
}

export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
