# 10 — Storage Schema

All reads and writes to `chrome.storage.local` MUST use keys from `STORAGE_KEYS` in
`src/shared/storage.js`, or the pattern-key helpers `dailyStatsKey()` / `getListCacheKey()`.
No magic strings anywhere else.

---

## 1. Static Key Table

| JS Property         | Storage Key         | Type            | Description                                                  |
| ------------------- | ------------------- | --------------- | ------------------------------------------------------------ |
| `schemaVersion`     | `schemaVersion`     | `number`        | Integer schema version; increment on breaking layout changes |
| `settings`          | `settings`          | `object`        | User settings — see Section 3 for shape                      |
| `lists`             | `lists`             | `object`        | Map of `listId → { enabled, url, etag, lastFetched }`        |
| `allowlist`         | `allowlist`         | `string[]`      | Domains the user has paused blocking for                     |
| `customRules`       | `customRules`       | `object[]`      | User-authored DNR rules (same schema as DNR rules)           |
| `stats:lifetime`    | `stats:lifetime`    | `object`        | `{ totalBlocked, totalCosmeticHidden }`                      |
| `stats:meta`        | `stats:meta`        | `object`        | `{ firstSeen, lastReset }`                                   |

---

## 2. Pattern Keys (Helpers Required)

| Pattern                       | Helper                              | Example output              |
| ----------------------------- | ----------------------------------- | --------------------------- |
| `stats:day:YYYY-MM-DD`        | `dailyStatsKey(dateString)`         | `stats:day:2026-11-12`      |
| `cache:lists:<listId>`        | `getListCacheKey(listId)`           | `cache:lists:easylist`      |

### `dailyStatsKey(dateString)`

- Accepts a string in `YYYY-MM-DD` format only.
- Throws `TypeError` if the argument is not a string, is empty, or does not match `/^\d{4}-\d{2}-\d{2}$/`.
- Returns `"stats:day:" + dateString`.

### `getListCacheKey(listId)`

- Accepts a non-empty string matching `/^[a-z0-9_-]+$/`.
- Throws `TypeError` if the argument is not a string, is empty, or contains characters outside `[a-z0-9_-]`.
- Returns `"cache:lists:" + listId`.

---

## 3. Settings Object Shape

```js
// Default value (also exported from src/shared/settings.js)
{
  blockingEnabled:   true,   // master on/off for DNR blocking
  cosmeticEnabled:  true,   // on/off for cosmetic hiding
  youtubeEnabled:   true,   // on/off for YouTube cosmetic module
  scriptletsEnabled: false,  // reserved; not yet implemented
  showBadge:         true,   // show block count badge on extension icon
  locale:            'en',   // UI locale string
}
```

---

## 4. Migration

When `schemaVersion` is absent or less than the current version, the service worker MUST
run a migration function that fills in missing keys with their defaults before any other
read operation. The migration writes the new `schemaVersion` on completion.

---

## 5. Quota

`chrome.storage.local` has a 10 MB quota. Daily stats older than 90 days MUST be pruned
on each service worker startup to stay within quota.
