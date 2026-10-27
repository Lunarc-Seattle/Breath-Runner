// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Smoke check without extra deps: every exposed button needs an accessible name.
 * @type {{ slug: string, ready: (page: import('@playwright/test').Page) => import('@playwright/test').Locator }[]}
 */
const PAGES = [
  { slug: 'home', ready: page => page.getByRole('heading', { level: 1 }) },
  { slug: 'play', ready: page => page.getByRole('button', { name: '▶ Start running' }) },
  { slug: 'history', ready: page => page.getByRole('heading', { level: 1, name: 'Progress' }) }
];

for (const { slug, ready } of PAGES) {
  test(`every button on #/${slug} has an accessible name`, async ({ page }) => {
    await page.goto(`/#/${slug}`);
    await expect(ready(page)).toBeVisible();
    if (slug === 'history') await expect(page.getByText('Loading saved runs…')).toBeHidden();

    const buttons = await page.getByRole('button').all();
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      await expect(button, await button.evaluate(el => el.outerHTML.slice(0, 160))).toHaveAccessibleName(/\S/);
    }
  });
}
