/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  extends: ['eslint:recommended'],
  rules: {
    // Disallow console.log — use src/shared/logger.js instead
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
  overrides: [
    {
      // Test files may use testing environment globals
      files: ['tests/**/*.js'],
      env: {
        node: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Build scripts run in Node, not browser
      files: ['scripts/**/*.js', 'scripts/**/*.cjs'],
      env: {
        node: true,
        browser: false,
        webextensions: false,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
