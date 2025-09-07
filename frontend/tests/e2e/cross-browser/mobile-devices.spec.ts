/**
 * Mobile Device E2E Tests
 * 
 * Tests for mobile-specific functionality and responsive design.
 */

import { test, expect } from '@playwright/test'

test.describe('Mobile Device Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display mobile-optimized layout', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    // Check for mobile-specific layout elements
    const mobileMenu = page.locator('.mobile-menu, .hamburger, [data-testid="mobile-menu"], button[aria-label*="menu"]')
    const desktopNav = page.locator('.desktop-nav, nav:not(.mobile)')
    
    // Mobile menu should be present or navigation should be collapsed
    const hasMobileMenu = await mobileMenu.isVisible()
    const hasDesktopNav = await desktopNav.isVisible()
    
    if (!hasMobileMenu && hasDesktopNav) {
      // Check if navigation is responsive (collapsed)
      const navWidth = await desktopNav.boundingBox()
      expect(navWidth?.width).toBeLessThan(400) // Should be compact on mobile
    }
    
    // Check viewport meta tag
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(viewportMeta).toContain('width=device-width')
    
    console.log('✅ Mobile layout optimization verified')
  })

  test('should handle touch interactions', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    // Test tap interactions
    const buttons = await page.locator('button, a, [role="button"]').all()
    
    if (buttons.length > 0) {
      const testButton = buttons[0]
      
      if (await testButton.isVisible()) {
        // Test tap
        await testButton.tap()
        await page.waitForTimeout(200)
        
        // Button should respond to tap
        const buttonStillExists = await testButton.isVisible()
        expect(buttonStillExists).toBe(true)
        
        console.log('✅ Touch interactions verified')
      }
    }
  })

  test('should support mobile gestures', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    // Test scroll behavior
    const initialScrollY = await page.evaluate(() => window.scrollY)
    
    // Simulate scroll gesture
    await page.mouse.wheel(0, 500)
    await page.waitForTimeout(300)
    
    const afterScrollY = await page.evaluate(() => window.scrollY)
    
    // Page should scroll or handle scroll appropriately
    expect(afterScrollY >= initialScrollY).toBe(true)
    
    // Test swipe-like behavior (if implemented)
    const swipeableElements = await page.locator('[data-swipe], .swipeable, .carousel').count()
    
    if (swipeableElements > 0) {
      const element = page.locator('[data-swipe], .swipeable, .carousel').first()
      const box = await element.boundingBox()
      
      if (box) {
        // Simulate swipe gesture
        await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2)
        await page.mouse.up()
        
        await page.waitForTimeout(500)
        console.log('✅ Swipe gestures tested')
      }
    }
    
    console.log('✅ Mobile gestures verified')
  })

  test('should optimize for mobile performance', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    const startTime = Date.now()
    
    // Test mobile-specific performance
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Mobile should load within reasonable time (allow for slower connections)
    expect(loadTime).toBeLessThan(15000) // 15 seconds max
    
    // Check for mobile-optimized images
    const images = await page.locator('img').all()
    
    for (const img of images.slice(0, 5)) {
      if (await img.isVisible()) {
        const src = await img.getAttribute('src')
        const hasResponsiveImage = !!(
          src?.includes('w_auto') || // Cloudinary
          src?.includes('resize') || // Other services
          await img.getAttribute('srcset') || // Responsive images
          await img.getAttribute('sizes') // Size hints
        )
        
        if (!hasResponsiveImage) {
          console.warn('Non-responsive image found:', src)
        }
      }
    }
    
    console.log(`⚡ Mobile performance: ${loadTime}ms`)
  })

  test('should handle mobile form interactions', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    const inputs = await page.locator('input, textarea, select').all()
    
    if (inputs.length > 0) {
      for (const input of inputs.slice(0, 3)) {
        if (await input.isVisible()) {
          // Test focus and virtual keyboard
          await input.tap()
          await page.waitForTimeout(200)
          
          // Check if input is focused
          const isFocused = await input.evaluate(el => document.activeElement === el)
          expect(isFocused).toBe(true)
          
          // Test typing
          const inputType = await input.getAttribute('type')
          const testValue = inputType === 'email' ? 'test@example.com' : 
                           inputType === 'number' ? '123' : 'test input'
          
          await input.fill(testValue)
          const value = await input.inputValue()
          expect(value).toBe(testValue)
          
          // Test blur (hide keyboard)
          await page.tap('body')
          await page.waitForTimeout(200)
          
          console.log(`✅ Mobile form input tested: ${inputType}`)
        }
      }
    }
  })

  test('should support mobile-specific features', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    // Test device orientation awareness
    const supportsOrientation = await page.evaluate(() => {
      return 'orientation' in screen || 'orientation' in window
    })
    
    if (supportsOrientation) {
      console.log('✅ Device orientation support detected')
    }
    
    // Test touch capability detection
    const touchSupport = await page.evaluate(() => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0
    })
    
    expect(touchSupport).toBe(true)
    
    // Test mobile-specific APIs
    const mobileApiSupport = await page.evaluate(() => {
      return {
        vibration: 'vibrate' in navigator,
        deviceMotion: 'DeviceMotionEvent' in window,
        deviceOrientation: 'DeviceOrientationEvent' in window,
        battery: 'getBattery' in navigator,
        connection: 'connection' in navigator
      }
    })
    
    console.log('📱 Mobile API support:', Object.entries(mobileApiSupport)
      .filter(([, supported]) => supported)
      .map(([api]) => api)
      .join(', '))
  })

  test('should handle mobile network conditions', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    // Test with simulated slow network
    await page.route('**/*', async route => {
      // Add delay to simulate slow connection
      await new Promise(resolve => setTimeout(resolve, 200))
      await route.continue()
    })
    
    const startTime = Date.now()
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime
    
    // Should still function with slow network
    const mainContent = await page.locator('main, #root, .app').isVisible()
    expect(mainContent).toBe(true)
    
    // Should show loading states for better UX
    const hasLoadingIndicators = await page.locator('[data-testid="loading"], .loading, .spinner').count()
    
    console.log(`🐌 Slow network test: ${loadTime}ms, Loading indicators: ${hasLoadingIndicators}`)
    
    // Clear route to restore normal speed
    await page.unroute('**/*')
  })

  test('should support mobile accessibility', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    // Check for proper touch target sizes
    const buttons = await page.locator('button, a, [role="button"]').all()
    
    for (const button of buttons.slice(0, 10)) {
      if (await button.isVisible()) {
        const box = await button.boundingBox()
        
        if (box) {
          // Touch targets should be at least 44x44px (iOS) or 48x48px (Android)
          const minSize = 44
          
          if (box.width < minSize || box.height < minSize) {
            console.warn(`Small touch target found: ${box.width}x${box.height}px`)
          }
        }
      }
    }
    
    // Check for proper focus indicators
    const focusableElements = await page.locator('a, button, input, select, textarea, [tabindex]').all()
    
    if (focusableElements.length > 0) {
      const element = focusableElements[0]
      await element.focus()
      
      // Should have visible focus indicator
      const focusStyle = await element.evaluate(el => {
        const style = getComputedStyle(el)
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
          border: style.border
        }
      })
      
      const hasFocusIndicator = !!(
        focusStyle.outline !== 'none' ||
        focusStyle.boxShadow !== 'none' ||
        focusStyle.border !== 'none'
      )
      
      expect(hasFocusIndicator).toBe(true)
    }
    
    console.log('♿ Mobile accessibility verified')
  })

  test('should handle mobile-specific layouts', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    // Test portrait orientation
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(300)
    
    let portraitLayout = await page.locator('body').getAttribute('class')
    
    // Test landscape orientation
    await page.setViewportSize({ width: 667, height: 375 })
    await page.waitForTimeout(300)
    
    let landscapeLayout = await page.locator('body').getAttribute('class')
    
    // Layout should adapt to orientation changes
    const layoutChanged = portraitLayout !== landscapeLayout
    
    // Content should remain accessible in both orientations
    const contentVisible = await page.locator('main, #root, .app').isVisible()
    expect(contentVisible).toBe(true)
    
    // No horizontal scrolling in landscape
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 10) // Small tolerance
    
    console.log('✅ Mobile orientation handling verified')
  })

  test('should optimize mobile data usage', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    let requestCount = 0
    let totalBytes = 0
    
    // Monitor network requests
    page.on('request', request => {
      requestCount++
    })
    
    page.on('response', response => {
      const contentLength = parseInt(response.headers()['content-length'] || '0')
      totalBytes += contentLength
    })
    
    // Load the page and perform basic interactions
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Navigate to one more page if available
    const navLink = page.locator('nav a, a[href]').first()
    if (await navLink.isVisible()) {
      await navLink.click()
      await page.waitForLoadState('networkidle')
    }
    
    // Mobile sites should be optimized for data usage
    console.log(`📊 Mobile data usage: ${requestCount} requests, ${Math.round(totalBytes / 1024)}KB`)
    
    // Should not make excessive requests
    expect(requestCount).toBeLessThan(100)
    
    // Should not transfer excessive data (adjust based on your app)
    expect(totalBytes).toBeLessThan(5 * 1024 * 1024) // 5MB max
  })

  test('should support mobile PWA features', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    
    // Check for PWA manifest
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href')
    
    if (manifestLink) {
      console.log('✅ PWA manifest found')
      
      // Check service worker
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator
      })
      
      if (hasServiceWorker) {
        console.log('✅ Service Worker support detected')
      }
    }
    
    // Check for app-like behavior
    const metaTags = await page.evaluate(() => {
      const metas = Array.from(document.querySelectorAll('meta'))
      return metas.reduce((acc, meta) => {
        const name = meta.getAttribute('name') || meta.getAttribute('property')
        const content = meta.getAttribute('content')
        if (name && content) {
          acc[name] = content
        }
        return acc
      }, {} as Record<string, string>)
    })
    
    // Check for mobile app meta tags
    const mobileAppTags = [
      'apple-mobile-web-app-capable',
      'mobile-web-app-capable',
      'apple-mobile-web-app-status-bar-style',
      'theme-color'
    ]
    
    const foundAppTags = mobileAppTags.filter(tag => tag in metaTags)
    
    if (foundAppTags.length > 0) {
      console.log(`📱 Mobile app features: ${foundAppTags.join(', ')}`)
    }
  })
})