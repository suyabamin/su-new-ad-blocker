# 08 — UI Specification

## 1. Popup (`src/popup/`)

### 1.1 Purpose

Quick-glance status and per-site block count. Accessible by clicking the extension icon.

### 1.2 Layout (480 × auto, min-height 240px)

```
┌─────────────────────────────────────┐
│  🛡 SU New Ad Blocker    [toggle]   │
│                                     │
│  example.com                        │
│  Blocked on this site: 42           │
│                                     │
│  Total blocked: 1,284               │
│                                     │
│  ─────────────────────────────────  │
│  [Open Dashboard]                   │
└─────────────────────────────────────┘
```

### 1.3 Elements

| Element            | ID                    | Behaviour                                                                                                            |
| ------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Toggle switch      | `#toggle-enabled`     | Sends `MSG.SET_ENABLED`; persists state                                                                              |
| Site domain        | `#site-domain`        | Hostname read from the active tab for the pause control; its diagnostic match count is a site aggregate, not per-tab |
| Site block count   | `#site-block-count`   | From `MSG.GET_DOMAIN_STATS`                                                                                          |
| Global block count | `#global-block-count` | From `MSG.GET_GLOBAL_STATS`                                                                                          |
| Dashboard link     | `#open-dashboard`     | Opens options page via `chrome.runtime.openOptionsPage()`                                                            |

### 1.4 Rules

- No inline scripts in `popup.html`. All JS in `popup.js`.
- No external fonts or stylesheets (bundle in `popup.css`).
- Popup renders correctly with 0 blocked (first run).
- If statistics are unavailable, show "—" rather than 0 to avoid confusion.

---

## 2. Options Dashboard (`src/options/`)

### 2.1 Purpose

Full-featured management page: stats, whitelist, filter list status.

### 2.2 Layout

```
┌──────────────────────────────────────────────────────┐
│  SU New Ad Blocker — Settings                        │
├──────────────────────────────────────────────────────┤
│  Statistics                                          │
│  Total blocked: 1,284    Last reset: 2026-11-01      │
│  Top blocked domains: [table]                        │
│  [Reset Statistics]                                  │
├──────────────────────────────────────────────────────┤
│  Whitelist                                           │
│  [Add domain input]  [Add]                           │
│  • example.com  [Remove]                             │
│  • trusted.org  [Remove]                             │
├──────────────────────────────────────────────────────┤
│  Filter Lists                                        │
│  EasyList       Last updated: 2026-11-11  [Update]  │
│  EasyPrivacy    Last updated: 2026-11-11  [Update]  │
└──────────────────────────────────────────────────────┘
```

### 2.3 Elements

| Element              | ID                   | Behaviour                                            |
| -------------------- | -------------------- | ---------------------------------------------------- |
| Global count         | `#global-count`      | From `MSG.GET_GLOBAL_STATS`                          |
| Last reset           | `#last-reset`        | Formatted date from `MSG.GET_GLOBAL_STATS`           |
| Top domains table    | `#top-domains`       | From `MSG.GET_TOP_DOMAINS`                           |
| Reset button         | `#reset-stats`       | Sends `MSG.RESET_STATS`, refreshes display           |
| Whitelist input      | `#whitelist-input`   | Domain entry field                                   |
| Add whitelist button | `#whitelist-add`     | Sends `MSG.ADD_WHITELIST_ENTRY`                      |
| Whitelist list       | `#whitelist-list`    | Renders entries; each has a remove button            |
| Filter list status   | `.filter-list-row`   | Last updated from `STORAGE_KEYS.FILTER_LAST_UPDATED` |
| Manual update button | `.filter-update-btn` | Sends `MSG.TRIGGER_FILTER_UPDATE`                    |

### 2.4 Rules

- No inline scripts in `options.html`.
- Domain input is validated: must match `/^[a-z0-9][a-z0-9\-.]*\.[a-z]{2,}$/i` before adding.
- Whitelist changes take effect immediately (dynamic DNR allow rules updated).

---

## 3. General UI Rules

- Vanilla JS only (no frameworks in MVP).
- CSS variables for theming: `--color-primary`, `--color-bg`, `--color-text`, `--color-border`.
- Must be accessible: buttons have `aria-label`, toggle has `role="switch"` and `aria-checked`.
- Must render correctly in both light and dark browser themes (`prefers-color-scheme`).
- No animations that cause layout shift.
