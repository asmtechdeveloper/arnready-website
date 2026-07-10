import StudyHome from '@/components/app/StudyHome';
import { loadChapterStats } from '@/lib/content';

export default function AppHomePage() {
  const freeCounts = Object.fromEntries(
    loadChapterStats().map((s) => [s.chapter, s.freeCount]),
  );
  return <StudyHome freeCounts={freeCounts} />;
}
