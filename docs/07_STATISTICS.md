# 07 — Statistics

## 1. Separate Counters

Statistics do not combine different kinds of events:

- **Network matches:** DNR rules observed through Chrome's feedback API. This is a diagnostic counter, not a reliable production total.
- **Cosmetic elements hidden:** DOM elements selected and hidden by the generic cosmetic content script.
- **YouTube ad UI elements hidden:** selected YouTube interface elements hidden by the cosmetic YouTube module. It does not mean a video advertisement was blocked.

All persisted statistics remain in `chrome.storage.local` and are backward-compatible with the existing `stats:lifetime`, `stats:meta`, and `stats:day:YYYY-MM-DD` objects.

## 2. Network Diagnostic Limits

`src/background/stats-tracker.js` samples `chrome.declarativeNetRequest.getMatchedRules()` when the popup or dashboard requests statistics. Chrome describes this feedback API as a debugging feature for unpacked extensions. It may be unavailable in packaged builds, and Chrome retains some matched-rule details for only a limited period. The extension therefore:

- reports network counts as unavailable when the API is absent or rejects;
- does not substitute cosmetic counts or estimates for network-blocked request counts;
- labels diagnostic counts as observed matches and does not present them as complete;
- attributes matches to a page hostname, so a site total is not an isolated browser-tab count;
- excludes known allow-rule IDs from blocked counts.

The popup displays the active site's hostname for the pause control. Its match count is a hostname aggregate where diagnostics work; it is not a per-tab count.

## 3. Cosmetic Counts

Content scripts send batched `CS_BLOCKED_REPORT` messages after hiding matched nodes. Existing elements are counted when observers start; later elements are counted as they are hidden. Counts are elements, not unique ads, network requests, or proof that an advertisement was blocked.

## 4. Storage and Compatibility

See `docs/10_STORAGE_SCHEMA.md` for storage shapes. New data is additive: existing totals, type breakdowns, top-domain maps, and daily buckets continue to load. Network values written by older versions remain stored but are hidden when Chrome does not expose diagnostics. Reset/export behavior continues to use the current canonical storage keys.

## 5. UI

- **Popup:** site-aggregated DNR diagnostic matches when supported; separate cosmetic and YouTube UI element counts; network values are marked unavailable otherwise.
- **Options dashboard:** lifetime/today diagnostic network matches when supported; separate hidden-element counts; top matched hostnames and the network chart are hidden when diagnostics are unavailable.
- **Charts:** plot stored network diagnostics only when the current browser session confirms the diagnostics API works.
