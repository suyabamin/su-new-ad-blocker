# 13 — Store Listing

## Extension name

**SU New Ad Blocker**

## Short description

Blocks requests matching bundled rules, hides selected ad containers, and stores blocking counts locally.

## Full description

SU New Ad Blocker is a Manifest V3 extension for Chromium browsers. It uses the browser's
declarativeNetRequest engine to block network requests that match its bundled rules. Cosmetic
selectors hide selected ad containers, and the YouTube module hides selected ad interface elements.

The popup shows current-site and daily counts. The Options page provides statistics, a domain
allowlist, filter-list settings, and custom declarativeNetRequest rules.

### Known limitations

- The bundled rules and selectors do not catch every advertisement or tracker.
- YouTube video ads are not blocked by design. The YouTube module only hides selected interface
  containers and does not manipulate video or audio playback.
- The current filter-list updater records local update metadata; it does not download filter lists.

### Privacy

Settings and blocking statistics are stored in `chrome.storage.local`. The extension does not send
stored settings or statistics to a server and does not include telemetry or analytics. See
[`docs/PRIVACY.md`](PRIVACY.md) for the data keys and current network behavior.

## Category

Productivity

## Screenshots

Prepare screenshots at 1280×800 or 640×400. Suggested views:

1. Popup showing current-site and daily counts.
2. Options page showing statistics and the allowlist.
3. A page where selected ad interface containers are hidden.

## Privacy policy URL

Publish `docs/PRIVACY.md` at a stable public URL and enter that URL in the store listing before
submission.
