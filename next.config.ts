import type { NextConfig } from 'next';

/**
 * SSG static output on classic Firebase Hosting (approved design, 10 Jul).
 * No export-only hacks: every route is finite/static; runtime IDs travel as
 * query params. Removing `output: 'export'` is the only change needed to
 * move to a server runtime later.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
