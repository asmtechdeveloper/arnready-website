import type { Metadata } from 'next';
import MockGate from '@/components/app/MockGate';
import { loadAllFreeQuestions } from '@/lib/content';

export const metadata: Metadata = { title: 'Mock Test' };

export default function MockPage() {
  return <MockGate freePool={loadAllFreeQuestions()} />;
}
