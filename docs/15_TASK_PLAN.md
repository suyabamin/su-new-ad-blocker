# 15 — Task Plan

Tasks are worked one at a time, in order. Mark a task `[x]` only when **all** its acceptance criteria pass, lint is clean, and CHANGELOG is updated.

---

## Phase 0: Foundation

### T0.1 — Repository Scaffold & Tooling

**Status:** `[x]`

**Deliverables:**

- `manifest.json` (Manifest V3, all required fields, correct permissions)
- `package.json` with `lint`, `test`, `test:e2e`, and `build` npm scripts
- `.eslintrc.cjs`, `.prettierrc.json`, `vitest.config.js`, `.gitignore`
- Full directory structure matching spec (`src/`, `build/`, `lists/`, `tests/`, `docs/`, `docs/ADR/`)
- `rules/declarative_net_request_rules.json` (valid JSON array `[]`)
- `lists/SOURCES.md` (with EasyList + EasyPrivacy entries)
- Chromium browser installed for Playwright

**Acceptance Criteria:**

- folders exist: PASS (all required folders confirmed and present with .gitkeep where empty)
- npm install works: PASS (npm install runs cleanly with 0 errors)
- lint passes: PASS (`npm run lint` exits 0 with zero warnings/errors)
- tests pass: PASS (`npm test` exits 0 with `--passWithNoTests`)

---

### T0.2 — Shared Constants & Logger

**Status:** `[x]`

**Deliverables:**

- `src/shared/messages.js` — frozen `MSG` object with all message type constants
- `src/shared/storage.js` — frozen `STORAGE_KEYS` object with all storage key constants
- `src/shared/logger.js` — structured logger with `log`, `warn`, `error` functions
- `tests/unit/shared/logger.test.js`
- `tests/unit/shared/messages.test.js`
- `tests/unit/shared/storage.test.js`

**Acceptance Criteria:**

- AC-T0.2-1: `MSG` is a frozen object; every value is a unique non-empty string. (PASS)
- AC-T0.2-2: `STORAGE_KEYS` is a frozen object; every value is a unique non-empty string. (PASS)
- AC-T0.2-3: `logger.log('tag', 'msg')` does not throw in any mode. (PASS)
- AC-T0.2-4: Logger produces no output when `DEBUG` is `false`. (PASS)
- AC-T0.2-5: All constants match the values specified in `docs/09_MESSAGING_CONTRACT.md` and `docs/10_STORAGE_SCHEMA.md`. (PASS)
- AC-T0.2-6: `npm run lint && npm test` pass. (PASS)

---

### T0.5 — Migrate ESLint to v9 flat config

**Status:** `[ ]`

**Acceptance Criteria:**

- Acceptance: npm run lint passes with eslint.config.js and no .eslintrc files.

---

## Phase 1: Network Blocking

### T1.1 — Static DNR Ruleset

**Status:** `[ ]`

**Deliverables:**

- `scripts/build-rules.js` — downloads EasyList/EasyPrivacy, converts to DNR JSON
- `rules/declarative_net_request_rules.json` — bundled static ruleset (≥ 500 rules)
- `tests/unit/background/build-rules.test.js`

**Acceptance Criteria:**

- AC-T1.1-1: `npm run build-rules` exits 0 and writes a valid JSON array to `rules/declarative_net_request_rules.json`.
- AC-T1.1-2: Ruleset contains ≥ 500 rules.
- AC-T1.1-3: Every rule has `id`, `priority`, `action`, and `condition` fields.
- AC-T1.1-4: At least 10 canonical ad-network domains (e.g. `doubleclick.net`, `googlesyndication.com`) appear as block rules.
- AC-T1.1-5: `npm run lint && npm test` pass.

---

### T1.2 — Dynamic Rule Updater

**Status:** `[ ]`

**Deliverables:**

- `src/background/rule-updater.js`
- Updated `src/background/service-worker.js`
- `tests/unit/background/rule-updater.test.js`

**Acceptance Criteria:**

- AC-T1.2-1: Rules refresh on `chrome.runtime.onInstalled`.
- AC-T1.2-2: A `chrome.alarms` alarm named `FILTER_UPDATE` is created with a 24-hour period.
- AC-T1.2-3: Fetch failures are caught, logged, and do not crash the service worker.
- AC-T1.2-4: `STORAGE_KEYS.FILTER_LAST_UPDATED` is written on successful update.
- AC-T1.2-5: `npm run lint && npm test` pass.

---

## Phase 2: Cosmetic Filtering

### T2.1 — Generic Cosmetic Content Script

**Status:** `[ ]`

**Deliverables:**

- `src/content/cosmetic.js`
- `src/content/selectors.js` (≥ 20 generic selectors)
- `tests/unit/content/cosmetic.test.js`

**Acceptance Criteria:**

