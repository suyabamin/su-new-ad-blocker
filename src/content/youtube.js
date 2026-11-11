// YouTube Cosmetic Content Script: hides ad UI containers only
// NEVER manipulates video/audio playback, never skips/mutes, never clicks buttons.
// See docs/06_YOUTUBE_MODULE.md and docs/15_TASK_PLAN.md TF.2

import { YOUTUBE_SELECTORS } from './youtube-selectors.js';

export const YT_STYLE_ELEMENT_ID = 'su-ad-blocker-youtube-styles';

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

/**
 * Hides all matching ad elements within a given container root.
 * @param {Element|Document} root
 * @param {string[]} selectors
 */
export function hideAdElements(root, selectors = YOUTUBE_SELECTORS) {
  if (!root || !root.querySelectorAll) {
    return;
  }
  const combined = selectors.join(', ');
  const matches = root.querySelectorAll(combined);
  for (const el of matches) {
    el.style.setProperty('display', 'none', 'important');
  }
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

  const combined = selectors.join(', ');

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.matches && node.matches(combined)) {
            node.style.setProperty('display', 'none', 'important');
          }
          hideAdElements(node, selectors);
        }
      }
    }
  });

  observer.observe(doc.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

/**
 * Initializes the YouTube cosmetic hiding module.
 * Attaches to yt-navigate-finish event for soft SPA navigation.
 */
export function initYouTubeCosmetic() {
  if (typeof document === 'undefined') {
    return;
  }

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

  // Handle YouTube SPA soft navigation
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('yt-navigate-finish', () => {
      if (document.body) {
        hideAdElements(document.body, YOUTUBE_SELECTORS);
      }
    });
  }
}

initYouTubeCosmetic();
