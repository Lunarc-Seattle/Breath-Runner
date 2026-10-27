// @ts-check
import { test, expect } from '@playwright/test';

test.describe('care team', () => {
  test('is in the drawer’s Care group and marked as sample data', async ({ page }) => {
    await page.goto('/#/home');
    await page.getByRole('button', { name: /^Pages menu, current page/ }).click();
    await page
      .getByRole('navigation', { name: 'Pages' })
      .getByRole('button', { name: /^Care Team/ })
      .click();
    await expect(page).toHaveURL(/#\/care-team$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Patients' })).toBeVisible();
    await expect(page.getByText('Sample data').first()).toBeVisible();
  });

  test('filters, search and selecting a patient', async ({ page }) => {
    await page.goto('/#/care-team');
    const table = page.getByRole('table', { name: 'Sample patients in home rehab' });
    const patients = table.getByRole('button'); // one per patient row
    await expect(patients).toHaveCount(7);

    await page
      .getByRole('group', { name: 'Filter patients' })
      .getByRole('button', { name: /^Needs attention/ })
      .click();
    await expect(patients).toHaveCount(3);

    await page.getByRole('searchbox', { name: 'Search patients' }).fill('sun');
    await expect(patients).toHaveCount(1);
    await patients.first().click();
    await expect(page.getByRole('heading', { level: 2, name: 'Sun Hao' })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search patients' }).fill('nobody');
    await expect(table).toContainText('No patients match');
  });

  test('prescription steppers stay within their limits', async ({ page }) => {
    await page.goto('/#/care-team');
    await expect(page.locator('output', { hasText: /^\d+$/ }).first()).toHaveText('3');
    const more = page.getByRole('button', { name: 'More sessions' });
    await more.click();
    await more.click();
    await expect(page.locator('output', { hasText: /^\d+$/ }).first()).toHaveText('5');
    await expect(more).toBeDisabled();
  });
});
