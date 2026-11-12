// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _resetQueueState,
  initCosmeticScript,
  installCosmeticObserver,
  queueBlockedReport,
} from '../../../src/content/cosmetic.js';
import {
  _resetYtReportQueue,
  hideAdElements,
  injectYouTubeStyles,
  initYouTubeCosmetic,
  queueYouTubeBlockedReport,
  YT_STYLE_ELEMENT_ID,
} from '../../../src/content/youtube.js';

describe('content branch coverage follow-up', () => {
  beforeEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
    _resetQueueState();
    _resetYtReportQueue();
    delete globalThis.chrome;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.chrome;
  });

  it('covers observer descendant matches and cosmetic report fallbacks', async () => {
    const observer = installCosmeticObserver(document, ['.nested-ad']);
    const wrapper = document.createElement('section');
    const ad = document.createElement('div');
    ad.className = 'nested-ad';
    wrapper.append(ad);
    document.body.append(wrapper);

    await new Promise((resolve) => setTimeout(resolve, 130));
    expect(ad.style.display).toBe('none');
    observer.disconnect();
    _resetQueueState();

    vi.useFakeTimers();
    const sendMessage = vi.fn();
    globalThis.chrome = { runtime: { sendMessage } };
    queueBlockedReport(0);
    queueBlockedReport(2);
    vi.advanceTimersByTime(2000);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ hostname: window.location.hostname }),
      })
    );
  });

  it('covers cosmetic settings callbacks and the loading-document path', () => {
    const sendMessage = vi.fn((_message, callback) =>
      callback({ ok: true, data: { cosmeticEnabled: false } })
    );
    globalThis.chrome = { runtime: { sendMessage } };
    initCosmeticScript();
    expect(sendMessage).toHaveBeenCalled();

    globalThis.chrome = {
      runtime: { sendMessage: vi.fn((_message, callback) => callback({ ok: true })) },
    };
    Object.defineProperty(document, 'readyState', { configurable: true, value: 'loading' });
    initCosmeticScript();
    expect(document.querySelector('style')).not.toBeNull();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    Object.defineProperty(document, 'readyState', { configurable: true, value: 'complete' });
  });

  it('covers YouTube duplicate styles, no-op reports, and hidden elements', () => {
    const first = injectYouTubeStyles(document, ['.ad']);
    expect(injectYouTubeStyles(document, ['.other'])).toBe(first);
    expect(hideAdElements(null)).toBe(0);

    const hidden = document.createElement('div');
    hidden.className = 'ytp-ad-module';
    hidden.style.display = 'none';
    document.body.append(hidden);
    expect(hideAdElements(document.body, ['.ytp-ad-module'])).toBe(0);

    vi.useFakeTimers();
    queueYouTubeBlockedReport(-1);
    queueYouTubeBlockedReport(1);
    vi.advanceTimersByTime(2000);
    expect(globalThis.chrome).toBeUndefined();
  });

  it('skips YouTube setup when disabled and initializes without the runtime API', () => {
    globalThis.chrome = {
      runtime: {
        sendMessage: vi.fn((_message, callback) =>
          callback({ ok: true, data: { youtubeEnabled: false } })
        ),
      },
    };
    initYouTubeCosmetic();
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalled();

    delete globalThis.chrome;
    initYouTubeCosmetic();
    expect(document.getElementById(YT_STYLE_ELEMENT_ID)).not.toBeNull();
  });
});
