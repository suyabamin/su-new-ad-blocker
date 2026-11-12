# 02 — Architecture

## Runtime Components

| Context         | Files             | Responsibility                                                                            |
| --------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| Service worker  | `src/background/` | Manages DNR rules, local statistics, update alarms, messages, and the toolbar badge       |
| Content scripts | `src/content/`    | Hides configured generic cosmetic elements and selected YouTube ad UI elements            |
| Popup           | `src/popup/`      | Shows available diagnostic site matches, local element counts, and site pause control     |
| Options         | `src/options/`    | Shows local statistics and controls lists, allowlist, custom rules, and data export/reset |
| Shared          | `src/shared/`     | Defines messages, storage keys, settings, filter sources/compiler, and logging            |

## Network Blocking and Filter Updates

`scripts/build-rules.js` writes the static seed ruleset from its reviewed ad-domain baseline. It only reads files named `production-*.txt`; `lists/test-fixture.txt` is never included. Generated rules and counts are `rules/declarative_net_request_rules.json` and `build/report.json`.

At install, on the daily `FILTER_UPDATE` alarm, when a list is toggled, and on manual request, `src/background/rule-updater.js` downloads enabled EasyList/EasyPrivacy text over HTTPS. The endpoints are fixed in `src/shared/filter-lists.js`. `src/shared/filter-compiler.js` converts its supported network-filter subset into at most 4,000 dynamic rules, reserving dynamic-rule capacity for site-pause rules. Unsupported modifiers are skipped rather than guessed. DNR receives the new and old managed rules in one `updateDynamicRules` operation; failed downloads, validation, or DNR updates leave the prior dynamic rules intact. List text is never executed or persisted.

`src/background/rules-manager.js` adds higher-priority dynamic allow rules to pause blocking on domains. Static seed rules remain active as a fallback if list downloads fail.

## Statistics

`src/background/stats-tracker.js` records cosmetic and YouTube UI element counts from content-script reports. Network diagnostics are collected from `onRuleMatchedDebug`, which Chrome limits to unpacked extensions. Request IDs are deduplicated in `chrome.storage.session`; category totals are stored in `chrome.storage.local`. Site values are attributed to the request initiator hostname when available and are not per-tab counts. Packaged builds do not present network totals as measured when this diagnostic event is unavailable.

## Cosmetic and YouTube Filtering

`src/content/cosmetic.js` applies selectors from `src/content/selectors.js` and observes the body for later matching elements. It batches element counts through `CS_BLOCKED_REPORT`.

`src/content/youtube.js` runs on YouTube pages declared in `manifest.json` and uses `src/content/youtube/selectors.js` to hide selected ad UI containers in the document and discovered open shadow roots. It does not access video/audio elements or playback APIs; YouTube video ads remain unblocked by design.

## Messages and Storage

Popup, options, and content scripts use the message constants in `src/shared/messages.js`. Settings, list preferences, and statistics remain in `chrome.storage.local`; keys are defined in `src/shared/storage.js`. Statistics retain backward-compatible `stats:lifetime`, `stats:meta`, and daily buckets. Downloaded list text is held only in memory during validation and compilation.

## Build Output and Privacy

`npm run build-rules` compiles the static baseline; `npm run build` bundles content scripts and assembles `dist/`. Runtime JavaScript and styles are local. The service worker downloads only filter-list text from the fixed HTTPS sources, uses no credentials, and never executes remote data. The manifest remains MV3 with the existing permissions; the extension sends no telemetry.
