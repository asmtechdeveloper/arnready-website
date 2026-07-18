import type { Metadata } from 'next';

import { appShell } from '@/lib/copy';
import { AppShell } from '@/components/AppShell';

/**
 * `/app` — the signed-in product root (M3).
 *
 * M3 delivers the auth-side SHELL ONLY: the signed-out state, the signed-in
 * state, and sign-out. The study surfaces land in M5 (practice, exam,
 * flashcards) and M6 (mock, mistakes, progress) — see the manual's M3 scope
 * amendment (Anusha, 2026-07-16).
 *
 * Not indexable: `robots` disallows /app and it is absent from the sitemap
 * (manual §1 lists only public pages as indexable). The page is still
 * statically exported — it renders the signed-out markup, and auth resolves
 * client-side on load.
 */
export const metadata: Metadata = {
  title: appShell.meta.title,
  description: appShell.meta.description,
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <AppShell />;
}
