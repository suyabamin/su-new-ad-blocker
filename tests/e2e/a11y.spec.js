import { test, expect } from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility verification with axe-core (T6.2)', () => {
  test('popup page has zero serious or critical accessibility violations', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    const scanResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    const criticalOrSerious = scanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toEqual([]);
    await page.close();
  });

  test('options page has zero serious or critical accessibility violations', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await page.waitForLoadState('domcontentloaded');

    const scanResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    const criticalOrSerious = scanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toEqual([]);
    await page.close();
  });
});
