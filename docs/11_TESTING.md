# 11 — Testing

## 1. Framework

- **Unit and integration tests:** [Vitest](https://vitest.dev/)
- **End-to-end tests:** [Playwright](https://playwright.dev/)
- **Test runner command:** `npm test` (alias for `vitest run --passWithNoTests`)
- **End-to-end command:** `npm run test:e2e` (alias for `playwright test`)
- **Config:** `vitest.config.js` at project root.

### Local setup

On machines where C: has little free space, set the `PLAYWRIGHT_BROWSERS_PATH` environment variable to a folder on another drive before running `npx playwright install chromium`.

- **Windows:**
  ```cmd
  setx PLAYWRIGHT_BROWSERS_PATH "D:\.playwright-browsers"
  ```
- **macOS / Linux:**
  ```bash
  export PLAYWRIGHT_BROWSERS_PATH="$HOME/.playwright-browsers"
  ```

## 2. Test File Locations

```
tests/
  unit/
    shared/
      logger.test.js
      messages.test.js
      storage.test.js
    background/
      stats.test.js
      stats-api.test.js
      rule-updater.test.js
    content/
      cosmetic.test.js
      youtube.test.js
      selectors.test.js
      youtube-selectors.test.js
  integration/
    blocking.test.js
    cosmetic.test.js
  e2e/
    popup.spec.js
    options.spec.js
    youtube.spec.js
  fixtures/
  perf/
  site/
```

## 3. Test Environment

- **Node environment** (default) for service worker modules and logic tests.
- **happy-dom or jsdom environment** for content script and DOM tests if needed.

## 4. Chrome API Mocks

Chrome extension APIs (`chrome.*`) can be mocked in test helpers or via vi.fn():

```js
global.chrome = {
  storage: { local: { get: vi.fn(), set: vi.fn() } },
  runtime: { sendMessage: vi.fn(), onMessage: { addListener: vi.fn() } },
  declarativeNetRequest: {
    updateDynamicRules: vi.fn(),
    onRuleMatchedDebug: { addListener: vi.fn() },
  },
  alarms: { create: vi.fn(), onAlarm: { addListener: vi.fn() } },
  tabs: { query: vi.fn() },
};
```

## 5. Coverage Requirements

| Module                           | Minimum coverage |
| -------------------------------- | ---------------- |
| `src/shared/`                    | 100%             |
| `src/background/stats.js`        | 90%              |
| `src/background/stats-api.js`    | 90%              |
| `src/background/rule-updater.js` | 80%              |
| `src/content/cosmetic.js`        | 80%              |
| `src/content/youtube.js`         | 80%              |

## 6. Manual Test Pages

When loading the extension unpacked, verify against these pages:

| Page                                 | What to check                                                  |
| ------------------------------------ | -------------------------------------------------------------- |
| https://www.example.com              | No ads appear; popup shows domain and block count              |
| https://www.youtube.com              | Masthead ad hidden; in-feed promoted videos hidden             |
| https://www.youtube.com/watch?v=...  | Player ad overlay hidden; video plays normally                 |
| Whitelisted domain (add via options) | Extension does not block; popup shows toggle as off for domain |

## 7. Lint

```
npm run lint    # ESLint + Prettier check
```

Lint must pass with zero errors and zero warnings before any task is marked done.
