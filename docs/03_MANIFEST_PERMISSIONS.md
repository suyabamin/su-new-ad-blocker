# 03 — Manifest Permissions

This document is the authoritative list of permissions the extension may request. Any addition requires a new ADR in `docs/ADR/`.

## Declared Permissions

The following list matches `manifest.json` exactly:

| Permission                      | Reason                                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `declarativeNetRequest`         | Enforces the registered static blocking ruleset                                                                |
| `declarativeNetRequestFeedback` | Enables DNR match diagnostics where Chrome exposes its unpacked/debug API; not relied on for packaged blocking |
| `storage`                       | Persists settings and local statistics in `chrome.storage.local`                                               |
| `alarms`                        | Schedules maintenance and filter-list update checks                                                            |
| `activeTab`                     | Lets the popup inspect the current tab after user interaction                                                  |

## Host Permissions

| Permission   | Reason                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `<all_urls>` | Allows the declared content scripts on supported pages and provides host access for the fixed HTTPS filter-list downloads |

## manifest.json excerpt

```json
{
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestFeedback",
    "storage",
    "alarms",
    "activeTab"
  ],
  "host_permissions": ["<all_urls>"]
}
```

## Permissions NOT Requested

The following permissions are explicitly **not** requested:

- `webRequest` / `webRequestBlocking` — forbidden by MV3; use DNR instead
- `nativeMessaging` — not needed
- `identity` — no account system
- `history` — not needed
- `bookmarks` — not needed
- `downloads` — not needed
- `geolocation` — not needed
- `notifications` — not needed (future ADR if needed)

## Adding a New Permission

1. Create `docs/ADR/NNNN-add-<permission>-permission.md` documenting why it is needed and what alternatives were considered.
2. Add the permission to `manifest.json`.
3. Update this file.
4. Update `docs/12_PRIVACY_COMPLIANCE.md` if the permission affects data handling.
