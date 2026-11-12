# 05 — Cosmetic Filtering

## 1. Overview

The generic content script hides selected ad-like DOM elements with a CSS style element and inline `display: none !important` fallback. It does not remove nodes or change their network requests.

## 2. Mechanism

- `src/content/cosmetic.js` runs at `document_start` on the manifest's `<all_urls>` content-script match.
- It builds CSS from `src/content/selectors.js` and appends a style element to `document.documentElement`.
- After the document body is available, a `MutationObserver` watches the body and descendants for new matches.
- The initial observer scan hides and reports already-present matches. Later matching nodes are hidden and counted when observed.
- Generic reports are batched through `CS_BLOCKED_REPORT` at no more than once every two seconds.

Counts represent elements hidden, not unique ads or blocked requests. Selector matches can include site UI that resembles advertising; selectors should remain conservative and have regression coverage.

## 3. CSS Behavior

The extension uses `display: none !important`. It does not create script tags, alter `src` or `href`, or execute remotely supplied selector text. The content script selectors are bundled with the extension.

## 4. Limits

The current runtime list updater compiles supported network filters only. It does not fetch or apply EasyList cosmetic filters. Generic selectors remain the local set in `src/content/selectors.js`; YouTube selectors are maintained separately in `src/content/youtube/selectors.js`.
