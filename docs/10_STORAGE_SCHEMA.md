# 10 — Storage Schema

All extension state is stored in `chrome.storage.local`. Keys are defined in `src/shared/storage.js`. No magic strings in any other file.

## 1. `src/shared/storage.js` (canonical definition)

```js
export const STORAGE_KEYS = Object.freeze({
  STATS_GLOBAL: 'stats_global',
  STATS_BY_DOMAIN: 'stats_by_domain',
  STATS_LAST_RESET: 'stats_last_reset',
  ENABLED: 'enabled',
  WHITELIST: 'whitelist',
  FILTER_LAST_UPDATED: 'filter_last_updated',
  SETTINGS: 'settings',
});
```

## 2. Key Schemas

### `STATS_GLOBAL`

- **Type:** `number`
- **Default:** `0`
- **Description:** Total number of requests blocked since last reset.

### `STATS_BY_DOMAIN`

- **Type:** `Record<string, number>` (object mapping domain → count)
- **Default:** `{}`
- **Description:** Per-domain blocked request counts. Key is eTLD+1 (e.g. `example.com`).
- **Size concern:** At 10 B per entry, 10,000 domains = ~100 KB. The stats module trims entries that are more than 30 days old when total entry count exceeds 5,000.

### `STATS_LAST_RESET`

- **Type:** `number` (Unix ms timestamp)
- **Default:** `Date.now()` at install time
- **Description:** When stats were last reset.

### `ENABLED`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Whether the extension is active. When `false`, blocking rules are disabled and content scripts are suppressed.

### `WHITELIST`

- **Type:** `string[]`
- **Default:** `[]`
- **Description:** Array of domains the user has whitelisted. Each entry is an eTLD+1 string (e.g. `example.com`).

### `FILTER_LAST_UPDATED`

- **Type:** `number` (Unix ms timestamp)
- **Default:** `null`
- **Description:** When the dynamic filter rules were last successfully fetched.

### `SETTINGS`

- **Type:** `{ updateIntervalHours: number }`
- **Default:** `{ updateIntervalHours: 24 }`
- **Description:** User-configurable settings. Currently only the filter update interval.

## 3. Storage Size Budget

| Key                   | Estimated max size              |
| --------------------- | ------------------------------- |
| `STATS_GLOBAL`        | 8 B                             |
| `STATS_BY_DOMAIN`     | ~500 KB (50,000 domains × 10 B) |
| `STATS_LAST_RESET`    | 8 B                             |
| `ENABLED`             | 4 B                             |
| `WHITELIST`           | ~5 KB (500 domains × 10 B)      |
| `FILTER_LAST_UPDATED` | 8 B                             |
| `SETTINGS`            | ~50 B                           |
| **Total**             | **< 1 MB** in normal use        |

`chrome.storage.local` has a 10 MB limit. The 5 MB product-level AC (AC-P6) is well within this.

## 4. Migration

If the storage schema changes in a future task:

1. The service worker's `onInstalled` handler must include a migration step.
2. Document the migration in an ADR.
3. Write a unit test for the migration.
