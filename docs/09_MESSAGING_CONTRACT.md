# 09 — Messaging Contract

All `chrome.runtime` messages must use types defined in `src/shared/messages.js`. No magic strings anywhere in the codebase.

## 1. Message Format

```js
// Request (sent by popup / options)
{ type: MSG.<TYPE>, payload: { /* type-specific */ } }

// Response (returned by service worker)
{ ok: true, data: { /* type-specific */ } }
// or
{ ok: false, error: 'reason string' }
```

## 2. Message Types

| Constant (`MSG.*`)       | Direction | Payload                           | Response data                                       |
| ------------------------ | --------- | --------------------------------- | --------------------------------------------------- |
| `GET_GLOBAL_STATS`       | UI → SW   | `{}`                              | `{ global: number, lastReset: number }`             |
| `GET_DOMAIN_STATS`       | UI → SW   | `{ domain: string }`              | `{ domain: string, count: number }`                 |
| `GET_TOP_DOMAINS`        | UI → SW   | `{ limit?: number }` (default 10) | `{ domains: Array<{domain:string, count:number}> }` |
| `RESET_STATS`            | UI → SW   | `{}`                              | `{ ok: true }`                                      |
| `SET_ENABLED`            | UI → SW   | `{ enabled: boolean }`            | `{ ok: true }`                                      |
| `GET_ENABLED`            | UI → SW   | `{}`                              | `{ enabled: boolean }`                              |
| `ADD_WHITELIST_ENTRY`    | UI → SW   | `{ domain: string }`              | `{ ok: true }`                                      |
| `REMOVE_WHITELIST_ENTRY` | UI → SW   | `{ domain: string }`              | `{ ok: true }`                                      |
| `GET_WHITELIST`          | UI → SW   | `{}`                              | `{ domains: string[] }`                             |
| `TRIGGER_FILTER_UPDATE`  | UI → SW   | `{}`                              | `{ ok: true }`                                      |
| `GET_FILTER_STATUS`      | UI → SW   | `{}`                              | `{ lastUpdated: number \| null }`                   |

## 3. `src/shared/messages.js` (canonical definition)

```js
// src/shared/messages.js
export const MSG = Object.freeze({
  GET_GLOBAL_STATS: 'GET_GLOBAL_STATS',
  GET_DOMAIN_STATS: 'GET_DOMAIN_STATS',
  GET_TOP_DOMAINS: 'GET_TOP_DOMAINS',
  RESET_STATS: 'RESET_STATS',
  SET_ENABLED: 'SET_ENABLED',
  GET_ENABLED: 'GET_ENABLED',
  ADD_WHITELIST_ENTRY: 'ADD_WHITELIST_ENTRY',
  REMOVE_WHITELIST_ENTRY: 'REMOVE_WHITELIST_ENTRY',
  GET_WHITELIST: 'GET_WHITELIST',
  TRIGGER_FILTER_UPDATE: 'TRIGGER_FILTER_UPDATE',
  GET_FILTER_STATUS: 'GET_FILTER_STATUS',
});
```

## 4. Error Handling

- If the service worker receives an unknown `type`, it responds with `{ ok: false, error: 'unknown message type' }`.
- If a payload is malformed, it responds with `{ ok: false, error: 'invalid payload: <reason>' }`.
- UI code must check `response.ok` before reading `response.data`.

## 5. Adding a New Message Type

1. Add the constant to `MSG` in `src/shared/messages.js`.
2. Add a handler in the appropriate service worker module.
3. Update this document.
4. Write a unit test for the new handler.
