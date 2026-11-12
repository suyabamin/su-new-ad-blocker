# 15 — Task Plan

Tasks are worked one at a time, in order. Mark a task `[x]` only when **all** its acceptance
criteria pass, lint is clean, tests pass, and verified in this session.

---

## Phase 0: Foundation

- [x] **T0.1** — Project scaffold and tooling setup
- [x] **T0.2** — Shared constants (`messages.js`), storage helpers (`storage.js`), settings (`settings.js`), and logger (`logger.js`)
- [x] **T0.3** — ESLint 9 flat config migration (`eslint.config.js`)
- [x] **T0.4** — CI workflow configuration (`.github/workflows/ci.yml`)

---

## Phase 1: Blocking

- [x] **T1.1** — Canonical `manifest.json` configuration and permissions assertion
- [x] **T1.2** — DNR rule compiler (`scripts/build-rules.js`) supporting EasyList syntax
- [x] **T1.3** — Generated DNR rulesets within static limits (`build/limits.js`, `build/report.json`)
- [x] **T1.4** — Background `rules-manager.js` for dynamic pause/allow rules
- [x] **T1.5** — Background `service-worker.js` entry point and toolbar `badge.js`
- [x] **T1.6** — E2E blocking test in Playwright (`tests/e2e/blocking.spec.js`)

---

## Phase 2: Stats and Popup

- [x] **T2.1** — Background statistics tracker (`stats-tracker.js`) with sampling and deduplication
- [x] **T2.2** — Typed message router (`message-router.js`) handling all 16 canonical message types
- [x] **T2.3** — Accessible popup UI (`src/popup/`) with live tab/today block counts and pause toggle
- [x] **T2.4** — Statistics export, reset confirmation, and daily prune/update alarms

---

## Phase 3: Cosmetic Filtering

- [x] **T3.1** — Cosmetic rule extraction in rule compiler (`rules/cosmetic.json`)
- [x] **T3.2** — Generic cosmetic content script (`src/content/cosmetic.js`) with style injection and debounced MutationObserver
- [x] **T3.3** — Batched reporting via `CS_BLOCKED_REPORT` (at most one report per 2 seconds per tab)

---

## Phase 4: Options Dashboard

- [x] **T4.1** — Options overview with lifetime/today summary and local Chart.js daily activity line chart
- [x] **T4.2** — Sortable top blocked domains table and type/list breakdowns with accessible alternatives
- [x] **T4.3** — Filter list toggles and validated manual list updater
- [x] **T4.4** — Allowlist manager and custom user DNR rules editor with syntax validation
- [x] **T4.5** — Data section with lossless JSON export and confirmation-guarded stats reset
- [x] **T4.6** — Complete i18n string catalog in `_locales/en/messages.json` with zero hardcoded UI strings

---

## Phase 5: YouTube Module

- [x] **T5.1** — YouTube page type detection and soft navigation handling (`yt-navigate-finish`)
- [x] **T5.2** — YouTube ad UI container selectors (`src/content/youtube/selectors.js`) verified with HTML fixtures
- [x] **T5.3** — YouTube module settings toggle integration
- [x] **T5.4** — YouTube strict scope test preventing video playback manipulation (`tests/unit/youtube-scope.test.js`)

---

## Phase 6: Hardening

- [x] **T6.1** — Performance benchmark harness (`tests/perf/run.js`) measuring median added load time
- [ ] **T6.2** — Accessibility verification with `@axe-core/playwright` on popup and options pages
- [ ] **T6.3** — `npm audit` security audit and canonical permission boundary verification
- [ ] **T6.4** — Error boundary resilience test verifying core blocking survives UI errors

---

## Phase 7: Release

- [x] **T7.1** — Privacy policy documentation (`docs/PRIVACY.md`)
- [x] **T7.2** — Store listing documentation with accurate claims (`docs/13_STORE_LISTING.md`)
- [x] **T7.3** — Unpacked loading guide (`docs/LOAD_UNPACKED.md`) and production release zip packaging (`npm run package`)
- [x] **T7.4** — Release verification checklist, zip content verification, and git release tag (`v0.1.0`)

---

## Phase 8: Filter and Statistics Remediation

- [x] **T8.1** — Separate production rules from test fixtures and remove synthetic filler domains.
- [x] **T8.2** — Compile a conservative, tested EasyList/EasyPrivacy subset with DNR exceptions and quota bounds.
- [x] **T8.3** — Fetch fixed HTTPS list sources with validation, scheduled/manual updates, and atomic replacement.
- [x] **T8.4** — Report network diagnostics accurately and distinguish them from cosmetic/YouTube elements hidden.
