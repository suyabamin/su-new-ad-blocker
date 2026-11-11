# 04 — Blocking Engine

## 1. Overview

Network blocking is implemented exclusively through Chrome's `declarativeNetRequest` (DNR) API. No JavaScript runs in the network request path. The engine has two rule layers:

| Layer                                  | Limit        | Source                                            |
| -------------------------------------- | ------------ | ------------------------------------------------- |
| Static ruleset (`main_blocking_rules`) | 30,000 rules | Bundled at build time from EasyList + EasyPrivacy |
| Dynamic rules                          | 5,000 rules  | Updated at runtime by `rule-updater.js`           |

## 2. Rule Format

All rules conform to the [DNR declarativeNetRequest rule schema](https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-Rule):

```json
{
  "id": 1,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": "||doubleclick.net^",
    "resourceTypes": [
      "script",
      "image",
      "xmlhttprequest",
      "sub_frame",
      "media",
      "font",
      "stylesheet",
      "websocket"
    ]
  }
}
```

### 2.1 URL Filter Syntax

Supported patterns from EasyList:

- `||domain.com^` — block all requests to domain and subdomains
- `|https://domain.com/path` — exact prefix match
- `/regex-like-pattern/` — converted to `regexFilter` where possible
- `@@` exception rules — converted to DNR `allow` action rules (priority 2)

### 2.2 Resource Types

Rules must specify `resourceTypes` to avoid blocking unintended resources. The default set for ad rules:

```json
["script", "image", "xmlhttprequest", "sub_frame", "media"]
```

Tracker rules additionally include:

```json
["ping", "beacon"]
```

## 3. Build Process (`scripts/build-rules.js`)

1. Download `easylist.txt` and `easyprivacy.txt` from URLs in `lists/SOURCES.md`.
2. Parse each line:
   - Skip comment lines (`!`), element-hiding rules (`##`, `#@#`, `#?#`), and empty lines.
   - Convert network filter lines to DNR rule objects.
   - Discard rules that cannot be represented in DNR (e.g., extended CSS selectors in network context).
3. Assign sequential IDs starting from 1.
4. Deduplicate by `urlFilter + resourceTypes` hash.
5. Truncate to 29,000 rules (leave room for dynamic rules to co-exist without hitting limits).
6. Write to `rules/declarative_net_request_rules.json`.

## 4. Dynamic Rule Updater (`src/background/rule-updater.js`)

- Triggered on `chrome.runtime.onInstalled` and by a `chrome.alarms` alarm named `FILTER_UPDATE` (24-hour interval).
- Fetches fresh filter list content via `fetch()`.
- Parses and converts the same way as the build script.
- Calls `chrome.declarativeNetRequest.updateDynamicRules({ addRules, removeRuleIds })`.
- Stores last-updated timestamp in `chrome.storage.local` under `STORAGE_KEYS.FILTER_LAST_UPDATED`.
- On fetch failure: logs the error via `logger.js`, leaves existing rules intact, does not throw.

## 5. Exception Rules (Allow List / Whitelist)

When a user whitelists a domain:

- A DNR `allow` rule with `priority: 10` is added dynamically for that domain.
- This overrides all block rules (which have `priority: 1`).
- Whitelist entries are stored in `STORAGE_KEYS.WHITELIST` and re-applied on service worker start.

## 6. Statistics

`chrome.declarativeNetRequest.onRuleMatchedDebug` fires for every matched rule (requires `declarativeNetRequestFeedback` permission). Handler in `src/background/stats.js`:

- Increments `STORAGE_KEYS.STATS_GLOBAL` counter.
- Increments `STORAGE_KEYS.STATS_BY_DOMAIN[initiatorDomain]` counter.

## 7. Limits and Known Constraints

- Static ruleset: max 30,000 rules total across all rulesets. The build script truncates at 29,000.
- Dynamic rules: max 5,000. The updater must stay within this budget.
- `onRuleMatchedDebug` only fires in unpacked (developer mode) or when the extension is loaded via policy. In production it is unavailable; a fallback counter using `webNavigation` or the popup's tab-query approach may be needed. See ADR if this changes scope.
- `regexFilter` rules count against a separate `MAX_NUMBER_OF_REGEX_RULES` limit (1,000 in Chrome). Prefer `urlFilter` patterns.
