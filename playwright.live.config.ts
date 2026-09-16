import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.LIVE_BASE_URL ?? 'https://ken303867-png.github.io/study-app/';

export default defineConfig({
  testDir: './tests/live',
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: 'line',
  timeout: 120_000,
  use: {
    baseURL,
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
