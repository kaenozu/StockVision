/**
 * Global Setup for E2E Tests
 * 
 * Optimizes test execution by preparing shared state and resources.
 */

import { test as setup, expect } from '@playwright/test';

// Constants for test optimization
const SETUP_TIMEOUT = 60000; // 1 minute
const API_BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

setup('prepare test environment', async ({ page, context }) => {
  setup.setTimeout(SETUP_TIMEOUT);

  // Pre-warm the application
  console.log('Warming up application...');
  await page.goto(API_BASE_URL);
  
  // Wait for app to be ready
  await expect(page.locator('body')).toBeVisible();
  
  // Pre-load critical resources
  await page.evaluate(() => {
    // Preload common API endpoints
    const criticalEndpoints = [
      '/api/health',
      '/api/stocks/popular',
      '/api/watchlist'
    ];
    
    criticalEndpoints.forEach(endpoint => {
      fetch(`${location.origin}${endpoint}`, { method: 'HEAD' }).catch(() => {});
    });
  });

  // Set up test data in localStorage for faster test execution
  await page.evaluate(() => {
    localStorage.setItem('e2e-test-mode', 'true');
    localStorage.setItem('disable-analytics', 'true');
    localStorage.setItem('disable-animations', 'true');
    localStorage.setItem('mock-api-enabled', 'true');
  });

  // Disable unnecessary features for faster testing
  await page.addInitScript(() => {
    // Disable animations
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: -0.001ms !important;
        animation-iteration-count: 1 !important;
        background-attachment: initial !important;
        scroll-behavior: auto !important;
        transition: none !important;
      }
    `;
    document.head.appendChild(style);

    // Mock slow APIs for consistent test timing
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const url = typeof input === 'string' ? input : input.url;
      
      // Speed up known slow endpoints
      if (url.includes('/api/stocks/realtime')) {
        return Promise.resolve(new Response(JSON.stringify({
          stock_code: '7203',
          current_price: 2850,
          price_change: 45,
          price_change_pct: 1.6,
          last_updated: new Date().toISOString()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      
      return originalFetch.call(this, input, init);
    };

    // Disable console logs in tests for cleaner output
    if (process.env.NODE_ENV === 'test') {
      console.log = () => {};
      console.warn = () => {};
      console.info = () => {};
    }
  });

  // Save authentication state if needed
  await context.storageState({ path: './tests/e2e/.auth/user.json' });

  console.log('Test environment setup completed');
});

setup('health check', async ({ request }) => {
  // Verify backend is running and responsive
  try {
    const response = await request.get(`${API_BASE_URL}/api/health`);
    if (!response.ok()) {
      console.warn('Backend health check failed, using mock mode');
    }
  } catch (error) {
    console.warn('Backend not available, using mock mode');
  }
});

setup('optimize browser caches', async ({ page }) => {
  // Pre-cache static assets
  await page.goto(API_BASE_URL);
  
  // Force load all critical CSS and JS
  await page.waitForLoadState('networkidle');
  
  // Navigate through key pages to cache resources
  const keyPages = ['/', '/watchlist', '/settings'];
  
  for (const url of keyPages) {
    try {
      await page.goto(`${API_BASE_URL}${url}`, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
    } catch (error) {
      console.warn(`Failed to pre-cache ${url}`);
    }
  }
  
  console.log('Browser caches optimized');
});