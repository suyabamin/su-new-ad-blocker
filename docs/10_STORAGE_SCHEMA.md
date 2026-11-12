# 10 — Storage Schema

All reads and writes to `chrome.storage.local` MUST use keys from `STORAGE_KEYS` in
`src/shared/storage.js`, or the pattern-key helpers `dailyStatsKey()` / `listCacheKey()`,
and the accessor wrapper `getWithDefaults()`. No magic strings anywhere else.

---

## 1. Static Key Table

| JS Property      | Storage Key      | Type       | Description                                                  |
| ---------------- | ---------------- | ---------- | ------------------------------------------------------------ |
| `schemaVersion`  | `schemaVersion`  | `number`   | Integer schema version; increment on breaking layout changes |
| `settings`       | `settings`       | `object`   | User settings — see Section 3 for shape                      |
| `lists`          | `lists`          | `object`   | Map of `listId → { enabled, url, etag, lastFetched }`        |
| `allowlist`      | `allowlist`      | `string[]` | Domains paused from blocking                                 |
| `customRules`    | `customRules`    | `object[]` | User-authored DNR rules                                      |
| `stats:lifetime` | `stats:lifetime` | `object`   | `{ total, byType: { network, cosmetic, youtube } }`          |
| `stats:meta`     | `stats:meta`     | `object`   | `{ firstSeen, lastReset }`                                   |

---

## 2. Pattern Keys and Helpers

### `dailyStatsKey(date)`

- Validates that `date` is a valid string matching `YYYY-MM-DD` AND represents a real calendar date (e.g. rejects `2024-02-30`).
- Returns `"stats:day:" + date`.
- Throws `TypeError` on any invalid, missing, or impossible calendar date.

### `listCacheKey(listId)`

- Validates that `listId` matches `/^[a-z0-9_-]{1,64}$/`.
- Returns `"cache:lists:" + listId`.
- Throws `TypeError` if invalid or out of range.

### `getWithDefaults(area, key, defaultValue)`

- Dedicated read wrapper for `chrome.storage.local`. Reads from storage via this wrapper only; returns `defaultValue` when missing or undefined.

---

## 3. Settings Object Shape

```js
// Default value (exported as DEFAULT_SETTINGS from src/shared/settings.js)
{
  blockingEnabled:   true,   // Master DNR network blocking
  cosmeticEnabled:  true,   // Generic CSS hiding + MutationObserver
  youtubeEnabled:   true,   // YouTube cosmetic UI container hiding
  scriptletsEnabled: false,  // Reserved
  showBadge:         true,   // Show badge on toolbar action icon
  locale:            'en',   // UI locale (must be 'en')
}
```

---

## 4. Statistics Data Schema

### Daily Bucket (`stats:day:YYYY-MM-DD`)

```js
{
  date: '2026-11-12',
  total: 120,
  byType: {
    network: 100,
    cosmetic: 15,
    youtube: 5
  },
  byList: {
    easylist: 80,
    easyprivacy: 20
  },
  topDomains: {
    'doubleclick.net': 45,
    'adnxs.com': 30
  }
}
```

- `topDomains` is strictly capped at 50 entries (lowest counts dropped upon insertion).
- Only hostnames/domains are stored; never full URLs or query strings.

### Lifetime Totals (`stats:lifetime`)

```js
{
  total: 1200,
  byType: {
    network: 1000,
    cosmetic: 150,
    youtube: 50
  }
}
```

---

## 5. Retention & Alarms

- Daily buckets older than 90 days are pruned automatically.
- Alarms registered:
  - `"stats-prune"`: runs daily to prune buckets older than 90 days.
  - `"list-update"`: runs daily to trigger filter list update check.
- No other alarms are permitted.
