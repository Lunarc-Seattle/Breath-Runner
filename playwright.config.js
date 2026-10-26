// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CI = !!process.env.CI;
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// A fresh JSON store per run so saved sessions never leak between runs or into server/data/.
// Computed once here: the config is re-evaluated in each worker, so the value is pinned via env.
process.env.E2E_DATA_FILE ||= join(tmpdir(), `breath-runner-e2e-${process.pid}-${Date.now()}.json`);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  // One worker: every spec shares one server and data file, and game.spec clears the history.
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // CI keeps an HTML report (published on the quality page) and a JSON summary for its numbers.
  reporter: CI
    ? [['html', { open: 'never' }], ['json', { outputFile: 'e2e-results/results.json' }], ['github']]
    : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry'
  },
  // On CI use the Google Chrome preinstalled on GitHub's Ubuntu runners: no browser download.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...(CI ? { channel: 'chrome' } : {}) } }],
  webServer: {
    // CI downloads the dist/ artifact from the build job, so only the server needs starting.
    command: CI ? 'node server/server.js' : 'npm run build && node server/server.js',
    url: `${BASE_URL}/api/v1/health`,
    reuseExistingServer: !CI,
    timeout: 120_000,
    // High write limit: repeated local runs reuse one server within the same minute.
    env: { PORT: String(PORT), DATA_FILE: process.env.E2E_DATA_FILE, RATE_LIMIT_PER_MIN: '1000', LOG_LEVEL: 'warn' }
  }
});
