'use client';

import { useEffect } from 'react';

import { startAuthSync, useAuth } from '@/lib/authStore';
import { ensureUserDocument } from '@/lib/ensureUserDocument';
import { installDevAuthHook } from '@/lib/firebaseClient';

/**
 * Mounts the auth listener ONCE for the whole site (M3).
 *
 * Rendered inside the root layout so every surface — public pages and /app
 * alike — sees the same auth and entitlement state. The header needs it on
 * public pages, so it cannot live under /app.
 *
 * Renders nothing. The effect is deliberately empty-dependency: `startAuthSync`
 * is module-level and stable, and re-running it would tear down a live
 * listener and re-enter the "not yet known" state on every render.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const uid = useAuth((s) => s.user?.uid ?? null);

  useEffect(() => {
    // Dev-only screenshot sign-in hook (M5 D13); a no-op in the production
    // static export, where it is dead-code eliminated.
    installDevAuthHook();
    return startAuthSync();
  }, []);

  useEffect(() => {
    if (!uid) return;
    // Fire-and-forget (M6): asks the server to create users/{uid} if this
    // account entered on the web (see src/lib/ensureUserDocument.ts). The mock
    // pre-start AWAITS its own call — a failure here is logged, not fatal.
    void ensureUserDocument();
  }, [uid]);

  return <>{children}</>;
}
