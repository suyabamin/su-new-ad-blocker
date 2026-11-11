# 05 — Cosmetic Filtering

## 1. Overview

Cosmetic filtering hides ad containers that survive network blocking (empty `<div>` wrappers, ad placeholders, sponsored content sections). It works by injecting a single `<style>` tag with `display: none !important` rules.

## 2. Mechanism

### 2.1 Injection Strategy

- `src/content/cosmetic.js` runs at `document_start` on all pages (`<all_urls>`).
- It immediately creates a `<style>` element, sets its `textContent` to the CSS built from `src/content/selectors.js`, and appends it to `document.documentElement` (before `<head>` exists).
- A `MutationObserver` on `document.documentElement` (subtree, childList) watches for newly added nodes and checks whether any match the selector list; if so, it hides them by adding an inline `style="display:none!important"` attribute as a fallback for dynamically injected ad containers that CSS specificity cannot guarantee will be hidden.

### 2.2 CSS Approach

```css
/* Example generated CSS */
.ad-container,
#ad-banner,
[id^='google_ads_'],
[class*='sponsored-'],
ins.adsbygoogle {
  display: none !important;
}
```

- All selectors from `selectors.js` are joined into a single CSS rule to minimize reflow.
- Only `display: none !important` is used. No `visibility: hidden` (leaves layout space) or `height: 0` (can break flexbox/grid parents).

### 2.3 No Inline Scripts

- The content script file is loaded by Chrome's extension infrastructure — it is not injected via `innerHTML` or `document.write`.
- The injected `<style>` tag is CSS only. No `<script>` tags are created.
- CSP of the host page does not affect content script execution.

## 3. Selector List (`src/content/selectors.js`)

```js
// src/content/selectors.js
export const GENERIC_SELECTORS = [
  '.ad-container',
  '.ad-wrapper',
  '.ad-banner',
  '#ad-banner',
  '#ad-container',
  '[id^="google_ads_"]',
  '[id^="div-gpt-ad"]',
  'ins.adsbygoogle',
  '.adsbygoogle',
  '[class*="sponsored-ad"]',
  '[data-ad-unit]',
  '.dfp-ad',
  '.ad-slot',
  // … extended list added in T2.1
];
```

## 4. Performance Considerations

- The `<style>` injection happens synchronously at `document_start` — before any DOM content renders — so no layout shift occurs.
- The `MutationObserver` callback is debounced with a 50 ms idle check to avoid running on every individual DOM mutation during heavy page loads.
- The observer disconnects itself if the page is a known extension page (e.g., `chrome-extension://`).

## 5. What Cosmetic Filtering Does NOT Do

- Does not modify `src`, `href`, or any attribute of elements (only `display`).
- Does not remove elements from the DOM (to avoid breaking page scripts that reference them).
- Does not apply to YouTube-specific ad UI — that is handled by `youtube.js` (see docs/06).
- Does not interact with the network layer.

## 6. Selector Maintenance

- All generic selectors live in `src/content/selectors.js` only.
- If a selector breaks (false positive hiding legitimate content), remove it from that file and add a regression test in `tests/unit/cosmetic.test.js`.
- YouTube-specific selectors live in `src/content/youtube-selectors.js` only (see docs/06).
