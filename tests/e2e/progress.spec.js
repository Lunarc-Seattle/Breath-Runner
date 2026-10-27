// @ts-check
import { test, expect } from '@playwright/test';

const SESSIONS = '/api/v1/sessions';

/** @param {string} patternId @param {string} patternName @param {number} syncPct */
const run = (patternId, patternName, syncPct) => ({
  patternId,
  patternName: `${patternName} · Breath Runner`,
  rounds: 1,
  durationSec: 50,
  completed: true,
  coins: 10,
  totalCoins: 19,
  syncPct,
  falls: 1
});

test.describe('progress', () => {
  test.beforeEach(async ({ request }) => {
    for (const data of [
      run('MAP-GLACIER-03', 'Glacier Ridge · Level 3', 72),
      run('MAP-FOREST-01', 'Forest · Level 1', 64)
    ]) {
      expect((await request.post(SESSIONS, { data })).status()).toBe(201);
    }
  });

  test('stats, ridge chart and time range come from the saved runs', async ({ page, request }) => {
    /** @type {{ sessions: { syncPct?: number }[] }} */
    const { sessions } = await (await request.get(SESSIONS)).json();
    const best = Math.max(...sessions.map(s => s.syncPct ?? 0));

    await page.goto('/#/history');
    await expect(page.getByRole('heading', { level: 1, name: 'Progress' })).toBeVisible();

    const stats = page.locator('dl');
    await expect(stats.getByText('Runs', { exact: true })).toBeVisible();
    await expect(stats).toContainText(`Best breath sync${best}%`);
    await expect(page.getByRole('img', { name: /^Best breath sync each day/ })).toBeVisible();

    const range = page.getByRole('group', { name: 'Time range' });
    await range.getByRole('button', { name: '7 days' }).click();
    await expect(range.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    await expect(range.getByRole('button', { name: 'All runs' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('the level filter keeps only that level’s runs', async ({ page }) => {
    await page.goto('/#/history');
    const table = page.getByRole('table', { name: /Saved Breath Runner runs/ });
    await expect(table.getByRole('rowheader', { name: 'Forest · Level 1' }).first()).toBeVisible();

    await page.getByRole('combobox', { name: 'Level' }).selectOption({ label: 'Glacier Ridge' });
    const levels = await table.getByRole('rowheader').allTextContents();
    expect(levels.length).toBeGreaterThan(0);
    expect(new Set(levels)).toEqual(new Set(['Glacier Ridge · Level 3']));
  });
});
