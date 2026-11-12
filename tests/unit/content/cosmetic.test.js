// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildCosmeticCss,
  injectCosmeticStyles,
  installCosmeticObserver,
  initCosmeticScript,
  queueBlockedReport,
  _resetQueueState,
  STYLE_ELEMENT_ID,
  CS_REPORT_INTERVAL_MS,
} from '../../../src/content/cosmetic.js';
import { GENERIC_SELECTORS } from '../../../src/content/selectors.js';

describe('cosmetic content script (src/content/cosmetic.js)', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    const oldStyle = document.getElementById(STYLE_ELEMENT_ID);
    if (oldStyle) {
      oldStyle.remove();
    }
  });

  it('buildCosmeticCss formats display:none !important on all selectors (AC-TF.1-2)', () => {
    const selectors = ['.ad-banner', '#sponsored'];
    const css = buildCosmeticCss(selectors);

    expect(css).toContain('.ad-banner { display: none !important; }');
    expect(css).toContain('#sponsored { display: none !important; }');

    expect(buildCosmeticCss([])).toBe('');
    expect(buildCosmeticCss(null)).toBe('');
  });

  it('injectCosmeticStyles creates and appends <style> to documentElement (AC-TF.1-1)', () => {
    const styleEl = injectCosmeticStyles(document, ['.ad-banner']);

    expect(styleEl).toBeDefined();
    expect(styleEl.tagName.toLowerCase()).toBe('style');
    expect(styleEl.id).toBe(STYLE_ELEMENT_ID);
    expect(styleEl.textContent).toContain('.ad-banner { display: none !important; }');
    expect(document.documentElement.contains(styleEl)).toBe(true);

    // Calling again returns existing style element without duplicate injection
    const duplicate = injectCosmeticStyles(document, ['.ad-banner']);
    expect(duplicate).toBe(styleEl);
  });

  it('never creates or injects <script> tags (AC-TF.1-4)', () => {
    injectCosmeticStyles(document, GENERIC_SELECTORS);
    const scripts = document.querySelectorAll('script');
    expect(scripts.length).toBe(0);
  });

  it('installCosmeticObserver observes and hides newly added nodes matching selectors (AC-TF.1-3)', async () => {
    const observer = installCosmeticObserver(document, ['.dynamic-ad']);
    expect(observer).toBeDefined();

    const adDiv = document.createElement('div');
    adDiv.className = 'dynamic-ad';
    document.body.appendChild(adDiv);

    // Wait for MutationObserver callback
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(adDiv.style.display).toBe('none');

    observer.disconnect();
  });

  it('initCosmeticScript executes safely and attaches listener if document is loading', () => {
    expect(() => initCosmeticScript()).not.toThrow();

    // Safe when document is undefined
    const savedDoc = globalThis.document;
    delete globalThis.document;
    expect(() => initCosmeticScript()).not.toThrow();
    globalThis.document = savedDoc;
  });

  it('handles null/empty document safely', () => {
    expect(injectCosmeticStyles(null)).toBeNull();
    expect(installCosmeticObserver(null)).toBeNull();
  });

  describe('queueBlockedReport batched reporting', () => {
    it('batches reporting calls within 2000ms window', () => {
      vi.useFakeTimers();
      _resetQueueState();
      const sendMock = vi.fn();
      globalThis.chrome = {
        runtime: {
          sendMessage: sendMock,
        },
      };

      queueBlockedReport(2, 'example.com', 'cosmetic');
      queueBlockedReport(3, 'example.com', 'cosmetic');

      // Before timer fires: no message sent
      expect(sendMock).not.toHaveBeenCalled();

      // Advance by 2000ms
      vi.advanceTimersByTime(CS_REPORT_INTERVAL_MS);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.calls[0][0].payload.count).toBe(5);

      vi.useRealTimers();
    });
  });
});
