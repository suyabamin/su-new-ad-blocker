# Privacy Policy

**Last updated: 2026-11-13**

SU New Ad Blocker stores its settings and statistics locally in `chrome.storage.local`. It has no telemetry, analytics, account, or sync service. The extension does not send settings, statistics, page URLs, or browsing history to a server.

## Data stored on this device

| Storage key            | Data                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| `settings`             | Blocking, display, and language preferences                                |
| `lists`                | Enabled/disabled preference for EasyList and EasyPrivacy                   |
| `allowlist`            | Domains where the user paused blocking                                     |
| `customRules`          | User-authored DNR rules                                                    |
| `stats:lifetime`       | Lifetime totals by network, cosmetic, and YouTube UI category              |
| `stats:meta`           | Reset and filter-update timestamps and update summary metadata             |
| `stats:day:YYYY-MM-DD` | Daily category totals, list attribution, and up to 50 attributed hostnames |

The extension does not store full page URLs or query strings in its statistics. Cosmetic and YouTube totals count DOM elements hidden. Network match diagnostics may be unavailable in packaged builds; the UI reports that state instead of substituting estimates. Site values, when available, are hostname aggregates and not per-tab counts. Up to 2,000 recent DNR request IDs are temporarily held in `chrome.storage.session` to avoid recounting after a service-worker restart; this session data clears when the browser session ends.

## Network activity

The extension downloads filter-list text only from the fixed HTTPS EasyList and EasyPrivacy URLs recorded in [`lists/SOURCES.md`](../lists/SOURCES.md). Downloads occur when the extension is installed, on its daily update alarm, when a list is toggled, or when the user selects **Update Now**. Requests omit credentials and reject redirects. No account data, browsing data, or extension statistics are sent. Downloaded text is validated and compiled in memory, not stored or executed.

The extension never runs remotely downloaded code. It does not send telemetry or analytics. The filter lists are dual licensed under GPL-3.0-or-later or CC-BY-SA-3.0-or-later; attribution and license references are recorded in `lists/SOURCES.md`.

## Exporting and deleting data

Open the extension's Options page and select **Export Stats (JSON)** under **Statistics & Data** to save the locally stored data. **Reset All Statistics** clears statistics after confirmation; it does not clear settings, list preferences, the allowlist, or custom rules. To remove all extension data, uninstall SU New Ad Blocker from the browser's extensions page.

## Contact

Privacy questions: [your email]
