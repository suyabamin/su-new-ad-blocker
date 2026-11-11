# SU New Ad Blocker

A Manifest V3 browser extension that blocks ads and trackers on websites and YouTube, and shows live statistics about what was blocked.

## Features

- Network-level blocking via declarativeNetRequest
- Cosmetic filtering (hides ad containers on pages)
- YouTube module for ad-related UI cleanup
- Per-site pause and allowlist
- Popup with today's blocked count
- Options dashboard with charts, top domains, and history
- Local-only data: nothing leaves your device

## Requirements

- Node.js 20 or newer
- Chrome, Edge, or Brave (latest stable)

## Setup

    npm install
    npm run build          # compiles filter lists to DNR rulesets
    npm test
    npm run dev            # builds and watches for changes

> **Note on test setup:** On machines where drive C: has low disk space, see "Local setup" in `docs/11_TESTING.md` to configure `PLAYWRIGHT_BROWSERS_PATH` on an alternate drive before installing Playwright browsers.

## Load the extension locally

1. Open chrome://extensions
2. Enable Developer mode
3. Click "Load unpacked" and select the dist/ folder

## Project layout

See docs/02_ARCHITECTURE.md.

## Filter lists

Sources and licenses are listed in lists/SOURCES.md.

## Contributing

Read AGENTS.md before making changes.

## License

Choose a license before publishing (for example MIT). Filter lists keep their own licenses.
