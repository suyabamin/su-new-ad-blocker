// src/content/youtube.js
// YouTube Cosmetic Content Script: hides ad UI containers only.
// NEVER manipulates video/audio playback, never skips/mutes, never clicks buttons.
// See docs/06_YOUTUBE_MODULE.md and docs/15_TASK_PLAN.md T5.1, T5.2, T5.3

import { YOUTUBE_SELECTORS } from './youtube/selectors.js';
import { MSG } from '../shared/messages.js';

export const YT_STYLE_ELEMENT_ID = 'su-ad-blocker-youtube-styles';
export const YT_REPORT_INTERVAL_MS = 2000;

let pendingYtReportCount = 0;
let ytReportTimer = null;

/**
 * Resets reporting queue state (for unit testing).
 */
export function _resetYtReportQueue() {
  if (ytReportTimer !== null) {
    clearTimeout(ytReportTimer);
    ytReportTimer = null;
  }
  pendingYtReportCount = 0;
}

/**
 * Batches YouTube ad container block counts and dispatches CS_BLOCKED_REPORT.
 * @param {number} count
 */
export function queueYouTubeBlockedReport(count) {
  if (!Number.isSafeInteger(count) || count <= 0) {
    return;
  }
  pendingYtReportCount += count;

  if (ytReportTimer !== null) {
    return;
  }

  ytReportTimer = setTimeout(() => {
    ytReportTimer = null;
    const toReport = pendingYtReportCount;
    pendingYtReportCount = 0;

    const rt = globalThis.chrome?.runtime;
    if (toReport > 0 && rt?.sendMessage) {
      rt.sendMessage({
        type: MSG.CS_BLOCKED_REPORT,
        payload: {
          count: toReport,
          type: 'youtube',
          hostname: 'youtube.com',
        },
      });
    }
  }, YT_REPORT_INTERVAL_MS);
}

/**
 * Detects the YouTube page type from a URL or pathname (T5.1).
 * @param {string} [urlOrPath]
 * @returns {'watch' | 'search' | 'channel' | 'home' | 'other'}
 */
export function detectPageType(urlOrPath) {
  if (urlOrPath === null) {
    return 'other';
  }
  const path =
    urlOrPath !== undefined
      ? urlOrPath
      : typeof window !== 'undefined'
        ? window.location?.pathname
        : '';
  if (typeof path !== 'string') {
    return 'other';
  }

  if (path.includes('/watch')) {
    return 'watch';
  }
  if (path.includes('/results')) {
    return 'search';
  }
  if (path.startsWith('/channel/') || path.startsWith('/c/') || path.startsWith('/@')) {
    return 'channel';
  }
  if (path === '/' || path === '') {
    return 'home';
  }
  return 'other';
}

/**
 * Builds CSS stylesheet string applying display:none !important to YouTube ad containers.
 * @param {string[]} selectors
 * @returns {string}
 */
export function buildYouTubeCss(selectors = YOUTUBE_SELECTORS) {
  if (!selectors || selectors.length === 0) {
    return '';
  }
  return selectors.map((sel) => `${sel} { display: none !important; }`).join('\n');
}

/**
 * Injects a <style> element with YouTube ad hiding CSS.
 * @param {Document} doc
 * @param {string[]} selectors
 * @returns {HTMLStyleElement|null}
 */
export function injectYouTubeStyles(doc = document, selectors = YOUTUBE_SELECTORS) {
  if (!doc || !doc.documentElement) {
    return null;
  }

  let styleEl = doc.getElementById(YT_STYLE_ELEMENT_ID);
  if (styleEl) {
    return styleEl;
  }

  styleEl = doc.createElement('style');
  styleEl.id = YT_STYLE_ELEMENT_ID;
  styleEl.textContent = buildYouTubeCss(selectors);

  doc.documentElement.appendChild(styleEl);
  return styleEl;
}

