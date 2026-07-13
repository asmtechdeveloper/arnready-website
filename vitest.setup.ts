import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount rendered components between tests — without this, React can
// schedule work against a jsdom `window` that a later test's teardown has
// already torn down, surfacing as a flaky "window is not defined" error.
afterEach(() => {
  cleanup();
});
