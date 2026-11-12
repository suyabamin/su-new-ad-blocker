# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- ADR-0005: Bundle content scripts with esbuild for MV3 compatibility (Option 2 of content-script module blocker fix).
- `esbuild@0.28.2` added as pinned devDependency (exact version, no `^`).
- `scripts/build.js` rewrites: bundles `src/content/cosmetic.js` and `src/content/youtube/youtube.js` with esbuild (IIFE, chrome120, --minify in production); copies `src/background/`, `src/popup/`, `src/options/`, `src/assets/`, `rules/`, `icons/` unchanged; generates `dist/manifest.json` with `content_scripts` paths rewritten to `dist/content/*.js`; asserts no top-level import/export in any bundle output.
- `tests/unit/build/no-module-syntax.test.js`: runs bundler into temp dir and asserts no top-level `import`/`export` in output.
- `pretest:e2e` script in `package.json` so `npm run test:e2e` always builds first.
- `src/content/youtube/youtube.js` entry point for esbuild to bundle YouTube cosmetic script.
- `docs/11_TESTING.md` updated to describe build step and `dist/` as the loaded extension directory for E2E tests.
- `docs/14_RELEASE_PROCESS.md` updated to describe esbuild bundling in the release build sequence.
- E2E fixture updated to load from `dist/` when present.
- `_metadata/` added to `.gitignore` (Chromium-generated directory).

### Fixed

- `STYLE_ELEMENT_ID` in `src/content/cosmetic.js` aligned to `su-cosmetic-styles` (matches E2E test selector).

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
- `src/content/selectors.js` — 22 generic cosmetic ad-container selectors (TF.1).
- `src/content/cosmetic.js` — generic cosmetic content script injecting CSS styles and MutationObserver without script tags (TF.1).
- `src/content/youtube-selectors.js` — 16 target YouTube ad UI containers and explicit forbidden selectors list (TF.2).
- `src/content/youtube.js` — YouTube cosmetic content script hiding ad UI containers with zero video playback manipulation (TF.2).
- `src/popup/popup.html`, `popup.css`, `popup.js` — accessible extension popup UI displaying live tab/today stats and site pause toggle (TG.1).
- `src/options/options.html`, `options.css`, `options.js` — options dashboard with domain regex validation, allowlist management, and JSON stats export (TG.2).
- `tests/integration/blocking.test.js` — tests DNR static rule matching rate (>= 95% of test-case ad URLs match) (TH.1).
- `tests/integration/cosmetic.test.js` — tests generic and custom cosmetic container hiding on simulated DOM (TH.1).
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
