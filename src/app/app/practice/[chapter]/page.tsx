import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PracticePlayer from '@/components/app/PracticePlayer';
import { CONFIG, chapterById } from '@/lib/config';
import { loadFreeQuestions } from '@/lib/content';

export function generateStaticParams() {
  return CONFIG.CHAPTERS.map((c) => ({ chapter: String(c.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string }>;
}): Promise<Metadata> {
  const { chapter } = await params;
  const meta = chapterById(Number(chapter));
  return { title: meta ? `Practice — Chapter ${meta.id}: ${meta.title}` : 'Practice' };
}

export default async function PracticeChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const n = Number(chapter);
  if (!chapterById(n)) notFound();
  return <PracticePlayer chapter={n} freeQuestions={loadFreeQuestions(n)} />;
}
