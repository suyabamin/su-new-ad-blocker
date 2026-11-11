// Playwright configuration for E2E extension tests.
// Uses a persistent Chromium context so the unpacked extension can be loaded.
// See docs/15_TASK_PLAN.md TH.2
import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname);

export default defineConfig({
  testDir: './tests/e2e',
  // Each spec file creates its own persistent context via the shared fixture.
  // fullyParallel must be false when contexts share the userDataDir.
  fullyParallel: false,
  timeout: 30_000,
  use: {
    // Passed to fixtures so they know where the unpacked extension lives.
    extensionPath,
  },
  projects: [
    {
      name: 'chromium-extension',
      // No standard browser — the fixture opens a persistentContext.
      use: {},
    },
  ],
});
