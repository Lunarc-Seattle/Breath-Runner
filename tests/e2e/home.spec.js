// @ts-check
import { test, expect } from '@playwright/test';

const SESSIONS = '/api/v1/sessions';

test.describe('home', () => {
  test('a run saved now marks this part of today done and shows its breath sync', async ({ page }) => {
    const res = await page.request.post(SESSIONS, {
      data: {
        patternId: 'MAP-FOREST-01',
        patternName: 'Forest · Level 1 · Breath Runner',
        rounds: 1,
        durationSec: 40,
        completed: true,
        coins: 30,
        totalCoins: 30,
        syncPct: 100,
        falls: 0
      }
    });
    expect(res.status()).toBe(201);

    await page.goto('/#/home');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Good (morning|afternoon|evening),/);

    // The schedule sentence behind the markers: the slot holding "now" is done.
    const hour = new Date().getHours();
    const slot = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    await expect(page.locator('.home-hero-today')).toContainText(`${slot} done.`);

    const sync = page.getByRole('article', { name: 'Breath sync' });
    await expect(sync.getByText(/^100%\s*best$/)).toBeVisible();
    await expect(sync.getByRole('img')).toHaveAccessibleName(/100%/);
  });

  test('trainer status without a paired trainer, and sample friends marked as sample', async ({ page }) => {
    await page.goto('/#/home');
    await expect(page.getByText('No trainer found, using the microphone')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pair Bluetooth trainer' })).toBeVisible();

    const friends = page.getByRole('article', { name: 'Friends this week' });
    await expect(friends.getByText('Sample data')).toBeVisible();
    await expect(friends.getByRole('listitem')).toHaveCount(4);
    await expect(friends.getByRole('listitem').filter({ hasText: 'You' })).toHaveCount(1);
  });

  test('"Start today’s run" opens the game', async ({ page }) => {
    await page.goto('/#/home');
    await page.getByRole('button', { name: 'Start today’s run' }).click();
    await expect(page).toHaveURL(/#\/play$/);
    await expect(page.getByRole('button', { name: '▶ Start running' })).toBeVisible();
  });
});
