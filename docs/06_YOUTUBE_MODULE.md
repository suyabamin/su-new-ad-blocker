# 06 — YouTube Module

## 1. Scope and Hard Limits

The YouTube module hides **ad UI containers** only. It does **not**:

- Touch the `<video>` or `<audio>` element in any way
- Skip, fast-forward, pause, play, or mute ad playback
- Click the "Skip Ad" button or simulate any user interaction
- Modify the video player's JavaScript state or internal APIs
- Remove ad-related network requests (that is the DNR engine's job)

If a future task seems to require any of the above, **stop and report the conflict** — do not implement a workaround.

## 2. Target UI Containers

The following YouTube ad UI containers are targeted for CSS hiding:

| Selector                                       | Description                                        |
| ---------------------------------------------- | -------------------------------------------------- |
| `.ytp-ad-module`                               | Main ad module in the player                       |
| `.video-ads.ytp-ad-module`                     | Video ad overlay wrapper                           |
| `.ytp-ad-overlay-container`                    | Overlay ad container                               |
| `.ytp-ad-text-overlay`                         | Text overlay ad                                    |
| `.ytp-ad-image-overlay`                        | Image overlay ad                                   |
| `.ytp-ad-skip-button-container`                | Skip button (hides the skip UI; does not click it) |
| `#masthead-ad`                                 | Top banner ad in the masthead                      |
| `ytd-banner-promo-renderer`                    | Promotional banner renderer                        |
| `ytd-ad-slot-renderer`                         | Ad slot in recommendations/home                    |
| `ytd-in-feed-ad-layout-renderer`               | In-feed promoted video                             |
| `ytd-promoted-sparkles-web-renderer`           | Promoted sparkles renderer                         |
| `ytd-display-ad-renderer`                      | Display ad renderer                                |
| `ytd-action-companion-ad-renderer`             | Companion ad renderer                              |
| `ytd-player-legacy-desktop-watch-ads-renderer` | Legacy player ad                                   |
| `#player-ads`                                  | Player ad container div                            |
| `.ytd-promoted-video-renderer`                 | Promoted video in search results                   |

All selectors live in `src/content/youtube/selectors.js`. Do not embed selectors in `youtube.js` directly.

## 3. Implementation (`src/content/youtube.js`)

- Runs at `document_idle` on `*://*.youtube.com/*` only.
- Injects a `<style>` tag with CSS built from `src/content/youtube/selectors.js`.
- Installs a `MutationObserver` on the body and discovered open shadow roots. It watches child insertion and `class`/`style` changes, and hides matching containers inserted later.
- Re-applies the cosmetic scan after `yt-navigate-finish`, `yt-page-data-updated`, and `popstate` events.
- Open shadow roots are scanned and receive their own local style element. Closed shadow roots cannot be inspected by a content script.

## 4. What Must Never Be Selected

The following are **forbidden targets** — these must never appear in `youtube-selectors.js`:

- `video` — the video element
- `audio` — the audio element
- `.ytp-chrome-controls` — playback controls
- `.ytp-progress-bar` — seek bar
- `.ytp-time-display` — time display
- `.ytp-volume-panel` — volume control
- Any element that is part of normal video playback UI

## 5. Selector Maintenance

- If a YouTube UI update breaks a selector (false negative — ad still visible), add or update the selector in `youtube-selectors.js` and add a regression test.
- If a selector causes a false positive (hides legitimate content), remove it and add a regression test.
- Changes to selectors do not require an ADR, only a CHANGELOG entry.

## 6. Testing

- Unit tests use JSDOM with a mocked YouTube page DOM. This does not verify current selectors against the live YouTube site; that requires a real browser session with network access.
- Each selector in `youtube-selectors.js` must have a test proving it hides the target element.
- Each forbidden selector must have a test proving it is not present in `youtube-selectors.js`.
- See `docs/11_TESTING.md` for test setup.
