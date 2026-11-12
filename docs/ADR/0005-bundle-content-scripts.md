# ADR-0005: Bundle Content Scripts with esbuild for MV3 Compatibility

**Status:** Accepted  
**Date:** 2026-11-12  
**Author:** Architectural Decision

## Context

In Chrome Manifest V3, content scripts execute in an isolated world as classic scripts. Chrome does not support native ES module syntax (`import` / `export`) in content scripts declared in `manifest.json`. Attempting to load an unbundled content script containing `import` statements results in an unrecoverable runtime error (`Uncaught SyntaxError: Cannot use import statement outside a module`).

The initial MVP architecture favored a "no bundler" approach to minimize build complexity. However, content scripts (`src/content/cosmetic.js` and `src/content/youtube/youtube.js`) must import selector lists and shared constants while remaining single, self-contained classic scripts when injected by the browser.

## Decision

Bundle content scripts using `esbuild` into IIFE (Immediately Invoked Function Expression) files in `dist/content/`:

1. `src/content/cosmetic.js` and `src/content/youtube/youtube.js` are bundled into IIFE format targeting `chrome120` with platform `browser`.
2. The background service worker stays an unbundled ES module (`"type": "module"` in `manifest.json`).
3. Popup and Options pages continue to load native ES modules via `<script type="module">` tags.
4. Static assets, rulesets, and non-content source directories (`src/background/`, `src/popup/`, `src/options/`, `src/assets/`, `rules/`, `icons/`) are copied to `dist/` unchanged.
5. This decision amends the MVP "no bundler" rule for content scripts only.

## Consequences

- Content scripts execute successfully in Chromium without `import`/`export` syntax errors.
- Content scripts can freely use modular ES imports during development and unit testing in Vitest.
- The build step is extremely fast (<50ms) and adds minimal tooling overhead.
- Service worker and extension pages retain their native ES module structure without unnecessary bundling.
