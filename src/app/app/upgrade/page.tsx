import type { Metadata } from 'next';
import UpgradePanel from '@/components/app/UpgradePanel';

export const metadata: Metadata = { title: 'Upgrade' };

export default function UpgradePage() {
  return <UpgradePanel />;
}
