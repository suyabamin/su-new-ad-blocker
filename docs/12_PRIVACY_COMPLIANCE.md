# 12 — Privacy Compliance

## 1. Data Collection Policy

SU New Ad Blocker collects **no personal data**. All data remains on the user's device in `chrome.storage.local`.

## 2. Data Stored Locally

| Data                               | Purpose                                  | Leaves device? |
| ---------------------------------- | ---------------------------------------- | -------------- |
| Block counts (global + per-domain) | Show statistics in popup/options         | No             |
| Whitelist (domain list)            | Disable blocking on user-specified sites | No             |
| Filter list last-updated timestamp | Show staleness in options UI             | No             |
| Extension enabled/disabled state   | Remember user preference                 | No             |
| Settings (update interval)         | Configurable update schedule             | No             |

## 3. Network Requests

The only outbound network requests are:

- **Filter list downloads** — to URLs listed in `lists/SOURCES.md` (EasyList, EasyPrivacy CDN endpoints).
- These requests include no user identifier, no extension ID in the request body, and no cookies.
- These requests are made from the service worker, not from any page context.

## 4. Permissions Justification

| Permission                      | Data accessed                               | Why needed                                                |
| ------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| `declarativeNetRequest`         | No user data; rule engine only              | Block ads                                                 |
| `declarativeNetRequestFeedback` | Rule match metadata (URL, initiator domain) | Count blocked requests locally                            |
| `storage`                       | Extension's own `chrome.storage.local`      | Persist stats, settings                                   |
| `tabs`                          | Active tab URL (domain only)                | Show per-site count in popup                              |
| `scripting`                     | Ability to inject content scripts           | Whitelist: disable content scripts on whitelisted domains |
| `alarms`                        | Timing only                                 | Schedule filter list updates                              |
| `<all_urls>`                    | Applies rules to all URLs                   | DNR must match against all requests                       |

## 5. Privacy Policy (Store Listing Text)

> SU New Ad Blocker does not collect, transmit, or sell any personal data. All block statistics are stored locally on your device and are never sent anywhere. The only network requests made by this extension are downloads of open-source filter lists (EasyList, EasyPrivacy) to keep blocking rules up to date.

## 6. Chrome Web Store Single-Purpose Statement

> This extension blocks advertisements and trackers to give users a faster, cleaner browsing experience.

## 7. GDPR / CCPA Compliance

- No data is collected → no data subject rights requests apply.
- No cookies are set.
- No third-party SDKs are bundled.
