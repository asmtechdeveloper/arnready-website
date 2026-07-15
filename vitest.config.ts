import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // M2 plan §2 D7, declared deviation: allows test/nudgeGates.test.ts's
  // OPTIONAL live cross-repo parity test (skipIf-guarded, additive to the
  // committed golden fixture test which is never skipped) to
  // `import()` ../ARNReady-App/services/quizEngine.ts across the sibling
  // repo boundary. Vite's dev server sandboxes fs access to the project
  // root by default; without this, the live import 404s even when the app
  // repo is present. This is the one permitted config change for M2.
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
