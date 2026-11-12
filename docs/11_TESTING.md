# 11 — Testing Standards

---

## 1. Test Stack

| Layer                      | Tool                  | Runner command          |
| -------------------------- | --------------------- | ----------------------- |
| Unit                       | Vitest                | `npm test`              |
| Coverage                   | Vitest + V8           | `npm run test:coverage` |
| Integration                | Vitest + Chrome Mock  | `npm test`              |
| E2E (browser context)      | Playwright Chromium   | `npm run test:e2e`      |
| Performance                | Benchmark runner      | `npm run test:perf`     |
| Accessibility              | axe-core + Playwright | `npm run test:a11y`     |

---

## 2. Directory Layout

```
tests/
  unit/
    shared/         # src/shared/* unit tests
    background/     # src/background/* unit tests (mocked chrome API)
    content/        # src/content/* unit tests (mocked DOM / pure logic)
    build/          # build script & bundle syntax tests
  integration/      # multi-module tests with mocked chrome API
  e2e/              # Playwright tests loading unpacked dist/
  fixtures/         # shared test data (DNR rules, filter list snippets, HTML pages, youtube fixtures)
  site/             # local HTTP fixtures served during e2e tests
  perf/             # performance benchmarks (non-blocking, informational only)
```

---

## 3. Coverage Thresholds

Coverage is measured with V8 on `src/**/*.js` only. Test files and scripts are excluded.

| Path glob           | Statements | Branches | Functions | Lines |
| ------------------- | ---------- | -------- | --------- | ----- |
| `src/shared/**`     | 95%        | 95%      | 95%       | 95%   |
| `src/background/**` | 80%        | 80%      | 80%       | 80%   |
| `src/content/**`    | 80%        | 80%      | 80%       | 80%   |

Do not set 100% threshold anywhere. Builds MUST NOT be tagged if coverage drops below these thresholds.

---

## 4. Chrome API Mocking

Unit and integration tests run in Node. They must import the chrome mock helper before any
source module that uses `chrome.*`:

```js
import { mockChrome } from '../../fixtures/chrome-mock.js';
// sets globalThis.chrome to a minimal mock before importing source
import { myModule } from '../../../src/background/my-module.js';
```

The mock at `tests/fixtures/chrome-mock.js` MUST cover at minimum:

- `chrome.storage.local` — in-memory Map-backed `get`, `set`, `remove`
- `chrome.runtime` — `onMessage`, `sendMessage`, `id`, `getManifest`
- `chrome.declarativeNetRequest` — `updateDynamicRules`, `getDynamicRules`, `updateEnabledRulesets`, `getMatchedRules`
- `chrome.alarms` — `create`, `onAlarm`, `clearAll`, `get`
- `chrome.action` — `setBadgeText`, `setBadgeBackgroundColor`
- `chrome.i18n` — `getMessage`

---

## 5. E2E Tests

E2E tests load the unpacked extension in a persistent Chromium context provided by Playwright.
The browser binary is located at `D:\.playwright-browsers\chromium-1254` (set via `PLAYWRIGHT_BROWSERS_PATH=D:\.playwright-browsers`).

The build step (`npm run build`, triggered automatically by `npm run test:e2e` via `pretest:e2e`)
bundles content scripts with esbuild into IIFE format and packages the extension in `dist/`.
The extension directory passed to Playwright is `dist/` (which contains `manifest.json` and all
runtime assets).

E2E tests live in `tests/e2e/` and are named `*.spec.js`.

---

## 6. Local Setup & Low-Disk-Space Environments

On developer machines or test environments where the `C:` drive has limited free space:

1. Keep npm cache, temp files, and Playwright browser downloads on `D:`.
2. Configure `PLAYWRIGHT_BROWSERS_PATH`:
   ```bash
   # Windows PowerShell
   $env:PLAYWRIGHT_BROWSERS_PATH = 'D:\.playwright-browsers'
   # Persistent user env
   [Environment]::SetEnvironmentVariable('PLAYWRIGHT_BROWSERS_PATH', 'D:\.playwright-browsers', 'User')
   ```
3. Copy `.env.example` to `.env` if local env loading is used (do not commit `.env`).

```bash
# Install dependencies
npm ci

# Install Playwright Chromium (once)
npx playwright install chromium

# Run all checks
npm run lint
npm test
npm run test:coverage
npm run build
npm run test:e2e
```

---

## 7. Test File Rules

- Every test file MUST import only from relative paths — no aliased paths.
- Expected values in parity tests MUST be typed as explicit string literals from the canonical spec, never read from the source file under test.
- Test files MUST NOT `console.log` in committed code (the `no-console` rule is off for tests as a convenience, but avoid it).
- Each test file covers one source file; name it `<source-basename>.test.js`.
