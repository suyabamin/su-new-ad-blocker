# 02 — Architecture

## 1. High-Level Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Chromium)                                             │
│                                                                 │
│  ┌──────────────────────┐   declarativeNetRequest ruleset       │
│  │  Service Worker      │◄──────────────────────────────────    │
│  │  (background)        │                                       │
│  │                      │  chrome.storage.local (stats,         │
│  │  • rule-updater.js   │  whitelist, settings)                 │
│  │  • stats.js          │◄──────────────────────────────────    │
│  │  • stats-api.js      │                                       │
│  │  • service-worker.js │  chrome.runtime messaging             │
│  └──────────┬───────────┘◄──────────────────────────────────    │
│             │                                                   │
│  ┌──────────▼──────────────────────────────────────────────┐   │
│  │  Content Scripts (injected into web pages)              │   │
│  │                                                         │   │
│  │  cosmetic.js  — generic ad-container CSS hider          │   │
│  │  youtube.js   — YouTube ad UI container hider           │   │
│  └──────────────────────────────────────────────────────── ┘   │
│                                                                 │
│  ┌────────────────┐    ┌──────────────────────────────────┐    │
│  │  Popup         │    │  Options Dashboard               │    │
│  │  popup.html    │    │  options.html                    │    │
│  │  popup.js      │    │  options.js                      │    │
│  │  popup.css     │    │  options.css                     │    │
│  └────────────────┘    └──────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Shared Modules (src/shared/)                            │  │
│  │  messages.js — MSG constants    (no magic strings)       │  │
│  │  storage.js  — STORAGE_KEYS     (no magic strings)       │  │
│  │  logger.js   — structured logger (wraps console)         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Static Assets                                           │  │
│  │  rules/declarative_net_request_rules.json (DNR ruleset)  │  │
│  │  icons/icon{16,32,48,128}.png                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Directory Structure

```
su_new_ad_blocker/
├── AGENTS.md
├── CHANGELOG.md
├── README.md
├── manifest.json
├── package.json
├── .eslintrc.cjs
├── .prettierrc.json
├── jest.config.js
├── .gitignore
├── docs/
│   ├── ADR/
│   │   └── 0001-use-mv3-dnr.md
│   ├── 01_PRD.md  …  15_TASK_PLAN.md
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── lists/
│   ├── SOURCES.md
│   └── (easylist.txt, easyprivacy.txt — downloaded at build time, not committed)
├── rules/
│   └── declarative_net_request_rules.json
├── scripts/
│   ├── build-rules.js   (converts filter list syntax → DNR JSON)
│   └── build.js         (packages extension into zip)
├── src/
│   ├── background/
│   │   ├── service-worker.js
│   │   ├── rule-updater.js
│   │   ├── stats.js
│   │   └── stats-api.js
│   ├── content/
│   │   ├── cosmetic.js
│   │   ├── selectors.js
│   │   ├── youtube.js
│   │   └── youtube-selectors.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   └── shared/
│       ├── messages.js
│       ├── storage.js
│       └── logger.js
└── tests/
    ├── unit/
    └── integration/
```

## 3. Data Flow

### 3.1 Network Blocking (DNR)

1. At build time, `scripts/build-rules.js` downloads EasyList/EasyPrivacy, converts them to DNR JSON, and writes `rules/declarative_net_request_rules.json`.
2. `manifest.json` registers the ruleset as a static `rule_resource`.
3. Chrome loads and enforces the ruleset before any network request is made — no JavaScript involved in blocking.
4. `src/background/rule-updater.js` runs on `chrome.runtime.onInstalled` and on a 24-hour `chrome.alarms` to fetch fresh lists and update dynamic rules via `chrome.declarativeNetRequest.updateDynamicRules`.
5. `chrome.declarativeNetRequest.onRuleMatchedDebug` fires for each matched rule; `src/background/stats.js` increments per-domain and global counters in `chrome.storage.local`.

### 3.2 Cosmetic Filtering

1. `src/content/cosmetic.js` runs at `document_start` on all pages.
2. It injects a single `<style>` tag containing CSS rules from `src/content/selectors.js` with `display: none !important`.
3. A `MutationObserver` watches for new nodes and re-applies selectors as the page loads.

### 3.3 YouTube Ad UI Hiding

1. `src/content/youtube.js` runs at `document_idle` only on `*://*.youtube.com/*`.
2. It injects CSS from `src/content/youtube-selectors.js` targeting ad UI containers (overlays, banners, promoted cards).
3. It explicitly does **not** touch `<video>`, `<audio>`, or any playback control.

### 3.4 Messaging

- Popup and options pages send `chrome.runtime.sendMessage` with a typed message from `MSG` constants.
- The service worker listens via `chrome.runtime.onMessage` and routes to the appropriate handler.
- All message types are defined in `src/shared/messages.js`.

### 3.5 Storage

- All state is in `chrome.storage.local`.
- Keys are defined in `src/shared/storage.js`.
- Schema: see `docs/10_STORAGE_SCHEMA.md`.

## 4. Security Model

- CSP: `script-src 'self'; object-src 'none'` on all extension pages.
- No `eval`, `new Function`, or `innerHTML` with untrusted strings.
- Filter list URLs are hardcoded in `lists/SOURCES.md` and checked in `rule-updater.js`.
- No external scripts, fonts, or stylesheets loaded at runtime.

## 5. Build Pipeline

```
npm run build-rules   → download lists → parse → emit rules/declarative_net_request_rules.json
npm run build         → copy src/ + rules/ + icons/ → zip → dist/su-new-ad-blocker.zip
npm run lint          → ESLint + Prettier check
npm test              → Jest unit + integration tests
```
