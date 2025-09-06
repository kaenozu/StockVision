/**
 * Lighthouse CI Configuration
 * 
 * Performance testing configuration for StockVision application
 * with enterprise-grade performance thresholds and metrics.
 */

module.exports = {
  ci: {
    // Collection configuration
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/stocks/7203',
        'http://localhost:3000/watchlist',
        'http://localhost:3000/about'
      ],
      startServerCommand: 'npm run preview -- --port 3000 --host',
      startServerReadyPattern: 'Local:.*:3000',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-gpu --disable-dev-shm-usage',
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        emulatedFormFactor: 'desktop'
      }
    },

    // Upload configuration (if using LHCI server)
    upload: {
      target: 'temporary-public-storage',
      // target: 'filesystem', // Alternative for local storage
      // outputDir: './lighthouse-reports'
    },

    // Server configuration (if using LHCI server)
    // server: {
    //   port: 9001,
    //   storage: {
    //     storageMethod: 'sql',
    //     sqlDialect: 'sqlite',
    //     sqlDatabasePath: './lighthouse-ci.db'
    //   }
    // },

    // Performance assertions
    assert: {
      // Global performance thresholds
      assertions: {
        // Performance metrics
        'categories:performance': ['error', {minScore: 0.8}],
        'categories:accessibility': ['error', {minScore: 0.95}],
        'categories:best-practices': ['error', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.8}],

        // Core Web Vitals
        'first-contentful-paint': ['error', {maxNumericValue: 2000}],
        'largest-contentful-paint': ['error', {maxNumericValue: 3000}],
        'interactive': ['error', {maxNumericValue: 4000}],
        'speed-index': ['error', {maxNumericValue: 3500}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],

        // Additional performance metrics
        'total-blocking-time': ['error', {maxNumericValue: 300}],
        'max-potential-fid': ['error', {maxNumericValue: 130}],

        // Resource optimization
        'unused-javascript': ['warn', {maxNumericValue: 30000}],
        'unused-css-rules': ['warn', {maxNumericValue: 20000}],
        'unminified-css': ['error', {maxNumericValue: 0}],
        'unminified-javascript': ['error', {maxNumericValue: 0}],
        'render-blocking-resources': ['warn', {maxNumericValue: 2}],

        // Image optimization
        'uses-optimized-images': ['warn', {maxNumericValue: 10000}],
        'uses-webp-images': ['warn', {maxNumericValue: 10000}],
        'modern-image-formats': ['warn', {maxNumericValue: 10000}],

        // Caching and compression
        'uses-long-cache-ttl': ['warn', {maxNumericValue: 100000}],
        'uses-text-compression': ['error', {maxNumericValue: 0}],

        // Network efficiency
        'efficient-animated-content': ['warn', {maxNumericValue: 10000}],
        'duplicated-javascript': ['warn', {maxNumericValue: 10000}],
        'legacy-javascript': ['warn', {maxNumericValue: 20000}],

        // Accessibility essentials
        'color-contrast': ['error', {minScore: 1}],
        'image-alt': ['error', {minScore: 1}],
        'label': ['error', {minScore: 1}],
        'link-name': ['error', {minScore: 1}],

        // PWA (if applicable)
        'installable-manifest': 'off',
        'splash-screen': 'off',
        'themed-omnibox': 'off',
        'content-width': 'off',

        // Security
        'is-on-https': 'off', // Disabled for local testing
        'redirects-http': 'off', // Disabled for local testing
        'uses-https': 'off' // Disabled for local testing
      },

      // Page-specific assertions
      preset: 'lighthouse:no-pwa',
      includePassedAssertions: true
    }
  },

  // Custom reporting
  reporting: {
    reports: ['html', 'json'],
    uploadUrlMap: {
      '/': 'Home Page',
      '/stocks/7203': 'Stock Detail Page',
      '/watchlist': 'Watchlist Page',
      '/about': 'About Page'
    }
  }
};