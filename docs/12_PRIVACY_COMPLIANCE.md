# 12 — Privacy Compliance

## 1. Data Handling

Settings, filter-list preferences, and statistics stay on-device in `chrome.storage.local`. The extension has no telemetry, analytics, account, or sync service. Downloaded filter-list text is compiled in memory and is not saved to storage.

## 2. Filter-List Network Requests

The only requests initiated by the extension are HTTPS GETs to the fixed EasyList and EasyPrivacy URLs in `lists/SOURCES.md`. They occur on extension install, the daily update alarm, a list toggle, or a manual update. Requests omit credentials and reject redirects. The extension sends no user identifier, extension data, page URL, or browsing history. Normal requests made by websites are handled by the browser and are not extension uploads.

## 3. Local Statistics

- Cosmetic and YouTube counts are reports of matched DOM elements hidden by local content scripts.
- Network-match counts rely on Chrome's DNR debugging feedback API and may be unavailable in packaged builds. The UI marks them unavailable instead of estimating them.
- Site diagnostic values are hostname aggregates, not per-tab values. The stored data does not contain complete page URLs or query strings.

See [`PRIVACY.md`](PRIVACY.md) for the complete storage-key inventory, export, and deletion instructions.

## 4. Permissions

`manifest.json` declares only `declarativeNetRequest`, `declarativeNetRequestFeedback`, `storage`, `alarms`, and `activeTab`, with `<all_urls>` host access. The extension does not request `tabs` or `scripting`; content scripts are declared in the manifest.

## 5. License Attribution

EasyList and EasyPrivacy are dual licensed under GPL-3.0-or-later and CC-BY-SA-3.0-or-later. The extension attributes the source to the EasyList authors and records the list URLs and license reference in `lists/SOURCES.md`.
