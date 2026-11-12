# 13 — Store Listing

## Extension name

**SU New Ad Blocker**

## Short description

Blocks supported ad and tracker requests, hides selected ad elements, and stores statistics locally.

## Full description

SU New Ad Blocker is a Manifest V3 extension for Chromium browsers. It uses the browser's declarativeNetRequest engine with a bundled fallback ruleset and supported rules compiled locally from EasyList and EasyPrivacy. Cosmetic selectors hide selected ad containers. The YouTube module hides selected ad interface elements without changing video or audio playback.

The popup provides a site pause control and local element counts. DNR network match diagnostics are shown only when Chrome exposes its debugging API; these counts are sampled and site-aggregated, not per-tab or guaranteed totals. The Options page manages filter lists, a domain allowlist, custom declarativeNetRequest rules, and local data export/reset.

### Known limitations

- The extension converts only a bounded subset of EasyList/EasyPrivacy syntax to DNR. Unsupported modifiers are skipped, and browser rule quotas limit the number installed.
- The bundled baseline is limited; broader rules are added after a valid list update. Failed updates leave the last working rules active.
- Cosmetic counts represent hidden DOM elements, not distinct advertisements or network requests.
- YouTube video ads are not blocked by design. The YouTube module only hides selected interface elements and does not manipulate playback.
- Network diagnostic counts may be unavailable in packaged builds because Chrome restricts DNR feedback APIs. The UI reports them as unavailable rather than estimating them.

### Privacy

Settings and statistics stay in `chrome.storage.local`. The extension downloads filter-list text only from the HTTPS URLs documented in [`lists/SOURCES.md`](../lists/SOURCES.md), sends no telemetry, and does not execute downloaded data. See [`docs/PRIVACY.md`](PRIVACY.md) for stored keys and data controls.

## Category

Productivity

## Screenshots

Prepare screenshots at 1280×800 or 640×400. Suggested views:

1. Popup showing the site pause control and separate network diagnostic/element counters.
2. Options page showing statistics and the allowlist.
3. A page where selected ad interface containers are hidden.

## Privacy policy URL

Publish `docs/PRIVACY.md` at a stable public URL and enter that URL in the store listing before submission.
