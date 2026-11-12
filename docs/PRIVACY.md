# Privacy Policy

**Last updated: 2026-11-13**

SU New Ad Blocker stores its settings and blocking statistics in the browser's
`chrome.storage.local`. It does not send these values, page URLs, or browsing history to a
server. The extension has no telemetry or analytics service.

## Data stored

| Storage key            | Data                                                         |
| ---------------------- | ------------------------------------------------------------ |
| `schemaVersion`        | Local storage schema version                                 |
| `settings`             | Blocking, display, and language preferences                  |
| `lists`                | Filter list identifiers and enabled state or update metadata |
| `allowlist`            | Domains where the user paused blocking                       |
| `customRules`          | User-authored declarativeNetRequest rules                    |
| `stats:lifetime`       | Lifetime totals by blocking type                             |
| `stats:meta`           | Local reset and rule-update timestamps                       |
| `stats:day:YYYY-MM-DD` | Daily totals, types, lists, and domain counts                |
| `cache:lists:<listId>` | Reserved per-list cache key pattern                          |

Network match statistics retain hostnames and counts, not complete page URLs or query strings.

## Network activity

The extension does not transmit stored settings or statistics. Its current rule updater does not
download filter lists; the Update Now control records local update metadata. The build-time rule
compiler reads local filter files. If filter list downloads are added, their permitted sources are
the URLs recorded in [`lists/SOURCES.md`](../lists/SOURCES.md). Normal requests made by websites
while you browse are handled by the browser and are not uploads of extension data.

## Exporting and deleting data

Open the extension's Options page and use **Export Stats (JSON)** in **Statistics & Data** to save
a JSON file containing the values currently stored by the extension. **Reset All Statistics**
clears statistics after confirmation; it does not clear your settings, allowlist, or custom rules.
To remove all extension data, uninstall SU New Ad Blocker from the browser's extensions page.

## Contact

Privacy questions: [your email]
