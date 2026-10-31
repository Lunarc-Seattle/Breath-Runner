// @ts-check
import { test, expect } from '@playwright/test';

test.describe('game keyboard input', () => {
  test('Space on a focused control operates the control, not the runner', async ({ page }) => {
    await page.goto('/#/play');
    await page.getByRole('button', { name: '▶ Start running' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeEnabled({ timeout: 8000 }); // after the 3-2-1

    const pause = page.getByRole('button', { name: 'Pause' });
    await pause.focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();

    // The runner did not take that Space as an inhale.
    await expect(page.getByRole('button', { name: /Hold to inhale/ })).toBeVisible();
  });

  test('Space with nothing focused is the breath input', async ({ page }) => {
    await page.goto('/#/play');
    await page.getByRole('button', { name: '▶ Start running' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeEnabled({ timeout: 8000 }); // after the 3-2-1
    await page.locator('body').focus();
    await page.keyboard.down('Space');
    await expect(page.getByRole('button', { name: '▲ Inhaling…' })).toBeVisible();
    await page.keyboard.up('Space');
    await expect(page.getByRole('button', { name: /Hold to inhale/ })).toBeVisible();
  });
});
