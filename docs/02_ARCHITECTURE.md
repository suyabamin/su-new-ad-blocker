# 02 — Architecture

## Runtime Components

| Context         | Files             | Responsibility                                                                   |
| --------------- | ----------------- | -------------------------------------------------------------------------------- |
| Service worker  | `src/background/` | Manages DNR rules, statistics, update alarms, messages, and the toolbar badge    |
| Content scripts | `src/content/`    | Applies generic cosmetic selectors and YouTube ad UI selectors                   |
| Popup           | `src/popup/`      | Shows the current site's and today's block counts and provides the pause control |
| Options         | `src/options/`    | Displays statistics, list settings, allowlist, custom rules, and data controls   |
| Shared          | `src/shared/`     | Defines message types, storage keys and defaults, settings, and logging          |

## Network Blocking

The build-time compiler in `scripts/build-rules.js` reads local `lists/*.txt` files and writes the DNR ruleset to `rules/declarative_net_request_rules.json`, cosmetic selectors to `rules/cosmetic.json`, and build counts to `build/report.json`. The browser enforces the registered static ruleset. `src/background/rules-manager.js` uses dynamic allow rules to pause blocking on domains.

The update alarm is managed by `src/background/rule-updater.js`. It records update metadata in local storage; it does not download or compile remote filter lists.

`src/background/stats-tracker.js` snapshots `getMatchedRules()` when popup statistics are requested, deduplicates matches, and attributes them to the page tab hostname. Cosmetic reports are categorized separately.

## Cosmetic Filtering

`src/content/cosmetic.js` applies selectors from `src/content/selectors.js` at document start, observes DOM changes, and batches reports to the service worker using the canonical message type in `src/shared/messages.js`.

## YouTube UI Filtering

`src/content/youtube/youtube.js` runs on `https://www.youtube.com/*` and uses selectors from `src/content/youtube/selectors.js` to hide ad UI containers. It does not access video or audio elements or playback APIs.

## Messages and Storage

Popup, options, and content scripts communicate with the service worker through message types declared in `src/shared/messages.js`. Shared state is stored in `chrome.storage.local` using keys from `src/shared/storage.js`; see `docs/10_STORAGE_SCHEMA.md` for the schema.

## Build Output

`npm run build-rules` compiles local filter inputs. `npm run build` bundles content scripts and assembles the unpacked extension in `dist/`. Runtime scripts and styles stay local, and the build copies the local Chart.js bundle into the options page. The extension uses Manifest V3 and the extension-page CSP declared in `manifest.json`; it does not execute remote code or send telemetry.
