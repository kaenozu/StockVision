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
  // Optimize worker count for better parallelization
  return process.env.CI ? 4 : Math.max(2, Math.floor(require('os').cpus().length / 2));
};

const getRetries = () => {
  if (process.env.PLAYWRIGHT_RETRIES) {
    return parseInt(process.env.PLAYWRIGHT_RETRIES, 10);
  }
  return process.env.CI ? 2 : 1;
};

const getGlobalTimeout = () => {
  if (process.env.PLAYWRIGHT_GLOBAL_TIMEOUT) {
    return parseInt(process.env.PLAYWRIGHT_GLOBAL_TIMEOUT, 10);
  }
  return process.env.CI ? 10 * 60 * 1000 : 5 * 60 * 1000; // 10min CI, 5min local
};

const getWebServerTimeout = () => {
  if (process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT) {
    return parseInt(process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT, 10);
  }
  return process.env.CI ? 180 * 1000 : 120 * 1000; // 3min CI, 2min local
};

const getTestTimeout = () => {
  if (process.env.PLAYWRIGHT_TEST_TIMEOUT) {
    return parseInt(process.env.PLAYWRIGHT_TEST_TIMEOUT, 10);
  }
  return process.env.CI ? 60 * 1000 : 30 * 1000; // 60s CI, 30s local
};

const getExpectTimeout = () => {
  if (process.env.PLAYWRIGHT_EXPECT_TIMEOUT) {
    return parseInt(process.env.PLAYWRIGHT_EXPECT_TIMEOUT, 10);
  }
  return 10 * 1000; // 10 seconds
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
  /* Optimized worker count for parallel execution */
  workers: getWorkers(),
  /* Global timeout for the whole test suite */
  globalTimeout: getGlobalTimeout(),
  /* Individual test timeout */
  timeout: getTestTimeout(),
  /* Expected conditions timeout */
  expect: { timeout: getExpectTimeout() },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI 
    ? [
        ['github'],
        ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
        ['json', { outputFile: 'test-results/e2e-results.json' }],
        ['./tests/e2e/reporters/custom-reporter.ts']
      ]
    : [
        ['list'],
        ['html', { open: 'never' }],
        ['./tests/e2e/reporters/custom-reporter.ts']
      ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    /* Screenshot settings */
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    
    /* Video recording */
    video: process.env.CI ? 'retain-on-failure' : 'off',
    
    /* Action timeout */
    actionTimeout: 15 * 1000,
    
    /* Navigation timeout */
    navigationTimeout: 30 * 1000,
    
    /* Ignore HTTPS errors for faster loading */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for major browsers - optimized for speed */
  projects: [
    // Fast setup project - only run essential tests on this
    {
      name: 'setup',
      testMatch: '**/global.setup.ts',
      teardown: 'cleanup',
    },
    {
      name: 'cleanup', 
      testMatch: '**/global.teardown.ts',
    },

    // Primary browser testing - most tests run here
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Optimize Chrome flags for speed
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
      dependencies: ['setup'],
    },

    // Run subset of critical tests on other browsers
    ...(!process.env.PLAYWRIGHT_FAST_MODE ? [
      {
        name: 'firefox',
        use: { 
          ...devices['Desktop Firefox'],
          launchOptions: {
            firefoxUserPrefs: {
              'dom.webnotifications.enabled': false,
              'dom.push.enabled': false,
            }
          }
        },
        testIgnore: ['**/performance.spec.ts', '**/edge-cases.spec.ts'],
        dependencies: ['setup'],
      },

      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
        testIgnore: ['**/performance.spec.ts', '**/edge-cases.spec.ts', '**/api-integration.spec.ts'],
        dependencies: ['setup'],
      },

      /* Test against mobile viewports - critical tests only */
      {
        name: 'Mobile Chrome',
        use: { ...devices['Pixel 5'] },
        testIgnore: ['**/performance.spec.ts', '**/edge-cases.spec.ts', '**/api-integration.spec.ts'],
        dependencies: ['setup'],
      },
    ] : []),
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: getWebServerTimeout(),
    stdout: 'pipe',
    stderr: 'pipe',
  },
});