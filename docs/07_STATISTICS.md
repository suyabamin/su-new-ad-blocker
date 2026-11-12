# 07 — Statistics

## 1. Separate Counters

Statistics do not combine different kinds of events:

- **Network matches:** DNR rules observed through Chrome's feedback API. This is a diagnostic counter, not a reliable production total.
- **Cosmetic elements hidden:** DOM elements selected and hidden by the generic cosmetic content script.
- **YouTube ad UI elements hidden:** selected YouTube interface elements hidden by the cosmetic YouTube module. It does not mean a video advertisement was blocked.

Category totals and daily buckets remain in `chrome.storage.local` and are backward-compatible with the existing `stats:lifetime`, `stats:meta`, and `stats:day:YYYY-MM-DD` objects. A bounded set of DNR request IDs is held in `chrome.storage.session` to prevent recounting when the service worker restarts during a browser session.

## 2. Network Diagnostic Limits

`src/background/stats-tracker.js` listens to `chrome.declarativeNetRequest.onRuleMatchedDebug`. Chrome documents this feedback API as available only to unpacked extensions. The old `getMatchedRules()` polling approach was incomplete because it depended on UI polling and could miss events while the service worker slept. The extension therefore:

- reports network counts as unavailable until the debug event produces a match in the current session;
- does not substitute cosmetic counts or estimates for network-blocked request counts;
- labels diagnostic counts as observed matches and does not present them as complete;
- attributes matches to the request initiator hostname when supplied; unattributed matches count globally but are not assigned to a site;
- excludes known allow-rule IDs from blocked counts.

The popup displays the active site's hostname for the pause control. Its match count is a hostname aggregate where diagnostics work; it is not a per-tab count. DNR event feedback is diagnostic and does not provide a complete production counter.

## 3. Cosmetic Counts

Content scripts send batched `CS_BLOCKED_REPORT` messages after hiding matched nodes. The background validates positive integer counts and waits for the local storage flush before acknowledging the report. Existing elements are counted when observers start; later elements are counted as they are hidden. Counts are elements, not unique ads, network requests, or proof that an advertisement was blocked.

## 4. Storage and Compatibility

See `docs/10_STORAGE_SCHEMA.md` for storage shapes. New data is additive: existing totals, type breakdowns, top-domain maps, and daily buckets continue to load. Network values written by older versions remain stored but are hidden when Chrome does not expose diagnostics. Reset/export behavior continues to use the current canonical storage keys.

## 5. UI

- **Popup:** site-aggregated DNR diagnostic matches when supported; separate cosmetic and YouTube UI element counts; network values are marked unavailable otherwise.
- **Options dashboard:** lifetime/today diagnostic network matches when supported; separate hidden-element counts; top matched hostnames and the network chart are hidden when diagnostics are unavailable. A failed range request is shown as unavailable instead of a fabricated zero-filled chart.
- **Charts:** plot stored network diagnostics only when the current browser session confirms the diagnostics API works.
