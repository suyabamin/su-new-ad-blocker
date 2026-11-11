// YouTube cosmetic ad UI container selectors
// See docs/06_YOUTUBE_MODULE.md Section 2

export const YOUTUBE_SELECTORS = Object.freeze([
  '.ytp-ad-module',
  '.video-ads.ytp-ad-module',
  '.ytp-ad-overlay-container',
  '.ytp-ad-text-overlay',
  '.ytp-ad-image-overlay',
  '.ytp-ad-skip-button-container',
  '#masthead-ad',
  'ytd-banner-promo-renderer',
  'ytd-ad-slot-renderer',
  'ytd-in-feed-ad-layout-renderer',
  'ytd-promoted-sparkles-web-renderer',
  'ytd-display-ad-renderer',
  'ytd-action-companion-ad-renderer',
  'ytd-player-legacy-desktop-watch-ads-renderer',
  '#player-ads',
  '.ytd-promoted-video-renderer',
]);

// Explicit forbidden selectors from docs/06_YOUTUBE_MODULE.md Section 4
export const FORBIDDEN_YOUTUBE_SELECTORS = Object.freeze([
  'video',
  'audio',
  '.ytp-chrome-controls',
  '.ytp-progress-bar',
  '.ytp-time-display',
  '.ytp-volume-panel',
]);
