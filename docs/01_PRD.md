# 01 — Product Requirements Document

## 1. Product Overview

**SU New Ad Blocker** is a Manifest V3 browser extension for Chromium-based browsers (Chrome ≥ 109, Edge ≥ 109, Brave ≥ 1.50). It blocks advertisement and tracker network requests using `declarativeNetRequest`, hides residual ad containers through CSS cosmetic filtering, reduces YouTube ad UI clutter without touching playback, and surfaces local block statistics through a popup and an options dashboard.

## 2. Goals

| ID  | Goal                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------- |
| G1  | Block ad and tracker network requests using `declarativeNetRequest` (static + dynamic rulesets)                         |
| G2  | Hide leftover ad containers with CSS cosmetic filtering (injected `<style>` tag, `display:none !important`)             |
| G3  | Reduce YouTube ad UI clutter — overlay ads, masthead ads, promoted cards — without manipulating video or audio playback |
| G4  | Show separately categorized local statistics; expose DNR network diagnostics only when Chrome provides them             |
| G5  | Provide an options dashboard: whitelist management, filter list status, global statistics, stats reset                  |
| G6  | All data stays on-device; nothing is transmitted except filter list downloads from approved URLs                        |

## 3. Non-Goals (MVP)

- No Firefox or Safari support
- No remote code execution at runtime (no eval, no dynamic imports from remote URLs)
- No telemetry, analytics, or crash reporting
- No manipulation of video/audio playback: no skipping, fast-forwarding, muting, or touching the `<video>` or `<audio>` element
- No subscription, account, or sync system
- No parental controls or safe-browsing features

## 4. User Stories

| ID   | As a …     | I want to …                                       | So that …                           |
| ---- | ---------- | ------------------------------------------------- | ----------------------------------- |
| US-1 | User       | Have ads blocked automatically on all websites    | I don't see ads while browsing      |
| US-2 | User       | See how many ads were blocked on the current site | I know the extension is working     |
| US-3 | User       | Whitelist a specific site                         | Sites I trust load normally         |
| US-4 | User       | Browse YouTube without ad overlay banners         | My viewing experience is cleaner    |
| US-5 | User       | Know when filter lists were last updated          | I can trust the lists are current   |
| US-6 | Power user | View and reset global block statistics            | I can track extension effectiveness |

## 5. Filter Lists (MVP)

| List        | URL                                          | License                                   | Update Frequency |
| ----------- | -------------------------------------------- | ----------------------------------------- | ---------------- |
| EasyList    | https://easylist.to/easylist/easylist.txt    | GPL-3.0-or-later or CC-BY-SA-3.0-or-later | Daily            |
| EasyPrivacy | https://easylist.to/easylist/easyprivacy.txt | GPL-3.0-or-later or CC-BY-SA-3.0-or-later | Daily            |

All sources and license references are recorded in `lists/SOURCES.md`. The build bundles a limited static baseline. The extension fetches list text over HTTPS and compiles a bounded supported subset into dynamic DNR rules on install, on a 24-hour alarm, when list settings change, and on manual update. Unsupported syntax is skipped, and update failure preserves the last working dynamic rules.

## 6. Browsers Supported

- Google Chrome ≥ 109
- Microsoft Edge ≥ 109
- Brave ≥ 1.50

## 7. Product-Level Acceptance Criteria

| ID    | Criterion                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------- |
| AC-P1 | Extension loads without console errors on the test pages defined in `docs/11_TESTING.md`                            |
| AC-P2 | Each explicit DNR blocking smoke-test URL is verified in Playwright; no broader list-coverage percentage is claimed |
| AC-P3 | YouTube ad overlay containers are hidden within 500 ms of appearing                                                 |
| AC-P4 | Popup loads and displays block count within 200 ms of opening                                                       |
| AC-P5 | No network requests leave the device except to filter list update URLs listed in `lists/SOURCES.md`                 |
| AC-P6 | `chrome.storage.local` footprint stays under 5 MB after 30 days of simulated use                                    |

## 8. Constraints and Limits

- MV3 service workers are non-persistent; settings and statistics live in `chrome.storage.local`. Bounded request IDs used for DNR event deduplication live in `chrome.storage.session` for the browser session.
- `declarativeNetRequest` static ruleset limit: 30,000 rules per extension.
- Dynamic rule limit: 5,000 rules (Chrome 112+).
- CSP prohibits inline scripts in extension pages (`script-src 'self'`).
- Icons and all assets must be bundled locally (no CDN references).
