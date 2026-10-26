// @ts-check
/**
 * Collects console errors, uncaught page errors and failed requests for a page,
 * so a spec can assert the page loaded cleanly.
 * @param {import('@playwright/test').Page} page
 */
export function trackPageProblems(page) {
  /** @type {string[]} */
  const problems = [];
  page.on('console', msg => {
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', err => problems.push(`pageerror: ${err.message}`));
  page.on('requestfailed', req =>
    problems.push(`requestfailed: ${req.method()} ${req.url()} ${req.failure()?.errorText ?? ''}`)
  );
  page.on('response', res => {
    if (res.status() >= 400) problems.push(`http ${res.status()}: ${res.request().method()} ${res.url()}`);
  });
  return problems;
}

/**
 * The page-menu pill; its accessible name says which page is current.
 * @param {import('@playwright/test').Page} page
 */
export const pagesMenu = page => page.getByRole('button', { name: /^Pages menu, current page/ });
