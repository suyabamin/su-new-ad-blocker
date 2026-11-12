// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildYouTubeCss,
  injectYouTubeStyles,
  installYouTubeObserver,
  hideAdElements,
  initYouTubeCosmetic,
  detectPageType,
  queueYouTubeBlockedReport,
  _resetYtReportQueue,
  YT_STYLE_ELEMENT_ID,
  YT_REPORT_INTERVAL_MS,
} from '../../../src/content/youtube.js';
import {
  YOUTUBE_SELECTORS,
  FORBIDDEN_YOUTUBE_SELECTORS,
} from '../../../src/content/youtube-selectors.js';
import { vi } from 'vitest';

describe('YouTube cosmetic module (src/content/youtube.js)', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    _resetYtReportQueue();
    const old = document.getElementById(YT_STYLE_ELEMENT_ID);
    if (old) {
      old.remove();
    }
  });

  it('all required selectors from docs/06_YOUTUBE_MODULE.md Section 2 are present (AC-TF.2-1)', () => {
    expect(YOUTUBE_SELECTORS).toContain('.ytp-ad-module');
    expect(YOUTUBE_SELECTORS).toContain('.video-ads.ytp-ad-module');
    expect(YOUTUBE_SELECTORS).toContain('.ytp-ad-overlay-container');
    expect(YOUTUBE_SELECTORS).toContain('.ytp-ad-text-overlay');
    expect(YOUTUBE_SELECTORS).toContain('.ytp-ad-image-overlay');
    expect(YOUTUBE_SELECTORS).toContain('.ytp-ad-skip-button-container');
    expect(YOUTUBE_SELECTORS).toContain('#masthead-ad');
    expect(YOUTUBE_SELECTORS).toContain('ytd-banner-promo-renderer');
    expect(YOUTUBE_SELECTORS).toContain('ytd-ad-slot-renderer');
    expect(YOUTUBE_SELECTORS).toContain('ytd-in-feed-ad-layout-renderer');
    expect(YOUTUBE_SELECTORS).toContain('ytd-promoted-sparkles-web-renderer');
    expect(YOUTUBE_SELECTORS).toContain('ytd-display-ad-renderer');
    expect(YOUTUBE_SELECTORS).toContain('ytd-action-companion-ad-renderer');
    expect(YOUTUBE_SELECTORS).toContain('ytd-player-legacy-desktop-watch-ads-renderer');
    expect(YOUTUBE_SELECTORS).toContain('#player-ads');
    expect(YOUTUBE_SELECTORS).toContain('.ytd-promoted-video-renderer');
  });

  it('none of the forbidden selectors appear in YOUTUBE_SELECTORS (AC-TF.2-2)', () => {
    for (const forbidden of FORBIDDEN_YOUTUBE_SELECTORS) {
      expect(YOUTUBE_SELECTORS).not.toContain(forbidden);
    }
  });

  it('does not reference video or audio elements in source code (AC-TF.2-4)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const youtubeJs = fs.readFileSync(
      path.resolve(__dirname, '../../../src/content/youtube.js'),
      'utf8'
    );
    expect(youtubeJs).not.toMatch(/document\.querySelector\(['"]video/i);
    expect(youtubeJs).not.toMatch(/document\.querySelector\(['"]audio/i);
    expect(youtubeJs).not.toMatch(/\.playbackRate/i);
    expect(youtubeJs).not.toMatch(/\.currentTime/i);
    expect(youtubeJs).not.toMatch(/\.muted/i);
    expect(youtubeJs).not.toMatch(/\.play\(\)/i);
    expect(youtubeJs).not.toMatch(/\.pause\(\)/i);
  });

  it('injectYouTubeStyles appends <style> tag to documentElement', () => {
    const styleEl = injectYouTubeStyles(document, YOUTUBE_SELECTORS);
    expect(styleEl).toBeDefined();
    expect(styleEl.id).toBe(YT_STYLE_ELEMENT_ID);
    expect(styleEl.textContent).toContain('.ytp-ad-module { display: none !important; }');
  });

  it('hideAdElements sets display:none on matching elements', () => {
    const adContainer = document.createElement('div');
    adContainer.className = 'ytp-ad-module';
    document.body.appendChild(adContainer);

    hideAdElements(document.body, YOUTUBE_SELECTORS);
    expect(adContainer.style.display).toBe('none');
  });

  it('installYouTubeObserver observes document.body and hides new ad elements (AC-TF.2-3)', async () => {
    const observer = installYouTubeObserver(document, YOUTUBE_SELECTORS);
    expect(observer).toBeDefined();

    const banner = document.createElement('div');
    banner.id = 'masthead-ad';
    document.body.appendChild(banner);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(banner.style.display).toBe('none');

    observer.disconnect();
  });

  it('initYouTubeCosmetic runs safely and responds to yt-navigate-finish event', () => {
    expect(() => initYouTubeCosmetic()).not.toThrow();

    const ad = document.createElement('div');
    ad.id = 'player-ads';
    document.body.appendChild(ad);

    window.dispatchEvent(new Event('yt-navigate-finish'));
    expect(ad.style.display).toBe('none');
  });

  it('buildYouTubeCss handles edge cases safely', () => {
    expect(buildYouTubeCss([])).toBe('');
    expect(buildYouTubeCss(null)).toBe('');
    expect(injectYouTubeStyles(null)).toBeNull();
    expect(installYouTubeObserver(null)).toBeNull();
  });

  describe('detectPageType (T5.1)', () => {
    it('accurately identifies page types from URLs/paths', () => {
      expect(detectPageType('/watch?v=123')).toBe('watch');
      expect(detectPageType('/results?search_query=test')).toBe('search');
      expect(detectPageType('/@somechannel')).toBe('channel');
      expect(detectPageType('/channel/UC12345')).toBe('channel');
      expect(detectPageType('/c/coolcreator')).toBe('channel');
      expect(detectPageType('/')).toBe('home');
      expect(detectPageType('')).toBe('home');
      expect(detectPageType('/feed/explore')).toBe('other');
      expect(detectPageType(null)).toBe('other');
    });
  });

  describe('queueYouTubeBlockedReport batched reporting (T5.3)', () => {
    it('batches reporting calls within 2000ms window', () => {
      vi.useFakeTimers();
      const sendMock = vi.fn();
      globalThis.chrome = {
        runtime: {
          sendMessage: sendMock,
        },
      };

      queueYouTubeBlockedReport(2);
      queueYouTubeBlockedReport(3);

      expect(sendMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(YT_REPORT_INTERVAL_MS);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.calls[0][0].payload.count).toBe(5);
      expect(sendMock.mock.calls[0][0].payload.type).toBe('youtube');
      expect(sendMock.mock.calls[0][0].payload.hostname).toBe('youtube.com');

      vi.useRealTimers();
      delete globalThis.chrome;
    });
  });

  describe('settings toggle integration (T5.3)', () => {
    it('does not inject styles or observers when youtubeEnabled is false', () => {
      globalThis.chrome = {
        runtime: {
          sendMessage: vi.fn((msg, cb) => {
            if (cb) {
              cb({ ok: true, data: { youtubeEnabled: false } });
            }
          }),
        },
      };

      initYouTubeCosmetic();
      expect(document.getElementById(YT_STYLE_ELEMENT_ID)).toBeNull();
      delete globalThis.chrome;
    });
  });
});
