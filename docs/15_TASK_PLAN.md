# 15 — Task Plan

Tasks are worked one at a time, in order. Mark a task `[x]` only when **all** its acceptance
criteria pass, lint is clean, and CHANGELOG is updated.

---

## Phase A: Baseline Audit and Cleanup

### TA.1 — Remove premature stubs and reset incorrect files

**Status:** `[x]`

**Deliverables:**

- All premature stub source files removed (background, content, popup, options, scripts)
- All test files that tested wrong constants removed
- `docs/09_MESSAGING_CONTRACT.md` rewritten with canonical 16-message spec
- `docs/10_STORAGE_SCHEMA.md` rewritten with canonical 7 storage keys + pattern helpers
- `docs/11_TESTING.md` rewritten with canonical testing standards (95%/80%/80% thresholds)
- `docs/15_TASK_PLAN.md` replaced with this canonical plan (all tasks reset to `[ ]`)
- `vitest.config.js` coverage thresholds: 95% for `src/shared/**`, 80% for `src/background/**` and `src/content/**`

**Acceptance Criteria:**

- AC-TA.1-1: `git status` shows clean working tree.
- AC-TA.1-2: `npm run lint` exits 0 with no errors or warnings.
- AC-TA.1-3: `npm test` exits 0 (`--passWithNoTests` active).
- AC-TA.1-4: All removed files are absent from disk and from `git ls-files`.

---

## Phase B: Tooling

### TB.1 — ESLint 9 Flat Config Migration (T0.3)

**Status:** `[x]`

**Deliverables:**

- `eslint.config.js` (ESLint 9 flat config with `@eslint/js` recommended)
- `.eslintrc.cjs` deleted
- `eslint` updated to `^9.0.0` in `package.json`
- `@eslint/js` and `globals` packages installed

**Acceptance Criteria:**

- AC-TB.1-1: `npm run lint` exits 0 and uses `eslint.config.js` (no `.eslintrc` files present).
- AC-TB.1-2: `no-console`, `no-eval`, `no-new-func`, `no-implied-eval`, `prefer-const`, `no-var`, `no-unused-vars`, `eqeqeq`, `curly`, `no-throw-literal` rules are active.
- AC-TB.1-3: Test files allow `no-console` off; scripts allow `no-console` off and node globals.
- AC-TB.1-4: `eslint --version` outputs `v9.x.x`.

---

### TB.2 — CI Workflow (T0.4)

**Status:** `[x]`

**Deliverables:**

- `.github/workflows/ci.yml`

**Acceptance Criteria:**

- AC-TB.2-1: Workflow triggers on `push` and `pull_request`.
- AC-TB.2-2: Steps run: `npm ci`, `npm run lint`, `npm test`, `npm run test:coverage`, `npx playwright install --with-deps chromium`, `npm run test:e2e`.
- AC-TB.2-3: Node version is pinned to 20.
- AC-TB.2-4: File passes `npm run lint`.

---

## Phase C: Shared Modules

### TC.1 — Shared Constants and Logger

**Status:** `[x]`

**Deliverables:**

- `src/shared/messages.js` — frozen `MSG` with 16 canonical message types + `isKnownType(type)` helper
- `src/shared/storage.js` — frozen `STORAGE_KEYS` with 7 canonical keys + `dailyStatsKey()` + `getListCacheKey()`
- `src/shared/settings.js` — `DEFAULT_SETTINGS` + `validateSettingsPatch(patch)`
- `src/shared/logger.js` — `debug`, `info`, `warn`, `error` methods; silent by default; never throws
- `tests/unit/shared/messages.test.js`
- `tests/unit/shared/storage.test.js`
- `tests/unit/shared/settings.test.js`
- `tests/unit/shared/logger.test.js`

**Acceptance Criteria:**

- AC-TC.1-1: `MSG` is frozen; has exactly 16 keys; each value equals its key name as a string; values are unique.
- AC-TC.1-2: `MSG` exactly matches the 16 types in `docs/09_MESSAGING_CONTRACT.md` Section 2 (parity test uses explicit literals).
- AC-TC.1-3: `isKnownType(type)` returns `true` for every MSG value and `false` for any other string.
- AC-TC.1-4: `STORAGE_KEYS` is frozen; has exactly 7 keys; values match `docs/10_STORAGE_SCHEMA.md` Section 1 exactly (parity test uses explicit literals).
- AC-TC.1-5: `dailyStatsKey('2026-11-12')` returns `'stats:day:2026-11-12'`; throws `TypeError` on invalid input.
- AC-TC.1-6: `getListCacheKey('easylist')` returns `'cache:lists:easylist'`; throws `TypeError` on empty/invalid.
- AC-TC.1-7: `DEFAULT_SETTINGS` matches the shape in `docs/10_STORAGE_SCHEMA.md` Section 3.
- AC-TC.1-8: `validateSettingsPatch({ blockingEnabled: false })` returns `{ ok: true, errors: [] }`.
- AC-TC.1-9: Logger methods (`debug`, `info`, `warn`, `error`) do not throw in any mode.
- AC-TC.1-10: Logger produces no output when debug mode is off.
- AC-TC.1-11: Logger produces structured tagged output when debug mode is on.
- AC-TC.1-12: `npm run lint && npm test && npm run test:coverage` exit 0; `src/shared/**` coverage ≥ 95%.

