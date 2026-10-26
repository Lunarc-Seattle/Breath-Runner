// @ts-check
import { test, expect } from '@playwright/test';
import { pagesMenu } from './helpers.js';

test.describe('navigation drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/history');
    await expect(page.getByRole('heading', { name: 'Your Runs, Coins & Breath Sync' })).toBeVisible();
  });

  test('hovering the page pill opens the drawer and Esc closes it', async ({ page }) => {
    const trigger = pagesMenu(page);
    const drawer = page.getByRole('navigation', { name: 'Pages' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer).toBeHidden(); // aria-hidden + inert: not in the accessibility tree

    await trigger.hover();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('button', { name: /Training Game/ })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer).toBeHidden();
  });

  test('the current page is marked aria-current="page"', async ({ page }) => {
    await pagesMenu(page).click();
    const drawer = page.getByRole('navigation', { name: 'Pages' });
    await expect(drawer).toBeVisible();

    await expect(drawer.getByRole('button', { name: /Run History/ })).toHaveAttribute('aria-current', 'page');
    await expect(drawer.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(drawer.getByRole('button', { name: /Training Game/ })).not.toHaveAttribute('aria-current', /.*/);
  });

  test('the closed drawer is inert and cannot take focus', async ({ page }) => {
    const nav = page.locator('#nav-drawer');
    await expect(nav).toHaveAttribute('inert', '');
    await expect(nav).toHaveAttribute('aria-hidden', 'true');

    // Programmatic focus is refused inside an inert subtree.
    const focusedInside = await nav.evaluate(el => {
      el.querySelector('button')?.focus();
      return el.contains(document.activeElement);
    });
    expect(focusedInside).toBe(false);

    // Tabbing through the whole page never lands in the drawer.
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      expect(await nav.evaluate(el => el.contains(document.activeElement))).toBe(false);
    }

    // Opening it lifts inert.
    await pagesMenu(page).click();
    await expect(nav).not.toHaveAttribute('inert', /.*/);
  });
});

test('hovering then clicking the page pill keeps the drawer open (mouse)', async ({ page }) => {
  await page.goto('/#/home');
  const pill = page.getByRole('button', { name: /^Pages menu, current page/ });
  await pill.hover();
  await expect(pill).toHaveAttribute('aria-expanded', 'true');
  await page.waitForTimeout(300);
  await pill.click();
  await expect(pill).toHaveAttribute('aria-expanded', 'true');
});

test('keyboard: Enter on the page pill toggles the drawer', async ({ page }) => {
  await page.goto('/#/home');
  const pill = page.getByRole('button', { name: /^Pages menu, current page/ });
  await pill.focus();
  await page.keyboard.press('Enter');
  await expect(pill).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(pill).toHaveAttribute('aria-expanded', 'false');
});
