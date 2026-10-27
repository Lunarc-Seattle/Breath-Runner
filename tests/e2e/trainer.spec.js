// @ts-check
import { test, expect } from '@playwright/test';
import { pagesMenu } from './helpers.js';

test.describe('trainer & care', () => {
  for (const old of ['hygiene', 'rental']) {
    test(`the old #/${old} link opens Trainer & Care`, async ({ page }) => {
      await page.goto(`/#/${old}`);
      await expect(pagesMenu(page)).toHaveAccessibleName('Pages menu, current page 08 Trainer & Care');
      await expect(page.getByRole('heading', { level: 1, name: 'Trainer & care' })).toBeVisible();
    });
  }

  test('booking a disinfection updates the notice on Home', async ({ page }) => {
    await page.goto('/#/trainer');
    const booking = page.getByRole('article', { name: 'Book a disinfection' });
    await expect(booking.getByText('Sample data')).toBeVisible();

    const day = booking.locator('button[aria-pressed]:not([disabled])').filter({ hasText: /^\d+$/ }).first();
    await day.click();
    await expect(day).toHaveAttribute('aria-pressed', 'true');
    await booking.getByRole('button', { name: 'Book disinfection' }).click();
    await expect(booking.getByRole('status')).toContainText('Disinfection booked for');

    await page.getByRole('button', { name: /^AeroCare home$/i }).click();
    await expect(page.getByText('Disinfection booked')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change' })).toBeVisible();
  });
});
