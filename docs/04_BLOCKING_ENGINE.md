# 04 — Blocking Engine

## 1. Overview

Network filtering uses Manifest V3 `declarativeNetRequest` (DNR). The extension has a bundled static fallback ruleset and updateable dynamic rules:

| Layer                 | Source and limit                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `main_blocking_rules` | 116 baseline domain rules in the current generated artifact; Chrome static-rule limits are defined in `build/limits.js`.                     |
| Dynamic filter rules  | Up to 4,000 supported EasyList/EasyPrivacy rules. The updater reserves headroom under the browser's dynamic-rule quota for site-pause rules. |

No JavaScript executes in the network request path.

## 2. Filter Sources and License

Only EasyList and EasyPrivacy are downloaded. Their maintainers document dual licensing under GPL-3.0-or-later or CC-BY-SA-3.0-or-later and request attribution to the EasyList authors. Source URLs and license references are recorded in `lists/SOURCES.md`. The extension downloads list text to the device and compiles supported data locally; it does not redistribute raw lists or execute list contents.

## 3. Supported Conversion

`src/shared/filter-compiler.js` accepts URL-filter patterns that DNR can represent, supported resource types, first/third-party options, `$domain=` inclusions/exclusions, `$match-case`, `$important`, and `@@` allow exceptions. Allow exceptions receive higher priority than ordinary block rules; important block rules receive priority 3. The compiler deduplicates identical conditions, removes `$badfilter`-disabled entries, and bounds each source's contribution.

Unsupported modifiers (including redirects, scriptlets, removeparam, CSP/header modifications, and popup handling) are skipped. Cosmetic filter syntax is not converted into network rules. The compiler favors a correct supported subset over silently changing a rule's meaning; it is not a full Adblock Plus engine.

## 4. Build and Update Flow

`npm run build-rules` compiles the static seed domains. It reads only explicitly named `production-*.txt` files, never `lists/test-fixture.txt`. E2E tests install their own test-only dynamic rule in the temporary browser context.

`src/background/rule-updater.js` runs on extension install, the daily `FILTER_UPDATE` alarm, filter toggles, and manual update. It downloads enabled, fixed HTTPS sources with credentials omitted and redirects rejected; validates status, origin, size, list identity, and minimum supported-rule count; compiles in memory; then calls `updateDynamicRules` once with old managed IDs removed and new rules added. Chrome applies that update atomically. A failed fetch, validation, or DNR operation retains the preceding dynamic rules and the static fallback. No downloaded text is persisted or executed.

The source lists are tens of thousands of lines. DNR dynamic capacity means only a bounded subset is installed; the dashboard and docs do not claim complete conversion.

## 5. Site Pause and List Toggles

`src/background/rules-manager.js` adds higher-priority allow rules for paused domains. Those rules remain outside the updater's managed IDs. Disabling a filter list recompiles the remaining enabled sources; disabling both removes the downloaded dynamic rules while leaving the static fallback active. If an update fails, the dashboard reverts the toggle and keeps the existing rule set.

## 6. Statistics and Limits

The DNR feedback APIs are debugging diagnostics and are unavailable in normal packaged builds. When Chrome exposes `getMatchedRules()`, counts are sampled when statistics are requested and attributed to the page hostname; they are approximate and site-aggregated, not per-tab. The UI marks network counts unavailable when the API is unavailable or fails. Cosmetic and YouTube counts separately represent matched DOM elements hidden, not network requests or distinct advertisements.

The current parser intentionally skips unsupported ABP options. DNR rule quotas and browser-specific support can vary; Chrome remains the primary target. YouTube video ads are not blocked by design, and no code touches playback.
