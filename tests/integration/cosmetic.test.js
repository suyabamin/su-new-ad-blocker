// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { GENERIC_SELECTORS } from '../../src/content/selectors.js';
import { injectCosmeticStyles } from '../../src/content/cosmetic.js';
import { hideAdElements } from '../../src/content/youtube.js';

describe('cosmetic integration (tests/integration/cosmetic.test.js)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('hides DOM elements matching generic and custom cosmetic selectors (AC-TH.1-2)', () => {
    // Construct simulated webpage DOM with various ad containers
    document.body.innerHTML = `
      <div class="content">Main Article Content</div>
      <div class="ad-banner">Ad 1</div>
      <div class="sponsored-content">Sponsored Article</div>
      <div id="player-ads">Video player overlay ad</div>
      <aside class="sidebar-advertising">Side Ad</aside>
    `;

    const testSelectors = ['.ad-banner', '.sponsored-content', '#player-ads'];
    hideAdElements(document.body, testSelectors);

    expect(document.querySelector('.ad-banner').style.display).toBe('none');
    expect(document.querySelector('.sponsored-content').style.display).toBe('none');
    expect(document.querySelector('#player-ads').style.display).toBe('none');

    // Main content remains visible
    expect(document.querySelector('.content').style.display).not.toBe('none');
  });

  it('all 22 generic selectors format into valid CSS rules (AC-TH.1-2)', () => {
    const style = injectCosmeticStyles(document, GENERIC_SELECTORS);
    expect(style).toBeDefined();
    for (const sel of GENERIC_SELECTORS) {
      expect(style.textContent).toContain(`${sel} { display: none !important; }`);
    }
  });
});
