// @ts-check
import { test, expect } from '@playwright/test';
import { ROUTES } from '../../src/app/routes.js';

// The narrowest phone still in common use (iPhone SE): every page must fit without sideways scrolling.
test.use({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true });

test.describe('phone width', () => {
  for (const route of ROUTES) {
    test(`#/${route.slug} fits a 320 px screen`, async ({ page }) => {
      await page.goto(`/#/${route.slug}`, { waitUntil: 'networkidle' });
      await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();
      const widths = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        screen: document.documentElement.clientWidth
      }));
      expect(widths.page, 'page scrolls sideways').toBeLessThanOrEqual(widths.screen);
    });
  }

  test('the game start card keeps its Start button on screen', async ({ page }) => {
    await page.goto('/#/play');
    const start = page.getByRole('button', { name: '▶ Start running' });
    await start.scrollIntoViewIfNeeded();
    await expect(start).toBeInViewport({ ratio: 1 });
  });
});
