# 03 — Manifest Permissions

This document is the authoritative list of permissions the extension may request. Any addition requires a new ADR in `docs/ADR/`.

## Declared Permissions

| Permission                      | Reason                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `declarativeNetRequest`         | Required to register and enforce DNR blocking rules                                                       |
| `declarativeNetRequestFeedback` | Required for `onRuleMatchedDebug` to count blocked requests for statistics                                |
| `storage`                       | Required to persist stats, whitelist, and settings in `chrome.storage.local`                              |
| `tabs`                          | Required to read the current tab's URL in the popup (to show per-domain stats)                            |
| `scripting`                     | Required to inject content scripts programmatically if whitelist logic demands disabling them on a domain |
| `alarms`                        | Required to schedule periodic filter list updates (24-hour interval)                                      |

## Host Permissions

| Permission   | Reason                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `<all_urls>` | Required for `declarativeNetRequest` to match rules against all network requests and for content scripts to run on all pages |

## manifest.json excerpt

```json
{
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestFeedback",
    "storage",
    "tabs",
    "scripting",
    "alarms"
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
