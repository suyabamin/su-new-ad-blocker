# 07 — Statistics

## 1. Overview

The global and per-domain totals count network requests only. Cosmetic and YouTube
events remain available in `byType` diagnostics and do not increase these totals.

- **Global counter** — total requests blocked across all sites since last reset
- **Per-domain counters** — requests blocked per initiator domain

All counters live in `chrome.storage.local`. No data leaves the device.

## 2. Event Source

The background tracker snapshots `chrome.declarativeNetRequest.getMatchedRules()` when popup statistics are requested. New rule matches are deduplicated by tab, rule, and match timestamp, then attributed to the page hostname for that tab. Paused page domains are excluded.

> **Note:** DNR match diagnostics require feedback permission and are intended for unpacked/debug or enterprise installs. In production store builds these diagnostics may be unavailable, so reliable network counts are not guaranteed there.

The `getMatchedRules()` API returns matched rule metadata, not request URLs. Requests are attributed to the page tab, and the API only retains certain matches for active documents for a limited period. Cosmetic statistics remain separate and are reported by the content script.

## 3. Storage Schema

See `docs/10_STORAGE_SCHEMA.md` for the full schema. Stats-relevant keys:

| Key (from `STORAGE_KEYS`) | Type                     | Description                  |
| ------------------------- | ------------------------ | ---------------------------- |
| `STATS_GLOBAL`            | `number`                 | Total blocked count          |
| `STATS_BY_DOMAIN`         | `Record<string, number>` | Per-domain blocked count     |
| `STATS_LAST_RESET`        | `number`                 | Unix timestamp of last reset |

## 4. Counter Module (`src/background/stats.js`)

```js
// Pseudocode — not the implementation
getMatchedRules() -> deduplicate newly observed matches -> attribute each to its tab hostname
```

- `extractDomain` strips scheme and port, returns eTLD+1 (e.g. `example.com`).
- Writes are batched: counters are incremented in memory and flushed to `chrome.storage.local` at most once per second (debounced flush) to avoid write amplification.
- On service worker restart, in-memory counters are initialized from `chrome.storage.local`.

## 5. Statistics API (`src/background/stats-api.js`)

Handles messages from popup and options page:

| Message (`MSG.*`)  | Response                                                    |
| ------------------ | ----------------------------------------------------------- |
| `GET_GLOBAL_STATS` | `{ global: number, lastReset: number }`                     |
| `GET_DOMAIN_STATS` | `{ domain: string, count: number }`                         |
| `GET_TOP_DOMAINS`  | `{ domains: Array<{domain, count}> }` (top 10, sorted desc) |
| `RESET_STATS`      | `{ ok: true }` — clears all counters                        |

## 6. Reset Behavior

`RESET_STATS` message:

1. Sets `STATS_GLOBAL` to 0.
2. Sets `STATS_BY_DOMAIN` to `{}`.
3. Sets `STATS_LAST_RESET` to `Date.now()`.
4. Clears in-memory counters.

## 7. Display in UI

- **Popup**: shows global count and current-domain count (queried via `MSG.GET_DOMAIN_STATS` with the active tab's domain).
- **Options dashboard**: shows global count, last-reset timestamp, top 10 blocked domains.
