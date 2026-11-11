// ESLint 9 flat config — see ADR-0003
// Canonical rules for SU New Ad Blocker (MV3, ES2022, ES modules)

import js from '@eslint/js';
import globals from 'globals';

export default [
  // Base: ESLint recommended rules for all JS files
  js.configs.recommended,

  // Extension source files (browser + webextensions + ES2022)
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    rules: {
      // Logging: use src/shared/logger.js only
      'no-console': 'error',
      // Security: no dynamic code execution
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      // Code quality
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-throw-literal': 'error',
    },
  },

  // Test files (node + vitest globals)
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Build scripts (node, CommonJS or ESM)
  {
    files: ['scripts/**/*.js', 'scripts/**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Config files at root (node ESM)
  {
    files: ['*.config.js', '*.config.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
];
