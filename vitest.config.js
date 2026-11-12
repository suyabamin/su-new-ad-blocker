import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      thresholds: {
        'src/shared/**': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
        'src/background/**': {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        'src/content/**': {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});
