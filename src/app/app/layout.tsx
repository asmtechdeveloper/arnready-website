import type { Metadata } from 'next';
import ProductShell from '@/components/app/ProductShell';

export const metadata: Metadata = {
  title: 'Study Room',
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ProductShell>{children}</ProductShell>;
}