---

## Phase D: Network Blocking

### TD.1 — Static DNR Ruleset (T1.1)

**Status:** `[x]`

**Deliverables:**

- `scripts/build-rules.js` — downloads EasyList/EasyPrivacy, converts to DNR JSON, writes `rules/declarative_net_request_rules.json`
- `rules/declarative_net_request_rules.json` — bundled static ruleset (≥ 500 rules)
- `tests/unit/background/build-rules.test.js`

**Acceptance Criteria:**

- AC-TD.1-1: `npm run build-rules` exits 0 and writes a valid JSON array to `rules/declarative_net_request_rules.json`.
- AC-TD.1-2: Ruleset contains ≥ 500 rules.
- AC-TD.1-3: Every rule has `id`, `priority`, `action`, and `condition` fields.
- AC-TD.1-4: At least 10 canonical ad-network domains (`doubleclick.net`, `googlesyndication.com`, `adnxs.com`, `moatads.com`, `scorecardresearch.com`, `krxd.net`, `adsrvr.org`, `casalemedia.com`, `pubmatic.com`, `rubiconproject.com`) appear as block rules.
- AC-TD.1-5: `npm run lint && npm test` exit 0.

---

### TD.2 — Dynamic Rule Updater (T1.2)

**Status:** `[x]`

**Deliverables:**

- `src/background/rule-updater.js`
- `src/background/service-worker.js` (initial scaffold with rule-updater wired in)
- `tests/unit/background/rule-updater.test.js`

**Acceptance Criteria:**

- AC-TD.2-1: Rules refresh on `chrome.runtime.onInstalled`.
- AC-TD.2-2: A `chrome.alarms` alarm named `FILTER_UPDATE` is created with a 24-hour period.
- AC-TD.2-3: Fetch failures are caught, logged via `logger`, and do not crash the service worker.
- AC-TD.2-4: `STORAGE_KEYS['stats:meta']` (or a dedicated key) is written on successful update.
- AC-TD.2-5: `npm run lint && npm test` exit 0.

---

## Phase E: Statistics and Messaging

### TE.1 — Block Event Counter (T3.1)

**Status:** `[x]`

**Deliverables:**

- `src/background/stats.js`
- `tests/unit/background/stats.test.js`

**Acceptance Criteria:**

- AC-TE.1-1: `onRuleMatchedDebug` listener increments global and per-domain counters in memory.
- AC-TE.1-2: Counters are flushed to `chrome.storage.local` at most once per second (debounced).
- AC-TE.1-3: On init, counters are loaded from `chrome.storage.local`.
- AC-TE.1-4: `npm run lint && npm test` exit 0.

---

### TE.2 — Statistics Messaging API (T3.2)

**Status:** `[x]`

**Deliverables:**

- `src/background/stats-api.js`
- Updated `src/background/service-worker.js` (message router wired in)
- `tests/unit/background/stats-api.test.js`

**Acceptance Criteria:**

- AC-TE.2-1: Handles `MSG.GET_TAB_STATS`, `MSG.GET_TODAY_SUMMARY`, `MSG.GET_STATS_RANGE`, `MSG.GET_TOP_DOMAINS`, `MSG.STATS_EXPORT`, `MSG.STATS_RESET`.
- AC-TE.2-2: Unknown message types return `{ ok: false, error: 'unknown message type' }`.
- AC-TE.2-3: `MSG.STATS_RESET` zeroes counters and writes `stats:meta`.
- AC-TE.2-4: `npm run lint && npm test` exit 0.

---

## Phase F: Cosmetic Filtering

### TF.1 — Generic Cosmetic Content Script (T2.1)

**Status:** `[x]`

**Deliverables:**

- `src/content/cosmetic.js`
- `src/content/selectors.js` (≥ 20 generic ad-container selectors)
- `tests/unit/content/cosmetic.test.js`

**Acceptance Criteria:**

