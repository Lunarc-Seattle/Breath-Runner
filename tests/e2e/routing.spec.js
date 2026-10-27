// @ts-check
import { test, expect } from '@playwright/test';
import { ROUTES } from '../../src/app/routes.js';
import { trackPageProblems, pagesMenu } from './helpers.js';

test.describe('hash routing', () => {
  for (const route of ROUTES) {
    test(`#/${route.slug} renders ${route.code} ${route.name} cleanly`, async ({ page }) => {
      const problems = trackPageProblems(page);
      await page.goto(`/#/${route.slug}`, { waitUntil: 'networkidle' });

      await expect(pagesMenu(page)).toHaveAccessibleName(`Pages menu, current page ${route.code} ${route.name}`);
      await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();
      expect(problems).toEqual([]);
    });
  }

  test('the browser back button returns to the previous page', async ({ page }) => {
    await page.goto('/#/home');
    await expect(pagesMenu(page)).toHaveAccessibleName(/01 Home$/);

    // Navigate through the drawer, the way a user would.
    await pagesMenu(page).click();
    await page
      .getByRole('navigation', { name: 'Pages' })
      .getByRole('button', { name: /^Progress/ })
      .click();
    await expect(page).toHaveURL(/#\/history$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Progress' })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/#\/home$/);
    await expect(pagesMenu(page)).toHaveAccessibleName(/01 Home$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('a deep link to #/history loads that page directly', async ({ page }) => {
    await page.goto('/#/history');
    await expect(page.getByRole('heading', { level: 1, name: 'Progress' })).toBeVisible();
    await expect(pagesMenu(page)).toHaveAccessibleName(/13 Progress$/);
  });

  test('an unknown hash falls back to home', async ({ page }) => {
    await page.goto('/#/does-not-exist');
    await expect(pagesMenu(page)).toHaveAccessibleName(/01 Home$/);
    await expect(page.getByRole('button', { name: /^AeroCare home$/i })).toHaveAttribute('aria-current', 'page');
  });
});