function injectShadowStyles(shadowRoot, selectors) {
  if (!shadowRoot || shadowRoot.getElementById?.(YT_STYLE_ELEMENT_ID)) {
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = YT_STYLE_ELEMENT_ID;
  styleEl.textContent = buildYouTubeCss(selectors);
  shadowRoot.appendChild(styleEl);
}

/**
 * Hides all matching ad elements within a given container root.
 * @param {Element|Document} root
 * @param {string[]} selectors
 * @returns {number} count of newly hidden elements
 */
export function hideAdElements(root, selectors = YOUTUBE_SELECTORS) {
  if (!root || !root.querySelectorAll) {
    return 0;
  }
  const combined = selectors.join(', ');
  let hiddenCount = 0;
  try {
    if (root.nodeType === 1 && root.matches?.(combined) && root.style.display !== 'none') {
      root.style.setProperty('display', 'none', 'important');
      hiddenCount++;
    }
    const matches = root.querySelectorAll(combined);
    for (const el of matches) {
      if (el.style.display !== 'none') {
        el.style.setProperty('display', 'none', 'important');
        hiddenCount++;
      }
    }
  } catch {
    // Invalid selector or detached node
  }

  if (hiddenCount > 0) {
    queueYouTubeBlockedReport(hiddenCount);
  }
  return hiddenCount;
}

/**
 * Installs MutationObserver on document.body to hide dynamic SPA containers.
 * @param {Document} doc
 * @param {string[]} selectors
 * @returns {MutationObserver|null}
 */
export function installYouTubeObserver(doc = document, selectors = YOUTUBE_SELECTORS) {
  if (typeof MutationObserver === 'undefined' || !doc || !doc.body) {
    return null;
  }

  const observedRoots = new WeakSet();
  const observeRoot = (root) => {
    if (!root || observedRoots.has(root)) {
      return;
    }
    observedRoots.add(root);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    if (root.host) {
      injectShadowStyles(root, selectors);
      hideAdElements(root, selectors);
    }
    for (const element of root.querySelectorAll?.('*') || []) {
      if (element.shadowRoot) {
        observeRoot(element.shadowRoot);
      }
    }
  };
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        hideAdElements(mutation.target, selectors);
      }
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.shadowRoot) {
            observeRoot(node.shadowRoot);
          }
          hideAdElements(node, selectors);
          for (const element of node.querySelectorAll?.('*') || []) {
            if (element.shadowRoot) {
              observeRoot(element.shadowRoot);
            }
          }
        }
      }
    }
  });

  observeRoot(doc.body);

  return observer;
}

/**
 * Executes injection and observer setup after checking settings.
 */
function setupYouTubeCosmetic() {
  injectYouTubeStyles(document, YOUTUBE_SELECTORS);

  if (document.body) {
    installYouTubeObserver(document, YOUTUBE_SELECTORS);
    hideAdElements(document.body, YOUTUBE_SELECTORS);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      installYouTubeObserver(document, YOUTUBE_SELECTORS);
      hideAdElements(document.body, YOUTUBE_SELECTORS);
    });
  }

  // Handle YouTube SPA soft navigation (T5.1)
  if (typeof window !== 'undefined' && window.addEventListener) {
    const rescan = () => {
      if (document.body) {
        for (const element of document.querySelectorAll('*')) {
          if (element.shadowRoot) {
            injectShadowStyles(element.shadowRoot, YOUTUBE_SELECTORS);
            hideAdElements(element.shadowRoot, YOUTUBE_SELECTORS);
          }
        }
        hideAdElements(document.body, YOUTUBE_SELECTORS);
      }
    };
    window.addEventListener('yt-navigate-finish', rescan);
    window.addEventListener('yt-page-data-updated', rescan);
    window.addEventListener('popstate', rescan);
  }
}

/**
 * Initializes the YouTube cosmetic hiding module (T5.3 settings toggle).
 */
export function initYouTubeCosmetic() {
  if (typeof document === 'undefined') {
    return;
  }

  const rt = globalThis.chrome?.runtime;
  if (rt?.sendMessage) {
    rt.sendMessage({ type: MSG.SETTINGS_GET, payload: {} }, (res) => {
      if (res?.ok && res.data && res.data.youtubeEnabled === false) {
        // Disabled by user setting
        return;
      }
      setupYouTubeCosmetic();
    });
  } else {
    setupYouTubeCosmetic();
  }
}

initYouTubeCosmetic();
