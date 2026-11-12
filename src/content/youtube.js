// src/content/youtube.js
// YouTube Cosmetic Content Script: hides ad UI containers only.
// NEVER manipulates video/audio playback, never skips/mutes, never clicks buttons.
// See docs/06_YOUTUBE_MODULE.md and docs/15_TASK_PLAN.md T5.1, T5.2, T5.3

import { YOUTUBE_SELECTORS } from './youtube/selectors.js';
import { MSG } from '../shared/messages.js';

export const YT_STYLE_ELEMENT_ID = 'su-ad-blocker-youtube-styles';
export const YT_REPORT_INTERVAL_MS = 2000;

let ytReportTimer = null;
const pendingYtReportCounts = new Map();
const detectedYtElements = new WeakSet();
const hiddenYtElements = new WeakSet();
const observerControllers = new WeakMap();
const initializedDocuments = new WeakSet();

/**
 * Resets reporting queue state (for unit testing).
 */
export function _resetYtReportQueue() {
  if (ytReportTimer !== null) {
    clearTimeout(ytReportTimer);
    ytReportTimer = null;
  }
  pendingYtReportCounts.clear();
}

/**
 * Batches YouTube ad container block counts and dispatches CS_BLOCKED_REPORT.
 * @param {number} count
 */
export function queueYouTubeBlockedReport(count, type = 'youtube') {
  if (
    !Number.isSafeInteger(count) ||
    count <= 0 ||
    !['youtube', 'youtubeDetected'].includes(type)
  ) {
    return;
  }
  pendingYtReportCounts.set(type, (pendingYtReportCounts.get(type) || 0) + count);

  if (ytReportTimer !== null) {
    return;
  }

  ytReportTimer = setTimeout(() => {
    ytReportTimer = null;
    const reports = [...pendingYtReportCounts.entries()];
    pendingYtReportCounts.clear();

    const rt = globalThis.chrome?.runtime;
    if (rt?.sendMessage) {
      for (const [type, count] of reports) {
        try {
          const result = rt.sendMessage({
            type: MSG.CS_BLOCKED_REPORT,
            payload: { count, type, hostname: 'youtube.com' },
          });
          result?.catch?.(() => {});
        } catch {
          // A closing extension context can reject a queued cosmetic report.
        }
      }
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
  const styleEl = (shadowRoot.ownerDocument || document).createElement('style');
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
export function hideAdElements(root, selectors = YOUTUBE_SELECTORS, includeDescendants = true) {
  if (!root || !root.querySelectorAll) {
    return 0;
  }
  const combined = selectors.join(', ');
  let hiddenCount = 0;
  try {
    const matches = includeDescendants ? [...root.querySelectorAll(combined)] : [];
    if (root.nodeType === 1 && root.matches?.(combined)) {
      matches.unshift(root);
    }
    for (const element of matches) {
      if (!detectedYtElements.has(element)) {
        detectedYtElements.add(element);
        queueYouTubeBlockedReport(1, 'youtubeDetected');
      }
      if (element.style.display === 'none') {
        continue;
      }
      element.style.setProperty('display', 'none', 'important');
      if (!hiddenYtElements.has(element)) {
        hiddenYtElements.add(element);
        hiddenCount++;
        queueYouTubeBlockedReport(1);
      }
    }
  } catch {
    // Invalid selector or detached node
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
  const existingController = observerControllers.get(doc);
  if (existingController) {
    existingController.scan();
    return existingController.observer;
  }

  const observedRoots = new WeakSet();
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        hideAdElements(mutation.target, selectors, false);
        if (mutation.target.shadowRoot) {
          scanRoot(mutation.target.shadowRoot);
        }
      }
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.shadowRoot) {
            scanRoot(node.shadowRoot);
          }
          hideAdElements(node, selectors);
          for (const element of node.querySelectorAll?.('*') || []) {
            if (element.shadowRoot) {
              scanRoot(element.shadowRoot);
            }
          }
        }
      }
    }
  });
  const scanRoot = (root) => {
    if (!root) {
      return;
    }
    if (!observedRoots.has(root)) {
      observedRoots.add(root);
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }
    if (root.host) {
      injectShadowStyles(root, selectors);
    }
    hideAdElements(root, selectors);
    for (const element of root.querySelectorAll?.('*') || []) {
      if (element.shadowRoot) {
        scanRoot(element.shadowRoot);
      }
    }
  };
  const scan = () => scanRoot(doc.body);
  observer.scan = scan;
  const disconnect = observer.disconnect.bind(observer);
  observer.disconnect = () => {
    disconnect();
    if (observerControllers.get(doc)?.observer === observer) {
      observerControllers.delete(doc);
    }
  };
  observerControllers.set(doc, { observer, scan });
  scan();

  return observer;
}

/**
 * Executes injection and observer setup after checking settings.
 */
function setupYouTubeCosmetic() {
  if (initializedDocuments.has(document)) {
    return;
  }
  initializedDocuments.add(document);
  injectYouTubeStyles(document, YOUTUBE_SELECTORS);

  if (document.body) {
    installYouTubeObserver(document, YOUTUBE_SELECTORS);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      installYouTubeObserver(document, YOUTUBE_SELECTORS);
    });
  }

  // Handle YouTube SPA soft navigation (T5.1)
  if (typeof window !== 'undefined' && window.addEventListener) {
    const rescan = () => {
      if (document.body) {
        installYouTubeObserver(document, YOUTUBE_SELECTORS);
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
