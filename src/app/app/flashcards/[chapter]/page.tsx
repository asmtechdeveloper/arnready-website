import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FlashcardPlayer from '@/components/app/FlashcardPlayer';
import { CONFIG, chapterById } from '@/lib/config';
import { loadFlashcards } from '@/lib/content';

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
  return { title: meta ? `Flashcards — Chapter ${meta.id}: ${meta.title}` : 'Flashcards' };
}

export default async function FlashcardChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  const { chapter } = await params;
  const n = Number(chapter);
  if (!chapterById(n)) notFound();
  return <FlashcardPlayer chapter={n} groups={loadFlashcards(n)} />;
}
