import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config';

// 環境変数から設定を読み込む
const getWorkers = () => {
  if (process.env.PLAYWRIGHT_WORKERS) {
    return parseInt(process.env.PLAYWRIGHT_WORKERS, 10);
  }
  return process.env.CI ? 2 : undefined;
};

const getRetries = () => {
  if (process.env.PLAYWRIGHT_RETRIES) {
    return parseInt(process.env.PLAYWRIGHT_RETRIES, 10);
  }
  return process.env.CI ? 1 : 0;
};

const getGlobalTimeout = () => {
  if (process.env.PLAYWRIGHT_GLOBAL_TIMEOUT) {
    return parseInt(process.env.PLAYWRIGHT_GLOBAL_TIMEOUT, 10);
  }
  return 5 * 60 * 1000; // 5 minutes
};

const getWebServerTimeout = () => {
  if (process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT) {
    return parseInt(process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT, 10);
  }
  return 120 * 1000; // 2 minutes
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: getRetries(),
  /* Opt out of parallel tests on CI. */
  workers: getWorkers(),
  /* Global timeout for the whole test suite */
  globalTimeout: getGlobalTimeout(),
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: getWebServerTimeout(),
  },
});