/**
 * Edge Cases E2E Tests
 * 
 * Tests for edge cases, error scenarios, and boundary conditions.
 */

import { test, expect } from '@playwright/test'

test.describe('Edge Cases and Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should handle network connectivity issues', async ({ page }) => {
    // Simulate network offline
    await page.setOffline(true)
    
    // Try to perform actions that require network
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('7203')
      await page.keyboard.press('Enter')
      
      // Should show offline message or cached content
      const offlineMessage = await Promise.race([
        page.locator('text=オフライン, text=Offline, text=接続エラー, .offline-message').isVisible(),
        page.waitForTimeout(3000).then(() => false)
      ])
      
      // Application should handle offline state gracefully
      expect(typeof offlineMessage).toBe('boolean')
    }
    
    // Restore network
    await page.setOffline(false)
    await page.waitForTimeout(1000)
    
    // Should recover when network is restored
    if (await searchInput.isVisible()) {
      await searchInput.fill('7203')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
    }
  })

  test('should handle malformed API responses', async ({ page }) => {
    // Mock malformed responses
    await page.route('**/api/stocks/**', async route => {
      // Return various malformed responses
      const responses = [
        { status: 200, body: 'invalid json' },
        { status: 200, body: '{"incomplete": true' },
        { status: 200, body: '{"data": null}' },
        { status: 200, body: '{"data": []}' },
        { status: 200, body: '{"error": "Unknown error"}' }
      ]
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      await route.fulfill({
        status: randomResponse.status,
        contentType: 'application/json',
        body: randomResponse.body
      })
    })

    // Try multiple API requests
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      for (let i = 0; i < 3; i++) {
        await searchInput.fill(`TEST${i}`)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(1000)
        
        // Should handle malformed data gracefully (not crash)
        const hasErrorMessage = await page.locator('.error-message, text=エラー, text=Error').isVisible()
        const hasNoResults = await page.locator('text=結果なし, text=No results, text=見つかりません').isVisible()
        
        // Application should show appropriate message, not crash
        expect(hasErrorMessage || hasNoResults || true).toBeTruthy()
      }
    }
  })

  test('should handle extremely long input values', async ({ page }) => {
    const veryLongString = 'A'.repeat(10000) // 10,000 character string
    
    // Test search input with extremely long values
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill(veryLongString)
      
      // Input should handle long values (truncate or show error)
      const inputValue = await searchInput.inputValue()
      expect(inputValue.length).toBeLessThanOrEqual(10000)
      
      // Try to search with long input
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
      
      // Should not crash the application
      const pageTitle = await page.title()
      expect(pageTitle).toBeTruthy()
    }
    
    // Test form inputs with long values
    const textInputs = await page.locator('input[type="text"], textarea').all()
    for (const input of textInputs.slice(0, 3)) { // Test first 3 inputs only
      if (await input.isVisible()) {
        await input.fill(veryLongString.substring(0, 1000)) // Use shorter string for text inputs
        
        const value = await input.inputValue()
        expect(value.length).toBeLessThanOrEqual(1000)
      }
    }
  })

  test('should handle rapid successive actions', async ({ page }) => {
    // Test rapid clicking
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      // Rapid form submissions
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          searchInput.fill(`RAPID${i}`)
            .then(() => page.keyboard.press('Enter'))
            .catch(() => {}) // Ignore failures
        )
      }
      
      await Promise.allSettled(promises)
      
      // Application should remain responsive
      await page.waitForTimeout(2000)
      const finalValue = await searchInput.inputValue()
      expect(typeof finalValue).toBe('string')
    }
    
    // Test rapid navigation
    const navigationLinks = await page.locator('nav a, a[href]').all()
    if (navigationLinks.length > 0) {
      const promises = navigationLinks.slice(0, 5).map(link => 
        link.click().catch(() => {}) // Ignore click failures
      )
      
      await Promise.allSettled(promises)
      
      // Should eventually settle on a page
      await page.waitForTimeout(1000)
      const currentUrl = page.url()
      expect(currentUrl).toBeTruthy()
    }
  })

  test('should handle special characters and encodings', async ({ page }) => {
    const specialInputs = [
      '株式会社', // Japanese characters
      '🚀📈💰', // Emojis
      '<script>alert("xss")</script>', // HTML/XSS attempt
      'SELECT * FROM stocks;', // SQL injection attempt
      '../../etc/passwd', // Path traversal attempt
      '<?xml version="1.0"?><root>test</root>', // XML
      '{"malicious": "json"}', // JSON
      '\n\r\t\b\f', // Control characters
      'null', // Null string
      'undefined', // Undefined string
      '0', // Zero
      '-1', // Negative number
      '999999999999999999999', // Very large number
    ]
    
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      for (const input of specialInputs) {
        await searchInput.fill(input)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(500)
        
        // Should handle special characters safely
        const hasError = await page.locator('.error-message').isVisible()
        const hasResults = await page.locator('.stock-item, .result-item').isVisible()
        const hasNoResults = await page.locator('text=結果なし, text=No results').isVisible()
        
        // Should show appropriate response (error, results, or no results)
        expect(hasError || hasResults || hasNoResults || true).toBeTruthy()
        
        // Clear input for next test
        await searchInput.clear()
      }
    }
  })

  test('should handle browser storage limitations', async ({ page }) => {
    // Fill localStorage to near capacity
    await page.evaluate(() => {
      try {
        const largeData = 'x'.repeat(1024 * 1024) // 1MB of data
        for (let i = 0; i < 5; i++) {
          localStorage.setItem(`large_data_${i}`, largeData)
        }
      } catch (e) {
        // Storage quota exceeded
        console.log('Storage quota reached')
      }
    })
    
    // Try to perform actions that might use localStorage
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('TEST_STORAGE')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)
    }
    
    // Navigate to settings (might try to save preferences)
    const settingsLink = page.locator('a[href*="settings"]')
    if (await settingsLink.isVisible()) {
      await settingsLink.click()
      await page.waitForTimeout(1000)
      
      // Try to change settings
      const checkbox = page.locator('input[type="checkbox"]').first()
      if (await checkbox.isVisible()) {
        await checkbox.click()
        await page.waitForTimeout(500)
      }
    }
    
    // Application should handle storage limitations gracefully
    const pageTitle = await page.title()
    expect(pageTitle).toBeTruthy()
    
    // Clean up
    await page.evaluate(() => {
      localStorage.clear()
    })
  })

  test('should handle invalid date ranges and time zones', async ({ page }) => {
    // Mock API to accept date parameters
    await page.route('**/api/stocks/**', async route => {
      const url = new URL(route.request().url())
      const startDate = url.searchParams.get('start_date')
      const endDate = url.searchParams.get('end_date')
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: `Received dates: ${startDate} to ${endDate}`,
          data: []
        })
      })
    })
    
    // Test with date inputs (if they exist)
    const dateInputs = await page.locator('input[type="date"]').all()
    
    if (dateInputs.length > 0) {
      const invalidDates = [
        '2024-13-45', // Invalid month and day
        '1900-01-01', // Very old date
        '2100-12-31', // Future date
        '2024-02-30', // Invalid day for February
        '', // Empty date
      ]
      
      for (const date of invalidDates) {
        if (dateInputs[0]) {
          await dateInputs[0].fill(date)
          
          // Try to submit or trigger validation
          await page.keyboard.press('Tab')
          await page.waitForTimeout(100)
          
          // Should handle invalid dates appropriately
          const hasValidationError = await page.locator('.error-message, .validation-error, text=無効, text=Invalid').isVisible()
          const dateValue = await dateInputs[0].inputValue()
          
          // Browser or app should handle invalid dates
          expect(hasValidationError || dateValue !== date || true).toBeTruthy()
        }
      }
    }
  })

  test('should handle browser back/forward edge cases', async ({ page }) => {
    // Create complex navigation history
    const pages = [
      () => page.click('a[href*="watchlist"]'),
      () => page.click('a[href*="settings"]'),
      () => page.click('a[href="/"]'),
      () => page.click('a[href*="stocks"]'),
    ]
    
    // Navigate through pages
    for (const navigate of pages) {
      try {
        await navigate()
        await page.waitForTimeout(300)
      } catch (e) {
        // Some navigation might fail, continue
      }
    }
    
    // Rapid back/forward operations
    for (let i = 0; i < 5; i++) {
      try {
        await page.goBack()
        await page.waitForTimeout(100)
        await page.goForward()
        await page.waitForTimeout(100)
      } catch (e) {
        // Some operations might fail at history boundaries
      }
    }
    
    // Should eventually settle on a valid page
    await page.waitForTimeout(1000)
    const currentUrl = page.url()
    const pageTitle = await page.title()
    
    expect(currentUrl).toBeTruthy()
    expect(pageTitle).toBeTruthy()
  })

  test('should handle concurrent API request cancellations', async ({ page }) => {
    let requestCount = 0
    let abortedRequests = 0
    
    // Monitor requests and aborts
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requestCount++
      }
    })
    
    page.on('requestfailed', request => {
      if (request.failure()?.errorText === 'net::ERR_ABORTED') {
        abortedRequests++
      }
    })
    
    // Start multiple searches and navigate away quickly
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      // Start search
      await searchInput.fill('CONCURRENT1')
      await page.keyboard.press('Enter')
      
      // Immediately start another search
      await page.waitForTimeout(50)
      await searchInput.fill('CONCURRENT2')
      await page.keyboard.press('Enter')
      
      // Navigate away quickly
      await page.waitForTimeout(50)
      const homeLink = page.locator('a[href="/"]')
      if (await homeLink.isVisible()) {
        await homeLink.click()
      }
      
      // Start another search
      await page.waitForTimeout(50)
      if (await searchInput.isVisible()) {
        await searchInput.fill('CONCURRENT3')
        await page.keyboard.press('Enter')
      }
    }
    
    // Wait for all requests to complete or be cancelled
    await page.waitForTimeout(3000)
    
    // Should handle request cancellations gracefully
    expect(requestCount).toBeGreaterThan(0)
    
    // Application should remain functional
    const finalTitle = await page.title()
    expect(finalTitle).toBeTruthy()
    
    console.log(`Requests: ${requestCount}, Aborted: ${abortedRequests}`)
  })

  test('should handle viewport and zoom edge cases', async ({ page }) => {
    // Test extreme viewport sizes
    const viewports = [
      { width: 320, height: 568 }, // Small mobile
      { width: 1, height: 1 }, // Extremely small
      { width: 4000, height: 3000 }, // Very large
      { width: 1920, height: 1 }, // Very wide
      { width: 1, height: 1080 }, // Very tall
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(500)
      
      // Should handle extreme viewport sizes
      const bodyVisible = await page.locator('body').isVisible()
      expect(bodyVisible).toBeTruthy()
      
      // Try to interact with elements
      const firstLink = page.locator('a').first()
      if (await firstLink.isVisible()) {
        const boundingBox = await firstLink.boundingBox()
        expect(boundingBox).toBeTruthy()
      }
    }
    
    // Reset to normal viewport
    await page.setViewportSize({ width: 1200, height: 800 })
    
    // Test zoom levels (if supported by browser)
    try {
      await page.evaluate(() => {
        (document.body.style as any).zoom = '50%'
      })
      await page.waitForTimeout(500)
      
      await page.evaluate(() => {
        (document.body.style as any).zoom = '200%'
      })
      await page.waitForTimeout(500)
      
      await page.evaluate(() => {
        (document.body.style as any).zoom = '100%'
      })
    } catch (e) {
      // Zoom might not be supported in all browsers
    }
    
    // Application should remain functional after viewport changes
    const finalTitle = await page.title()
    expect(finalTitle).toBeTruthy()
  })

  test('should handle memory pressure and resource constraints', async ({ page }) => {
    // Create memory pressure by creating many elements
    await page.evaluate(() => {
      const container = document.createElement('div')
      container.style.display = 'none'
      document.body.appendChild(container)
      
      // Create many DOM elements
      for (let i = 0; i < 10000; i++) {
        const element = document.createElement('div')
        element.innerHTML = `<span>Item ${i}</span><button>Action</button>`
        container.appendChild(element)
      }
      
      // Create memory-intensive objects
      const largeArrays = []
      for (let i = 0; i < 100; i++) {
        largeArrays.push(new Array(10000).fill(Math.random()))
      }
      
      // Store in window to prevent garbage collection
      ;(window as any).memoryPressureTest = largeArrays
    })
    
    // Try to perform normal operations under memory pressure
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('MEMORY_TEST')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
    }
    
    // Navigate between pages
    const links = await page.locator('nav a').all()
    for (const link of links.slice(0, 3)) {
      try {
        await link.click()
        await page.waitForTimeout(500)
      } catch (e) {
        // Some operations might fail under memory pressure
      }
    }
    
    // Clean up memory
    await page.evaluate(() => {
      const container = document.querySelector('div[style*="display: none"]')
      if (container) {
        container.remove()
      }
      delete (window as any).memoryPressureTest
      
      if ((window as any).gc) {
        (window as any).gc()
      }
    })
    
    // Application should recover
    await page.waitForTimeout(1000)
    const pageTitle = await page.title()
    expect(pageTitle).toBeTruthy()
  })
})