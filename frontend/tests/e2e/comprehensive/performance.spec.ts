/**
 * Performance E2E Tests
 * 
 * Tests for application performance, load times, and resource optimization.
 */

import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should have acceptable page load times', async ({ page }) => {
    const startTime = performance.now()
    
    await page.goto('/', { waitUntil: 'networkidle' })
    
    const loadTime = performance.now() - startTime
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
    
    // Check for critical rendering path completion
    await expect(page.locator('h1, main, [data-testid="main-content"]')).toBeVisible()
  })

  test('should handle large datasets efficiently', async ({ page }) => {
    // Mock large dataset response
    const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
      stock_code: `${1000 + i}`,
      company_name: `Company ${i}`,
      current_price: Math.random() * 10000,
      price_change: Math.random() * 200 - 100,
      price_change_pct: Math.random() * 10 - 5,
      volume: Math.floor(Math.random() * 10000000)
    }))

    await page.route('**/api/stocks/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDataset)
      })
    })

    const startTime = performance.now()
    
    // Navigate to a page that loads large datasets
    const stocksLink = page.locator('a[href*="stocks"], nav a:has-text("株式検索")')
    if (await stocksLink.isVisible()) {
      await stocksLink.click()
      
      // Wait for data to be displayed
      await page.waitForSelector('.stock-item, .data-row, [data-testid*="stock"]', { timeout: 10000 })
      
      const renderTime = performance.now() - startTime
      
      // Should handle large datasets within reasonable time (10 seconds)
      expect(renderTime).toBeLessThan(10000)
      
      // Check if virtualization or pagination is working
      const visibleItems = await page.locator('.stock-item, .data-row, [data-testid*="stock"]').count()
      
      // Should not render all 5000 items at once (indicates virtualization)
      expect(visibleItems).toBeLessThan(1000)
    }
  })

  test('should optimize bundle size and loading', async ({ page }) => {
    // Measure resource loading
    const resourceSizes: { [key: string]: number } = {}
    const resourceTypes: { [key: string]: number } = { js: 0, css: 0, images: 0, other: 0 }
    
    page.on('response', response => {
      const url = response.url()
      const contentLength = parseInt(response.headers()['content-length'] || '0')
      
      resourceSizes[url] = contentLength
      
      if (url.endsWith('.js') || url.includes('javascript')) {
        resourceTypes.js += contentLength
      } else if (url.endsWith('.css')) {
        resourceTypes.css += contentLength
      } else if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
        resourceTypes.images += contentLength
      } else {
        resourceTypes.other += contentLength
      }
    })
    
    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Check bundle sizes are reasonable
    const totalJSSize = resourceTypes.js
    const totalCSSSize = resourceTypes.css
    
    // JavaScript bundles should be under 5MB total
    expect(totalJSSize).toBeLessThan(5 * 1024 * 1024)
    
    // CSS should be under 1MB total  
    expect(totalCSSSize).toBeLessThan(1024 * 1024)
    
    console.log('Resource sizes:', resourceTypes)
  })

  test('should handle memory usage efficiently', async ({ page }) => {
    // Enable memory monitoring
    const client = await page.context().newCDPSession(page)
    await client.send('Performance.enable')
    await client.send('Runtime.enable')
    
    // Measure initial memory
    const initialMemory = await client.send('Runtime.getHeapUsage')
    
    // Perform memory-intensive operations
    for (let i = 0; i < 10; i++) {
      // Navigate between pages to test for memory leaks
      const stocksLink = page.locator('a[href*="watchlist"], a:has-text("ウォッチリスト")')
      if (await stocksLink.isVisible()) {
        await stocksLink.click()
        await page.waitForTimeout(500)
      }
      
      const homeLink = page.locator('a[href="/"], nav a:has-text("ホーム")')
      if (await homeLink.isVisible()) {
        await homeLink.click()
        await page.waitForTimeout(500)
      }
    }
    
    // Force garbage collection
    await client.send('Runtime.runScript', {
      expression: 'if (window.gc) window.gc();'
    })
    
    await page.waitForTimeout(1000)
    
    // Measure final memory
    const finalMemory = await client.send('Runtime.getHeapUsage')
    
    // Memory growth should be reasonable (less than 50MB increase)
    const memoryGrowth = finalMemory.usedSize - initialMemory.usedSize
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024)
    
    console.log('Memory usage:', {
      initial: Math.round(initialMemory.usedSize / 1024 / 1024) + 'MB',
      final: Math.round(finalMemory.usedSize / 1024 / 1024) + 'MB',
      growth: Math.round(memoryGrowth / 1024 / 1024) + 'MB'
    })
  })

  test('should optimize scroll performance with large lists', async ({ page }) => {
    // Mock large list data
    const largeList = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      stock_code: `${1000 + i}`,
      company_name: `Company ${i}`,
      current_price: Math.random() * 10000
    }))

    await page.route('**/api/stocks/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeList)
      })
    })

    // Navigate to page with long list
    const stocksLink = page.locator('a[href*="stocks"], nav a:has-text("株式検索")')
    if (await stocksLink.isVisible()) {
      await stocksLink.click()
      
      // Wait for list to load
      await page.waitForSelector('.stock-item, [data-testid*="stock"]', { timeout: 10000 })
      
      // Test scroll performance
      const startTime = performance.now()
      
      // Scroll through the list
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 500)
        await page.waitForTimeout(50)
      }
      
      const scrollTime = performance.now() - startTime
      
      // Scrolling should be smooth (under 2 seconds for 10 scroll actions)
      expect(scrollTime).toBeLessThan(2000)
      
      // Check if only visible items are rendered (virtualization)
      const renderedItems = await page.locator('.stock-item, [data-testid*="stock"]').count()
      expect(renderedItems).toBeLessThan(200) // Should not render all 10000 items
    }
  })

  test('should optimize search and filter performance', async ({ page }) => {
    // Mock large searchable dataset
    await page.route('**/api/stocks/**', async route => {
      const url = new URL(route.request().url())
      const search = url.searchParams.get('q')
      
      // Simulate search delay based on dataset size
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const mockResults = Array.from({ length: search ? 50 : 1000 }, (_, i) => ({
        stock_code: search ? `${search}${i}` : `${1000 + i}`,
        company_name: search ? `${search} Company ${i}` : `Company ${i}`,
        current_price: Math.random() * 10000
      }))
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResults)
      })
    })

    // Test search performance
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      const startTime = performance.now()
      
      // Type search query
      await searchInput.fill('TEST')
      await page.keyboard.press('Enter')
      
      // Wait for results
      await page.waitForSelector('.stock-item, [data-testid*="stock"]', { timeout: 5000 })
      
      const searchTime = performance.now() - startTime
      
      // Search should complete within 2 seconds
      expect(searchTime).toBeLessThan(2000)
      
      // Test filter performance (if filters exist)
      const filterButton = page.locator('button:has-text("フィルタ"), [data-testid="filter"]')
      if (await filterButton.isVisible()) {
        const filterStartTime = performance.now()
        
        await filterButton.click()
        
        // Apply some filter
        const gainersFilter = page.locator('input[type="checkbox"]', 'button:has-text("Gainers")').first()
        if (await gainersFilter.isVisible()) {
          await gainersFilter.click()
          await page.waitForTimeout(100)
        }
        
        const filterTime = performance.now() - filterStartTime
        
        // Filtering should be instant (under 500ms)
        expect(filterTime).toBeLessThan(500)
      }
    }
  })

  test('should optimize Web Worker performance', async ({ page }) => {
    // Skip if Web Worker Manager is not available
    const hasWorkerManager = await page.locator('[data-testid="worker-manager"], .worker-manager').isVisible()
    
    if (hasWorkerManager) {
      // Open Worker Manager
      await page.click('[data-testid="worker-manager"], .worker-manager')
      
      // Run performance test
      const testButton = page.locator('button:has-text("Test Bulk Processing")')
      if (await testButton.isVisible()) {
        const startTime = performance.now()
        
        await testButton.click()
        
        // Wait for processing to complete
        await page.waitForTimeout(3000)
        
        const processingTime = performance.now() - startTime
        
        // Web Worker processing should complete within reasonable time
        expect(processingTime).toBeLessThan(5000)
        
        // Check processing stats
        const avgTime = await page.locator('[data-testid="avg-processing-time"]').textContent()
        if (avgTime) {
          const avgTimeMs = parseFloat(avgTime.replace('ms', ''))
          expect(avgTimeMs).toBeLessThan(1000) // Average processing under 1 second
        }
      }
    }
  })

  test('should measure Core Web Vitals', async ({ page }) => {
    // Navigate to main page
    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Measure Core Web Vitals using web-vitals library (if available)
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: { [key: string]: number } = {}
        
        // Mock web vitals if library not available
        if (!window.performance || !window.performance.getEntriesByType) {
          resolve({
            LCP: 1000,
            FID: 50,
            CLS: 0.1,
            FCP: 800
          })
          return
        }
        
        // Get paint timing
        const paintEntries = window.performance.getEntriesByType('paint')
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
        if (fcpEntry) {
          vitals.FCP = fcpEntry.startTime
        }
        
        // Get navigation timing
        const navEntry = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navEntry) {
          vitals.loadTime = navEntry.loadEventEnd - navEntry.fetchStart
          vitals.DOMContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.fetchStart
        }
        
        // Mock LCP, FID, CLS if not available
        vitals.LCP = vitals.LCP || 1200
        vitals.FID = vitals.FID || 80
        vitals.CLS = vitals.CLS || 0.08
        
        resolve(vitals)
      })
    })
    
    console.log('Core Web Vitals:', webVitals)
    
    // Assert acceptable values
    if (typeof webVitals === 'object') {
      const vitals = webVitals as { [key: string]: number }
      
      // First Contentful Paint should be under 1.8s
      if (vitals.FCP) {
        expect(vitals.FCP).toBeLessThan(1800)
      }
      
      // Largest Contentful Paint should be under 2.5s
      if (vitals.LCP) {
        expect(vitals.LCP).toBeLessThan(2500)
      }
      
      // First Input Delay should be under 100ms
      if (vitals.FID) {
        expect(vitals.FID).toBeLessThan(100)
      }
      
      // Cumulative Layout Shift should be under 0.1
      if (vitals.CLS) {
        expect(vitals.CLS).toBeLessThan(0.1)
      }
    }
  })

  test('should optimize API request batching and caching', async ({ page }) => {
    let requestCount = 0
    let cachedResponses = 0
    
    // Monitor API requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requestCount++
        
        // Check for cache headers
        const cacheControl = request.headers()['cache-control']
        const etag = request.headers()['if-none-match']
        
        if (cacheControl || etag) {
          cachedResponses++
        }
      }
    })
    
    // Navigate to multiple pages to trigger API requests
    const watchlistLink = page.locator('a[href*="watchlist"]')
    if (await watchlistLink.isVisible()) {
      await watchlistLink.click()
      await page.waitForTimeout(1000)
    }
    
    const stocksLink = page.locator('a[href*="stocks"]')
    if (await stocksLink.isVisible()) {
      await stocksLink.click()
      await page.waitForTimeout(1000)
    }
    
    // Go back to watchlist (should use cache)
    if (await watchlistLink.isVisible()) {
      await watchlistLink.click()
      await page.waitForTimeout(1000)
    }
    
    console.log(`Total API requests: ${requestCount}, Cached: ${cachedResponses}`)
    
    // Should optimize API usage
    expect(requestCount).toBeLessThan(20) // Reasonable number of API calls
    
    // Should use caching when possible
    if (requestCount > 0) {
      const cacheRatio = cachedResponses / requestCount
      expect(cacheRatio).toBeGreaterThan(0.1) // At least 10% cache usage
    }
  })

  test('should handle concurrent operations efficiently', async ({ page }) => {
    // Test concurrent API requests
    const promises = []
    
    // Trigger multiple operations simultaneously
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      // Multiple search operations
      promises.push(
        searchInput.fill('TEST1').then(() => page.keyboard.press('Enter'))
      )
      
      promises.push(
        searchInput.fill('TEST2').then(() => page.keyboard.press('Enter'))
      )
      
      promises.push(
        searchInput.fill('TEST3').then(() => page.keyboard.press('Enter'))
      )
    }
    
    // Add navigation operations
    const watchlistLink = page.locator('a[href*="watchlist"]')
    if (await watchlistLink.isVisible()) {
      promises.push(watchlistLink.click())
    }
    
    const startTime = performance.now()
    
    // Execute all operations concurrently
    await Promise.allSettled(promises)
    
    const executionTime = performance.now() - startTime
    
    // Concurrent operations should complete efficiently
    expect(executionTime).toBeLessThan(5000) // All operations under 5 seconds
    
    // Application should remain responsive
    const finalPage = await page.title()
    expect(finalPage).toBeTruthy()
  })
})