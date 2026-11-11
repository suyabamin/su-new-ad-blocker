# 09 — Messaging Contract

All communication between extension components (popup, options, content scripts, service worker)
must use `chrome.runtime.sendMessage` / `chrome.runtime.onMessage` with a message object whose
`type` field is one of the constants defined in `src/shared/messages.js`.

---

## 1. Rules

- Every `type` value MUST come from `MSG` in `src/shared/messages.js`. No magic strings.
- Every message handler MUST return an explicit response object `{ ok: boolean, ... }`.
- Unknown message types MUST return `{ ok: false, error: 'unknown message type' }`.
- Handlers that perform async work MUST `return true` from `onMessage` to keep the channel open,
  then call `sendResponse` when resolved.
- No sensitive data (PII, auth tokens) may appear in any message payload.

---

## 2. Message Type Table

| Constant              | Value                   | Direction          | Description                                                |
| --------------------- | ----------------------- | ------------------ | ---------------------------------------------------------- |
| `GET_TAB_STATS`       | `GET_TAB_STATS`         | popup → background | Get block count for the active tab's hostname              |
| `GET_TODAY_SUMMARY`   | `GET_TODAY_SUMMARY`     | popup → background | Get total blocks for today (current calendar day)          |
| `GET_STATS_RANGE`     | `GET_STATS_RANGE`       | options → background | Get daily stats for a date range (payload: `{ from, to }`) |
| `GET_TOP_DOMAINS`     | `GET_TOP_DOMAINS`       | options → background | Get top N blocked domains (payload: `{ n }`)               |
| `TOGGLE_PAUSE_SITE`   | `TOGGLE_PAUSE_SITE`     | popup → background | Pause/resume blocking for the current site                 |
| `GET_COSMETIC_RULES`  | `GET_COSMETIC_RULES`    | content → background | Fetch cosmetic CSS rules for the current hostname          |
| `CS_BLOCKED_REPORT`   | `CS_BLOCKED_REPORT`     | content → background | Report a cosmetically-blocked element count                |
| `ALLOWLIST_ADD`       | `ALLOWLIST_ADD`         | options → background | Add a domain to the allowlist (payload: `{ domain }`)      |
| `ALLOWLIST_REMOVE`    | `ALLOWLIST_REMOVE`      | options → background | Remove a domain from the allowlist (payload: `{ domain }`) |
| `LIST_TOGGLE`         | `LIST_TOGGLE`           | options → background | Enable/disable a named filter list (payload: `{ listId, enabled }`) |
| `LIST_UPDATE_NOW`     | `LIST_UPDATE_NOW`       | options → background | Force an immediate filter list refresh                     |
| `CUSTOM_RULES_SET`    | `CUSTOM_RULES_SET`      | options → background | Replace custom DNR rules (payload: `{ rules }`)            |
| `STATS_EXPORT`        | `STATS_EXPORT`          | options → background | Export all stats as a JSON blob                            |
| `STATS_RESET`         | `STATS_RESET`           | options → background | Reset all statistics to zero                               |
| `SETTINGS_GET`        | `SETTINGS_GET`          | popup/options → background | Get the current settings object                      |
| `SETTINGS_SET`        | `SETTINGS_SET`          | popup/options → background | Update settings (payload: partial settings patch)    |

---

## 3. Response Envelope

Every handler returns a plain object:

```js
// Success
{ ok: true, data: <payload> }

// Failure
{ ok: false, error: '<human-readable reason>' }
```

---

## 4. Example

```js
// Sender (popup.js)
const response = await chrome.runtime.sendMessage({
  type: MSG.GET_TAB_STATS,
  hostname: location.hostname,
});
if (response.ok) {
  renderCount(response.data.count);
}

// Handler (service-worker.js)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MSG.GET_TAB_STATS) {
    getTabStats(message.hostname).then((data) => sendResponse({ ok: true, data }));
    return true; // keep channel open
  }
});
```
