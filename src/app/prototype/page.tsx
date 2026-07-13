import type { Metadata } from 'next';
import PrototypeExperience from './prototype-experience';

export const metadata: Metadata = {
  title: 'Visual prototype',
  description: 'WORKING visual prototype for ARNReady. Not a production surface.',
  robots: { index: false, follow: false },
};

export default function PrototypePage() {
  return <PrototypeExperience />;
}
