# 09 — Messaging Contract

All communication between extension components (popup, options, content scripts, service worker)
must use `chrome.runtime.sendMessage` / `chrome.runtime.onMessage` conforming to the canonical envelope.

---

## 1. Rules

- Every `type` value MUST come from the frozen `MSG` object in `src/shared/messages.js`. No magic strings.
- Exactly 16 canonical message types exist. `isKnownType(type)` validates whether a type string is recognized.
- Request envelope: `{ type, payload, v: 1 }`.
- Response format:
  - Success: `{ ok: true, data }`
  - Error: `{ ok: false, error: { code, message } }`
- Error codes MUST be one of:
  - `BAD_PAYLOAD`: Missing or malformed payload fields.
  - `UNKNOWN_TYPE`: Unrecognized message type.
  - `NOT_FOUND`: Target resource or entity not found.
  - `INTERNAL`: Unexpected internal error in handler.
  - `RESTRICTED_PAGE`: Action cannot be performed on restricted browser page (e.g. chrome://, Web Store).
  - `STORAGE_FULL`: Extension storage quota exceeded.
- Handlers that perform async work MUST `return true` from `onMessage` to keep the channel open.
- No sensitive data (PII, tokens, browsing history) may appear in any message payload.

---

## 2. Canonical Message Types (16)

| Constant             | Value                | Direction                  | Description                                      |
| -------------------- | -------------------- | -------------------------- | ------------------------------------------------ |
| `GET_TAB_STATS`      | `GET_TAB_STATS`      | popup → background         | Block count for active tab's hostname            |
| `GET_TODAY_SUMMARY`  | `GET_TODAY_SUMMARY`  | popup → background         | Today's aggregate blocks split by type           |
| `GET_STATS_RANGE`    | `GET_STATS_RANGE`    | options → background       | Daily stats for range `{ from, to }`             |
| `GET_TOP_DOMAINS`    | `GET_TOP_DOMAINS`    | options → background       | Top N blocked domains `{ n }`                    |
| `TOGGLE_PAUSE_SITE`  | `TOGGLE_PAUSE_SITE`  | popup → background         | Pause/resume blocking for site `{ domain }`      |
| `GET_COSMETIC_RULES` | `GET_COSMETIC_RULES` | content → background       | Fetch cosmetic rules for `{ hostname }`          |
| `CS_BLOCKED_REPORT`  | `CS_BLOCKED_REPORT`  | content → background       | Batched cosmetic block counts `{ count, type }`  |
| `ALLOWLIST_ADD`      | `ALLOWLIST_ADD`      | options → background       | Add domain to allowlist `{ domain }`             |
| `ALLOWLIST_REMOVE`   | `ALLOWLIST_REMOVE`   | options → background       | Remove domain from allowlist `{ domain }`        |
| `LIST_TOGGLE`        | `LIST_TOGGLE`        | options → background       | Enable/disable filter list `{ listId, enabled }` |
| `LIST_UPDATE_NOW`    | `LIST_UPDATE_NOW`    | options → background       | Trigger manual update of filter lists            |
| `CUSTOM_RULES_SET`   | `CUSTOM_RULES_SET`   | options → background       | Update custom user rules `{ rules }`             |
| `STATS_EXPORT`       | `STATS_EXPORT`       | options → background       | Export full stats as JSON `{}`                   |
| `STATS_RESET`        | `STATS_RESET`        | options → background       | Reset stats (requires `{ confirm: true }`)       |
| `SETTINGS_GET`       | `SETTINGS_GET`       | popup/options → background | Read current settings object `{}`                |
| `SETTINGS_SET`       | `SETTINGS_SET`       | popup/options → background | Patch settings `{ patch }`                       |

---

## 3. Message & Response Envelopes

### Request Envelope

```js
{
  type: MSG.GET_TAB_STATS,
  payload: { tabId: 123, domain: 'example.com' },
  v: 1
}
```

### Success Response

```js
{
  ok: true,
  data: {
    count: 42
  }
}
```

### Failure Response

```js
{
  ok: false,
  error: {
    code: 'BAD_PAYLOAD',
    message: 'Missing required field "domain"'
  }
}
```
