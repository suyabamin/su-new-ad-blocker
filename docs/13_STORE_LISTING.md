# 13 — Store Listing

## 1. Extension Name

**SU New Ad Blocker**

## 2. Short Description (up to 132 characters)

Block ads and trackers, hide ad containers, reduce YouTube ad clutter. 100% local — no data collected.

## 3. Full Description

SU New Ad Blocker is a fast, privacy-first ad blocker for Chrome, Edge, and Brave. It uses Chrome's built-in declarativeNetRequest API to block ads and trackers before they load — without slowing down your browser.

**What it does:**

- Blocks ads and trackers on all websites using EasyList and EasyPrivacy filter lists
- Hides leftover ad containers that survive network blocking
- Reduces YouTube ad clutter: hides overlay ads, masthead banners, and promoted cards
- Shows a live block count in the toolbar popup
- Lets you whitelist sites you trust
- Displays full statistics and filter list status in the options dashboard

**Privacy:**

- No data leaves your device — ever
- No telemetry, no analytics, no account required
- All statistics are stored locally in your browser

**Open-source filter lists:**

- EasyList (GPL v3)
- EasyPrivacy (GPL v3)

## 4. Category

Productivity

## 5. Screenshots Required (1280×800 or 640×400)

| #   | Description                                        |
| --- | -------------------------------------------------- |
| 1   | Popup open on a news site showing block count      |
| 2   | Options dashboard showing statistics and whitelist |
| 3   | YouTube page with ad containers hidden             |
| 4   | Before/after comparison on a typical ad-heavy page |

## 6. Promotional Images

| Size                       | Required |
| -------------------------- | -------- |
| 440×280 (small promo tile) | Yes      |
| 920×680 (large promo tile) | Optional |
| 1400×560 (marquee banner)  | Optional |

## 7. Privacy Policy URL

Must be hosted at a stable URL before submission. Content should match `docs/12_PRIVACY_COMPLIANCE.md` section 5.

## 8. Single-Purpose Justification

This extension's single purpose is to block advertisements and trackers. It uses `declarativeNetRequest` (not `webRequest`) to enforce blocking rules, which is the Chrome-recommended approach for ad blockers in Manifest V3.
