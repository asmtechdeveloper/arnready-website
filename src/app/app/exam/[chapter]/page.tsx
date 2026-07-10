import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ExamPlayer from '@/components/app/ExamPlayer';
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
  return { title: meta ? `Chapter Exam — Chapter ${meta.id}: ${meta.title}` : 'Chapter Exam' };
}

export default async function ExamChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const n = Number(chapter);
  if (!chapterById(n)) notFound();
  return <ExamPlayer chapter={n} freeQuestions={loadFreeQuestions(n)} />;
}
