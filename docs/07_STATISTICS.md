# 07 — Statistics

## 1. Separate Counters

Statistics do not combine different kinds of events:

- **Network matches:** DNR rules observed through Chrome's feedback API. This is a diagnostic counter, not a reliable production total.
- **Cosmetic elements hidden:** DOM elements selected and hidden by the generic cosmetic content script.
- **YouTube selector matches:** unique elements matching the bundled YouTube cosmetic selectors. A match can be an ad candidate, not proof of an advertisement.
- **YouTube ad UI elements hidden:** unique matched elements that this module successfully hid. It does not mean a video advertisement or a network request was blocked.
- **YouTube detected but not hidden:** selector matches minus successful hides, shown separately as a derived UI value. It is clamped at zero for older/inconsistent stored data.

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

Content scripts send batched `CS_BLOCKED_REPORT` messages for unique YouTube selector matches and unique successful hides. The background validates positive integer counts and accepts only the cosmetic categories from content scripts. It waits for the local storage flush before acknowledging a report. Existing elements are counted during the initial scan; later elements are counted as they are detected/hidden. Counts are DOM elements, not unique advertisements, network requests, or proof that an advertisement was blocked. WeakSet-based deduplication lasts for the document lifetime.

Stats summary reads, exports, and content-script reports wait for persisted statistics initialization. If storage cannot be read, the background returns an error and the popup/dashboard retain an unavailable placeholder instead of displaying default in-memory zeros or overwriting stored totals.

## 4. Storage and Compatibility

See `docs/10_STORAGE_SCHEMA.md` for storage shapes. New data is additive: existing totals, type breakdowns, top-domain maps, and daily buckets continue to load. Network values written by older versions remain stored but are hidden when Chrome does not expose diagnostics. Reset/export behavior continues to use the current canonical storage keys.

## 5. UI

- **Popup:** site-aggregated DNR diagnostic matches when supported; separate cosmetic, YouTube hidden, YouTube detected, and derived detected-but-not-hidden counts; network values are marked unavailable otherwise.
- **Options dashboard:** lifetime/today diagnostic network matches when supported; separate cosmetic, YouTube hidden, and YouTube detected counts, plus a derived detected-but-not-hidden count. Top matched hostnames and the network chart are hidden when diagnostics are unavailable. A failed range request is shown as unavailable instead of a fabricated zero-filled chart.
- **Charts:** plot stored network diagnostics only when the current browser session confirms the diagnostics API works.