- AC-TF.1-1: A `<style>` tag is injected into `document.documentElement` at `document_start`.
- AC-TF.1-2: Every selector in `selectors.js` appears in the injected CSS with `display:none !important`.
- AC-TF.1-3: A `MutationObserver` is installed and applies hiding to newly added matching nodes.
- AC-TF.1-4: No `<script>` tags are created or injected.
- AC-TF.1-5: `npm run lint && npm test` exit 0.

---

### TF.2 — YouTube Cosmetic Content Script (T2.2)

**Status:** `[x]`

**Deliverables:**

- `src/content/youtube.js`
- `src/content/youtube-selectors.js`
- `tests/unit/content/youtube.test.js`

**Acceptance Criteria:**

- AC-TF.2-1: Selectors target ad overlay containers, pre-roll banners, and sponsored card selectors only.
- AC-TF.2-2: No selector references `video`, `audio`, `ytd-player`, or any playback control element.
- AC-TF.2-3: A `MutationObserver` is installed on `document.body`.
- AC-TF.2-4: The script does not reference `video`, `audio`, or any playback control in code.
- AC-TF.2-5: `npm run lint && npm test` exit 0.

---

## Phase G: UI

### TG.1 — Popup (T4.1)

**Status:** `[x]`

**Deliverables:**

- `src/popup/popup.html`, `src/popup/popup.js`, `src/popup/popup.css`

**Acceptance Criteria:**

- AC-TG.1-1: `popup.html` has no inline scripts or inline event handlers.
- AC-TG.1-2: All UI strings come from JS constants (no magic strings in JS).
- AC-TG.1-3: Pause-site toggle sends `MSG.TOGGLE_PAUSE_SITE` and updates `aria-checked`.
- AC-TG.1-4: Stats area displays `GET_TODAY_SUMMARY` response.
- AC-TG.1-5: "Open Dashboard" calls `chrome.runtime.openOptionsPage()`.
- AC-TG.1-6: `npm run lint` exits 0.

---

### TG.2 — Options Dashboard (T4.2)

**Status:** `[x]`

**Deliverables:**

- `src/options/options.html`, `src/options/options.js`, `src/options/options.css`

**Acceptance Criteria:**

- AC-TG.2-1: `options.html` has no inline scripts or inline event handlers.
- AC-TG.2-2: Allowlist add/remove sends `MSG.ALLOWLIST_ADD` / `MSG.ALLOWLIST_REMOVE`.
- AC-TG.2-3: Domain input validated against `/^[a-z0-9][a-z0-9\-.]*\.[a-z]{2,}$/i` before adding.
- AC-TG.2-4: Reset button sends `MSG.STATS_RESET` and refreshes display.
- AC-TG.2-5: Stats chart uses a locally-bundled charting library (no CDN link).
- AC-TG.2-6: `npm run lint` exits 0.

---

## Phase H: Quality and Release

### TH.1 — Integration Tests (T5.1)

**Status:** `[ ]`

**Deliverables:**

- `tests/integration/blocking.test.js`
- `tests/integration/cosmetic.test.js`

**Acceptance Criteria:**

- AC-TH.1-1: ≥ 95% of test-case ad URLs match at least one DNR rule.
- AC-TH.1-2: Generic cosmetic selectors hide test DOM elements.
- AC-TH.1-3: `npm test` exits 0.

---

### TH.2 — E2E Blocking and Cosmetic Tests

**Status:** `[ ]`

**Deliverables:**

- `tests/e2e/blocking.spec.js`
- `tests/e2e/cosmetic.spec.js`

**Acceptance Criteria:**

- AC-TH.2-1: Extension loads in Playwright Chromium without console errors.
- AC-TH.2-2: At least one ad-network request is blocked on a test fixture page.
- AC-TH.2-3: At least one ad container element is hidden by the cosmetic script.
- AC-TH.2-4: `npm run test:e2e` exits 0.

---

### TH.3 — Release Build (T5.2)

**Status:** `[ ]`

**Deliverables:**

- `scripts/build.js`
- `dist/su-new-ad-blocker.zip`
- Updated `docs/14_RELEASE_PROCESS.md`

**Acceptance Criteria:**

- AC-TH.3-1: `npm run build` exits 0 and produces `dist/su-new-ad-blocker.zip`.
- AC-TH.3-2: Zip contains `manifest.json`, `rules/`, `icons/`, and all `src/` files.
- AC-TH.3-3: Zip does NOT contain `tests/`, `scripts/`, `node_modules/`, or `.txt` filter list files.
- AC-TH.3-4: `npm run lint && npm test` exit 0.
- AC-TH.3-5: `git tag v0.1.0` and `CHANGELOG.md` updated with `[0.1.0]` release entry.
