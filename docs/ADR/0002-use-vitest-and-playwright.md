# ADR-0002: Use Vitest and Playwright for Testing

**Status:** Accepted  
**Date:** 2026-11-12  
**Author:** T0.1 Refinement

## Context

Initial scaffolding considered Jest for testing. However, the project specification mandates native ES module support in modern Chromium extension architecture, fast unit/integration testing with Vitest, and browser-driven end-to-end testing with Playwright. Additionally, local environment limits (C: drive capacity constraints) required configuring npm and Playwright caches on the persistent D: drive (`PLAYWRIGHT_BROWSERS_PATH=D:\.playwright-browsers`).

## Decision

1. Standardize unit and integration tests on **Vitest** with `@vitest/coverage-v8`.
2. Standardize end-to-end tests on **Playwright** with Chromium (`npx playwright install chromium`).
3. Replace all Jest packages and configurations with Vitest (`vitest.config.js`).
4. Keep npm scripts aligned with `docs/11_TESTING.md`:
   - `npm run lint` -> `eslint . && prettier --check .`
   - `npm test` -> `vitest run --passWithNoTests`
   - `npm run test:e2e` -> `playwright test`
   - Placeholders for `test:perf`, `test:a11y`, `build:release`, `package`.

## Consequences

- Fast ESM-first testing with no Babel or experimental VM flag hacks.
- Playwright Chromium is installed and ready for extension e2e test execution.
