import type { Metadata } from 'next';
import MistakesDeck from '@/components/app/MistakesDeck';

export const metadata: Metadata = { title: 'Mistakes Deck' };

export default function MistakesPage() {
  return <MistakesDeck />;
}
