// @ts-check
import { test, expect } from '@playwright/test';

const LEVEL_NAME = 'Forest · Level 1';
const HOLD_MS = 1600; // long enough to glide across the widest gap, shorter than the 2.4 s lung
const LAP_TIMEOUT_MS = 45_000;

test('play a lap by following the breath cue, save it, then clear the history', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/#/play');

  // Start with an empty history so the saved row is unambiguous.
  await page.request.delete('/api/v1/sessions');

  const start = page.getByRole('button', { name: '▶ Start running' });
  await expect(start).toBeFocused(); // the start card moves focus to its primary action
  await start.click();
  // The 3-2-1 count-in runs first; pause is offered once she is running.
  await expect(page.getByRole('button', { name: 'Pause' })).toBeEnabled({ timeout: 8000 });

  // Play like a person: watch the announced cue and breathe in (hold Space) when it says so.
  const cue = page.getByText(/^(Inhale — jump & glide|Exhale — relax & run)$/);
  const lapCard = page.getByText(/^LAP \d+ COMPLETE$/);
  await expect(cue).toHaveAttribute('aria-live', 'polite');

  const deadline = Date.now() + LAP_TIMEOUT_MS;
  let breaths = 0;
  while (!(await lapCard.isVisible())) {
    expect(Date.now(), 'lap should complete in time').toBeLessThan(deadline);
    if ((await cue.textContent()) === 'Inhale — jump & glide') {
      await page.keyboard.down('Space');
      await page.waitForTimeout(HOLD_MS);
      await page.keyboard.up('Space');
      breaths++;
    } else {
      await page.waitForTimeout(30);
    }
  }
  expect(breaths).toBeGreaterThan(0);

  // Lap result card: Coins and Breath sync in separate panels; focus on "Next lap →".
  await expect(page.getByText('Coins').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Next lap/ })).toBeFocused();

  await page.getByRole('button', { name: 'Save to history' }).click();
  // Extract coins from the save notification ("Saved …: N coins, M% breath sync").
  const notif = page.getByRole('status').filter({ hasText: /^Saved / });
  await expect(notif).toBeVisible();
  const notifText = (await notif.textContent()) ?? '';
  const coins = Number(notifText.match(/(\d+) coins/)?.[1] ?? '0');
  expect(coins).toBeGreaterThan(0);

  await page.goto('/#/history');
  const row = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: LEVEL_NAME }) });
  await expect(row).toHaveCount(1);
  const cells = row.getByRole('cell');
  // Columns: Date | (Level is the row header) | Duration | Coins | Breath sync | Falls | Laps
  await expect(cells.nth(2)).toHaveText(`${coins}/30`);
  await expect(cells.nth(3)).toHaveText(/^\d{1,3}%$/);
  await expect(cells.nth(4)).toHaveText(/^\d+$/);
  await expect(cells.nth(5)).toHaveText('1');

  page.once('dialog', dialog => {
    expect(dialog.type()).toBe('confirm');
    dialog.accept();
  });
  await page.getByRole('button', { name: 'Clear history' }).click();
  await expect(page.getByRole('heading', { name: 'No runs yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start your first run' })).toBeVisible();
  await expect(row).toHaveCount(0);
});
