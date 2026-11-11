# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Complete project scaffold for Manifest V3 Chromium extension.
- Canonical folder layout: `src/background/`, `src/content/`, `src/popup/`, `src/options/`, `src/shared/`, `src/assets/`, `build/`, `lists/`, `tests/`, `docs/`, `docs/ADR/`, `scripts/`.
- Installed Vitest (`^4.1.0`), `@vitest/coverage-v8`, `@playwright/test`, `eslint@^8`, `prettier`.
- Chromium browser for Playwright in `D:\.playwright-browsers` (`chromium-1254`).
- `.env.example` documenting `PLAYWRIGHT_BROWSERS_PATH=D:\.playwright-browsers`.
- Minimal `playwright.config.js` targeting `tests/e2e` with Chromium project.
- ADR-0001: Use Manifest V3 and declarativeNetRequest for network blocking.
- ADR-0002: Language — JavaScript ES2022 (Accepted).
- ADR-0003: ESLint version migration plan (Superseded by TB.1).
- ADR-0004: Use Vitest and Playwright for testing.
- `src/shared/messages.js` — canonical 16 MSG types with `isKnownType` helper (TC.1).
- `src/shared/storage.js` — canonical 7 STORAGE_KEYS with `dailyStatsKey` and `getListCacheKey` helpers (TC.1).
- `src/shared/settings.js` — `DEFAULT_SETTINGS` and `validateSettingsPatch` (TC.1).
- `src/shared/logger.js` — structured logger with `debug`, `info`, `warn`, `error` methods (TC.1).
- `scripts/build-rules.js` — converts filter lists and domain lists to declarativeNetRequest JSON (TD.1).
- `rules/declarative_net_request_rules.json` — 551 bundled static DNR block rules including 10 canonical ad networks (TD.1).
- `src/background/rule-updater.js` — dynamic rule updater with 24-hour alarm and graceful fallback (TD.2).
- `src/background/service-worker.js` — service worker entry point wiring install and alarms (TD.2).
- `src/background/stats.js` — block event counter with debounced storage flush and onRuleMatchedDebug listener (TE.1).
- `src/background/stats-api.js` — statistics messaging API handling range, summary, tab, top domains, export, and reset (TE.2).
- Full unit test coverage for shared modules (40 tests, 100% coverage).
- Unit tests for DNR rules builder (4 tests in `tests/unit/background/build-rules.test.js`).
- Unit tests for background rule-updater and service-worker (6 tests, 100% statement coverage).
- Unit tests for background stats tracker (5 tests, 89% statement coverage).
- `vitest.config.js` with coverage thresholds: 95% for `src/shared/**`, 80% for `src/background/**` and `src/content/**`.
- `docs/09_MESSAGING_CONTRACT.md` rewritten with canonical 16-message spec.
- `docs/10_STORAGE_SCHEMA.md` rewritten with canonical 7 storage keys + pattern helpers.
- `docs/11_TESTING.md` rewritten with canonical testing standards (95%/80%/80% thresholds).
- `docs/15_TASK_PLAN.md` replaced with canonical Phase A–H task structure.

### Changed

- Renamed workspace from `D:\su_new_ad blocker` to `D:\su_new_ad_blocker`.
- `test:e2e` script uses `--pass-with-no-tests` flag.
- `PLAYWRIGHT_BROWSERS_PATH` set persistently via `setx`.

### Removed

- Premature stub files removed: `src/background/{rule-updater,service-worker,stats-api,stats}.js`, `src/content/{cosmetic,selectors,youtube,youtube-selectors}.js`, `src/popup/{popup.html,popup.js,popup.css}`, `src/options/{options.html,options.js,options.css}`, `scripts/{build.js,build-rules.js,generate-icons.cjs}`.
- Incorrect unit test files removed: `tests/unit/shared/{messages,storage,logger}.test.js` (tested wrong spec; to be rewritten in TC.1).
- Coverage threshold removed from 100% (fabricated) and reset to canonical 95% for `src/shared/**`.