- AC-T2.1-1: A `<style>` tag is injected into `document.documentElement` at `document_start`.
- AC-T2.1-2: Every selector in `selectors.js` appears in the injected CSS with `display:none !important`.
- AC-T2.1-3: A `MutationObserver` is installed and applies hiding to newly added matching nodes.
- AC-T2.1-4: No `<script>` tags are created or injected.
- AC-T2.1-5: `npm run lint && npm test` pass.

---

### T2.2 — YouTube Cosmetic Content Script

**Status:** `[ ]`

**Deliverables:**

- `src/content/youtube.js`
- `src/content/youtube-selectors.js` (all selectors from `docs/06_YOUTUBE_MODULE.md`)
- `tests/unit/content/youtube.test.js`

**Acceptance Criteria:**

- AC-T2.2-1: All selectors from `docs/06_YOUTUBE_MODULE.md` §2 are present in `youtube-selectors.js`.
- AC-T2.2-2: None of the forbidden selectors from `docs/06_YOUTUBE_MODULE.md` §4 appear in `youtube-selectors.js`.
- AC-T2.2-3: A `MutationObserver` is installed on `document.body`.
- AC-T2.2-4: The script does not reference `video`, `audio`, or any playback control element.
- AC-T2.2-5: `npm run lint && npm test` pass.

---

## Phase 3: Statistics

### T3.1 — Block Event Counter

**Status:** `[ ]`

**Deliverables:**

- `src/background/stats.js`
- `tests/unit/background/stats.test.js`

**Acceptance Criteria:**

- AC-T3.1-1: `onRuleMatchedDebug` listener increments global and per-domain counters in memory.
- AC-T3.1-2: Counters are flushed to `chrome.storage.local` at most once per second.
- AC-T3.1-3: On init, counters are loaded from `chrome.storage.local`.
- AC-T3.1-4: `npm run lint && npm test` pass.

---

### T3.2 — Statistics Messaging API

**Status:** `[ ]`

**Deliverables:**

- `src/background/stats-api.js`
- Updated `src/shared/messages.js`
- `tests/unit/background/stats-api.test.js`

**Acceptance Criteria:**

- AC-T3.2-1: All message types in `docs/09_MESSAGING_CONTRACT.md` are handled.
- AC-T3.2-2: Unknown message types return `{ ok: false, error: 'unknown message type' }`.
- AC-T3.2-3: `RESET_STATS` zeroes all counters and updates `STATS_LAST_RESET`.
- AC-T3.2-4: `npm run lint && npm test` pass.

---

## Phase 4: UI

### T4.1 — Popup

**Status:** `[ ]`

**Deliverables:**

- `src/popup/popup.html`, `popup.js`, `popup.css`

**Acceptance Criteria:**

- AC-T4.1-1: `popup.html` has no inline scripts.
- AC-T4.1-2: All UI strings come from JS constants (no magic strings).
- AC-T4.1-3: Toggle sends `MSG.SET_ENABLED` and updates `aria-checked`.
- AC-T4.1-4: "Open Dashboard" calls `chrome.runtime.openOptionsPage()`.
- AC-T4.1-5: `npm run lint` passes.

---

### T4.2 — Options Dashboard

**Status:** `[ ]`

**Deliverables:**

- `src/options/options.html`, `options.js`, `options.css`

**Acceptance Criteria:**

- AC-T4.2-1: `options.html` has no inline scripts.
- AC-T4.2-2: Whitelist add/remove persists via `MSG.ADD_WHITELIST_ENTRY` / `MSG.REMOVE_WHITELIST_ENTRY`.
- AC-T4.2-3: Domain input validated against `/^[a-z0-9][a-z0-9\-.]*\.[a-z]{2,}$/i` before adding.
- AC-T4.2-4: Reset button sends `MSG.RESET_STATS` and refreshes display.
- AC-T4.2-5: `npm run lint` passes.

---

## Phase 5: Quality & Release

### T5.1 — Integration Tests

**Status:** `[ ]`

**Deliverables:**

- `tests/integration/blocking.test.js`
- `tests/integration/cosmetic.test.js`

**Acceptance Criteria:**

- AC-T5.1-1: 95%+ of test-case ad URLs match at least one DNR rule.
- AC-T5.1-2: Generic cosmetic selectors hide test DOM elements.
- AC-T5.1-3: `npm test` passes.

---

### T5.2 — Release Build

**Status:** `[ ]`

**Deliverables:**

- `scripts/build.js`
- Updated `docs/14_RELEASE_PROCESS.md`

**Acceptance Criteria:**

- AC-T5.2-1: `npm run build` produces `dist/su-new-ad-blocker.zip`.
- AC-T5.2-2: Zip contains `manifest.json`, `rules/`, `icons/`, and all `src/` files.
- AC-T5.2-3: Zip does not contain `tests/`, `scripts/`, `node_modules/`, or `.txt` filter list files.
- AC-T5.2-4: `npm run lint && npm test` pass.
