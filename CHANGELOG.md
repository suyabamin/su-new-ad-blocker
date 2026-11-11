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
- `src/shared/logger.js` — structured logger; silent by default; never throws.
- `src/shared/messages.js` — placeholder (to be rewritten in TC.1 with canonical 16 types).
- `src/shared/storage.js` — placeholder (to be rewritten in TC.1 with canonical 7 keys).
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
