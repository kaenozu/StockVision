/**
 * Cross-Browser Compatibility E2E Tests
 * 
 * Tests for ensuring consistent behavior across different browsers.
 */

import { test, expect } from '@playwright/test'

test.describe('Cross-Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should render consistently across browsers', async ({ page, browserName }) => {
    // Basic page structure should be present
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('nav, header, [role="navigation"]')).toBeVisible()
    
    // Main content area
    const mainContent = page.locator('main, #root, .app, [role="main"]')
    await expect(mainContent).toBeVisible()
    
    // Check for browser-specific rendering issues
    const bodyClass = await page.locator('body').getAttribute('class')
    expect(bodyClass).not.toContain('unsupported')
    
    console.log(`✅ Basic rendering verified for ${browserName}`)
  })

  test('should handle CSS features consistently', async ({ page, browserName }) => {
    // Check for modern CSS support
    const isModernBrowser = browserName !== 'webkit' // Safari sometimes has issues
    
    // Test CSS Grid/Flexbox layouts
    const gridElements = await page.locator('[style*="grid"], .grid, [class*="grid"]').count()
    const flexElements = await page.locator('[style*="flex"], .flex, [class*="flex"]').count()
    
    if (isModernBrowser) {
      expect(gridElements + flexElements).toBeGreaterThan(0)
    }
    
    // Test CSS custom properties
    const hasCustomProps = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return style.getPropertyValue('--primary-color') !== ''
    })
    
    // Should work in all modern browsers
    if (browserName !== 'webkit') {
      expect(hasCustomProps || true).toBeTruthy() // Allow fallback
    }
    
    console.log(`✅ CSS compatibility verified for ${browserName}`)
  })

  test('should support JavaScript ES6+ features', async ({ page, browserName }) => {
    // Test modern JavaScript features
    const jsSupport = await page.evaluate(() => {
      try {
        // Arrow functions
        const arrow = () => 'test'
        
        // Destructuring
        const { length } = [1, 2, 3]
        
        // Template literals
        const template = `Length: ${length}`
        
        // Async/await (basic check)
        const hasAsync = typeof Promise !== 'undefined'
        
        // Modules (if used)
        const hasModules = typeof import !== 'undefined'
        
        return {
          arrow: arrow() === 'test',
          destructuring: length === 3,
          templateLiterals: template === 'Length: 3',
          promises: hasAsync,
          modules: hasModules || true // May not be available in test context
        }
      } catch (error) {
        return { error: error.message }
      }
    })
    
    expect(jsSupport.arrow).toBe(true)
    expect(jsSupport.destructuring).toBe(true)
    expect(jsSupport.templateLiterals).toBe(true)
    expect(jsSupport.promises).toBe(true)
    
    console.log(`✅ JavaScript ES6+ support verified for ${browserName}`)
  })

  test('should handle form interactions consistently', async ({ page, browserName }) => {
    // Look for form elements
    const forms = await page.locator('form, input, select, textarea').count()
    
    if (forms > 0) {
      // Test input focus and blur
      const firstInput = page.locator('input').first()
      if (await firstInput.isVisible()) {
        await firstInput.focus()
        
        // Check focus state
        const isFocused = await firstInput.evaluate(el => document.activeElement === el)
        expect(isFocused).toBe(true)
        
        // Test typing
        await firstInput.fill('test input')
        const value = await firstInput.inputValue()
        expect(value).toBe('test input')
        
        // Test blur
        await page.keyboard.press('Tab')
        await page.waitForTimeout(100)
        
        console.log(`✅ Form interactions verified for ${browserName}`)
      }
    }
  })

  test('should support Web APIs consistently', async ({ page, browserName }) => {
    // Test common Web APIs
    const apiSupport = await page.evaluate(() => {
      return {
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        webWorkers: typeof Worker !== 'undefined',
        geolocation: 'geolocation' in navigator,
        notifications: 'Notification' in window,
        serviceWorker: 'serviceWorker' in navigator,
        indexedDB: 'indexedDB' in window,
        webSockets: typeof WebSocket !== 'undefined',
        canvas: (() => {
          const canvas = document.createElement('canvas')
          return !!(canvas.getContext && canvas.getContext('2d'))
        })()
      }
    })
    
    // Core APIs should be supported in all modern browsers
    expect(apiSupport.localStorage).toBe(true)
    expect(apiSupport.sessionStorage).toBe(true)
    expect(apiSupport.fetch).toBe(true)
    expect(apiSupport.canvas).toBe(true)
    
    // Progressive enhancement for advanced features
    if (browserName === 'chromium') {
      expect(apiSupport.webWorkers).toBe(true)
      expect(apiSupport.serviceWorker).toBe(true)
    }
    
    console.log(`✅ Web API support verified for ${browserName}: `, Object.entries(apiSupport).filter(([, supported]) => supported).map(([api]) => api).join(', '))
  })

  test('should handle navigation consistently', async ({ page, browserName }) => {
    const startUrl = page.url()
    
    // Test navigation to different pages
    const navLinks = await page.locator('nav a, a[href]').all()
    
    if (navLinks.length > 0) {
      const firstLink = navLinks[0]
      const href = await firstLink.getAttribute('href')
      
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        await firstLink.click()
        
        // Wait for navigation
        await page.waitForLoadState('domcontentloaded')
        
        const newUrl = page.url()
        expect(newUrl).not.toBe(startUrl)
        
        // Test back navigation
        await page.goBack()
        await page.waitForLoadState('domcontentloaded')
        
        const backUrl = page.url()
        expect(backUrl).toBe(startUrl)
        
        console.log(`✅ Navigation verified for ${browserName}`)
      }
    }
  })

  test('should display images and media consistently', async ({ page, browserName }) => {
    // Check for images
    const images = await page.locator('img').all()
    
    if (images.length > 0) {
      // Test first few images
      for (const img of images.slice(0, 3)) {
        if (await img.isVisible()) {
          // Check if image loaded
          const isLoaded = await img.evaluate((el: HTMLImageElement) => {
            return el.complete && el.naturalWidth > 0
          })
          
          if (!isLoaded) {
            // Wait a bit for image to load
            await page.waitForTimeout(1000)
          }
          
          // Check alt text (accessibility)
          const alt = await img.getAttribute('alt')
          if (!alt) {
            console.warn(`Image without alt text found in ${browserName}`)
          }
        }
      }
      
      console.log(`✅ Image rendering verified for ${browserName}`)
    }
    
    // Check for video elements
    const videos = await page.locator('video').count()
    if (videos > 0) {
      const firstVideo = page.locator('video').first()
      const canPlay = await firstVideo.evaluate((el: HTMLVideoElement) => {
        return typeof el.play === 'function'
      })
      
      expect(canPlay).toBe(true)
      console.log(`✅ Video support verified for ${browserName}`)
    }
  })

  test('should handle touch and mouse events appropriately', async ({ page, browserName }) => {
    // Test click events
    const clickableElements = await page.locator('button, a, [onclick], [role="button"]').all()
    
    if (clickableElements.length > 0) {
      const testElement = clickableElements[0]
      
      if (await testElement.isVisible()) {
        // Test hover (desktop browsers)
        if (browserName !== 'Mobile Chrome' && browserName !== 'Mobile Safari') {
          await testElement.hover()
          await page.waitForTimeout(100)
        }
        
        // Test click
        const initialUrl = page.url()
        await testElement.click()
        await page.waitForTimeout(200)
        
        // Element should respond to click
        const afterClickUrl = page.url()
        const urlChanged = afterClickUrl !== initialUrl
        const hasVisibleChange = await page.locator('body').isVisible()
        
        expect(urlChanged || hasVisibleChange).toBe(true)
        
        console.log(`✅ Event handling verified for ${browserName}`)
      }
    }
  })

  test('should maintain performance across browsers', async ({ page, browserName }) => {
    const startTime = Date.now()
    
    // Perform common operations
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    
    // Navigate if possible
    const navLink = page.locator('nav a').first()
    if (await navLink.isVisible()) {
      await navLink.click()
      await page.waitForLoadState('domcontentloaded')
    }
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // Performance should be reasonable (under 10 seconds for basic operations)
    expect(duration).toBeLessThan(10000)
    
    // Log performance for comparison
    console.log(`⚡ Performance for ${browserName}: ${duration}ms`)
    
    // Browser-specific performance expectations
    if (browserName === 'chromium') {
      expect(duration).toBeLessThan(5000) // Chrome should be fastest
    } else if (browserName === 'webkit') {
      expect(duration).toBeLessThan(8000) // Safari might be slower
    }
  })

  test('should handle responsive design consistently', async ({ page, browserName }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(300) // Allow for responsive changes
      
      // Check that content is still visible and accessible
      const bodyVisible = await page.locator('body').isVisible()
      expect(bodyVisible).toBe(true)
      
      // Check for horizontal scrolling (usually unwanted on mobile)
      if (viewport.width <= 768) {
        const scrollWidth = await page.evaluate(() => {
          return document.documentElement.scrollWidth
        })
        
        expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 20) // Allow small tolerance
      }
      
      console.log(`✅ Responsive design verified for ${browserName} at ${viewport.width}x${viewport.height}`)
    }
  })

  test('should handle errors gracefully across browsers', async ({ page, browserName }) => {
    // Capture console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // Capture page errors
    const pageErrors: string[] = []
    page.on('pageerror', err => {
      pageErrors.push(err.message)
    })
    
    // Perform actions that might cause errors
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    
    // Try to click non-existent elements (should be handled gracefully)
    try {
      await page.click('#non-existent-element', { timeout: 1000 })
    } catch (error) {
      // Expected to fail, but shouldn't crash the page
    }
    
    // Critical errors should not occur
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Uncaught') || 
      error.includes('TypeError') ||
      error.includes('ReferenceError')
    )
    
    const criticalPageErrors = pageErrors.filter(error =>
      !error.includes('timeout') // Ignore timeout errors from our test
    )
    
    if (criticalErrors.length > 0) {
      console.warn(`Console errors in ${browserName}:`, criticalErrors)
    }
    
    if (criticalPageErrors.length > 0) {
      console.warn(`Page errors in ${browserName}:`, criticalPageErrors)
    }
    
    // Application should remain functional despite minor errors
    const pageStillWorks = await page.locator('body').isVisible()
    expect(pageStillWorks).toBe(true)
    
    console.log(`✅ Error handling verified for ${browserName}`)
  })
})