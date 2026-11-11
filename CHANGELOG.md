# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Complete project scaffold for Manifest V3 Chromium extension (T0.1).
- Canonical folder layout matching `docs/02_ARCHITECTURE.md`: `src/background/`, `src/content/`, `src/content/youtube/`, `src/popup/`, `src/options/`, `src/shared/`, `src/assets/icons/`, `src/assets/rules/`, `build/`, `lists/`, `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/fixtures/`, `tests/perf/`, `tests/site/`, `docs/`, `docs/ADR/`, `scripts/`.
- Manifest V3 configuration with declarativeNetRequest, permissions, popup, options, and content scripts.
- Installed Vitest (`^4.1.0`), `@vitest/coverage-v8`, `@playwright/test`, `eslint`, and `prettier`.
- Chromium browser for Playwright installed via `npx playwright install chromium` into `D:\.playwright-browsers`.
- `.env.example` documenting `PLAYWRIGHT_BROWSERS_PATH=D:\.playwright-browsers`.
- Documentation in `docs/11_TESTING.md` ("Local setup") and `README.md` for configuring `PLAYWRIGHT_BROWSERS_PATH` on alternate drives.
- Minimal `playwright.config.js` targeting `tests/e2e` with chromium project configuration.
- Minimal placeholder scripts for `scripts/build-rules.js` and `scripts/build.js`.
- ADR-0001: Use Manifest V3 and declarativeNetRequest for Network Blocking.
- ADR-0002: Use Vitest and Playwright for Testing (see [docs/ADR/0002-use-vitest-and-playwright.md](docs/ADR/0002-use-vitest-and-playwright.md)).
- ADR-0003: ESLint Version and Migration Plan (see [docs/ADR/0003-eslint-version.md](docs/ADR/0003-eslint-version.md)).
- Placeholder npm scripts: `test:perf`, `test:a11y`, `build:release`, `package`.
- Task T0.2: Implemented shared constants `MSG` in `src/shared/messages.js` matching `docs/09_MESSAGING_CONTRACT.md`.
- Task T0.2: Implemented shared storage keys `STORAGE_KEYS` in `src/shared/storage.js` matching `docs/10_STORAGE_SCHEMA.md`.
- Task T0.2: Implemented structured logger wrapper in `src/shared/logger.js` with zero-noise default (`DEBUG = false`), `log`, `warn`, `error`, `setDebug`, and `DEBUG` property.
- Task T0.2: Unit test suites in `tests/unit/shared/` covering constants and logger (16 tests, 100% code coverage across `src/shared/`).

### Changed

- Renamed workspace directory from `D:\su_new_ad blocker` to `D:\su_new_ad_blocker` (removing spaces) and verified 0 lingering old path references exist.
- T0.1 verification complete after folder rename to `su_new_ad_blocker`.
- Replaced Jest and jest-environment-jsdom with Vitest and Playwright to strictly match `docs/11_TESTING.md`.
- Updated test runner commands: `vitest run --passWithNoTests` and `test:e2e` now passes with zero tests (`playwright test --pass-with-no-tests`).
- The full Chromium build (`chromium-1254`) is installed for extension testing in `D:\.playwright-browsers`.
- Added `.env`, `test-results/`, and `playwright-report/` to `.gitignore`.
- Open item: T0.5 (ESLint 9 flat config migration) is planned, not started.
