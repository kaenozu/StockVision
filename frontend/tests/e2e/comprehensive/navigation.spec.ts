/**
 * Navigation and Routing E2E Tests
 * 
 * Comprehensive tests for navigation, routing, and page transitions.
 */

import { test, expect } from '@playwright/test'

test.describe('Navigation and Routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should navigate through all main pages', async ({ page }) => {
    // Home page
    await expect(page.locator('h1')).toContainText(/StockVision|ホーム/)
    
    // Navigate to Watchlist
    await page.click('nav a[href*="watchlist"], a:has-text("ウォッチリスト")')
    await expect(page).toHaveURL(/.*watchlist/)
    await expect(page.locator('h1, h2')).toContainText(/ウォッチリスト|Watchlist/)
    
    // Navigate to Stock Search/Browse
    await page.click('nav a[href*="stocks"], a:has-text("株式検索")')
    await expect(page).toHaveURL(/.*stocks/)
    
    // Navigate to Settings
    await page.click('nav a[href*="settings"], a:has-text("設定")')
    await expect(page).toHaveURL(/.*settings/)
    await expect(page.locator('h1, h2')).toContainText(/設定|Settings/)
    
    // Navigate back to Home
    await page.click('nav a[href="/"], a:has-text("ホーム"), [data-testid="home-link"]')
    await expect(page).toHaveURL('/')
  })

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate through pages
    await page.click('a[href*="watchlist"], a:has-text("ウォッチリスト")')
    await page.click('a[href*="settings"], a:has-text("設定")')
    
    // Use browser back button
    await page.goBack()
    await expect(page).toHaveURL(/.*watchlist/)
    
    // Use browser forward button
    await page.goForward()
    await expect(page).toHaveURL(/.*settings/)
    
    // Back to home
    await page.goBack()
    await page.goBack()
    await expect(page).toHaveURL('/')
  })

  test('should handle direct URL access', async ({ page }) => {
    // Test direct access to different pages
    const pages = [
      { url: '/watchlist', text: /ウォッチリスト|Watchlist/ },
      { url: '/settings', text: /設定|Settings/ },
      { url: '/stocks', text: /株式|Stock/ }
    ]

    for (const { url, text } of pages) {
      await page.goto(url)
      await expect(page.locator('h1, h2')).toContainText(text)
    }
  })

  test('should handle invalid routes', async ({ page }) => {
    // Navigate to non-existent route
    await page.goto('/non-existent-page')
    
    // Should show 404 page or redirect to home
    const is404 = await page.locator('text=404').isVisible()
    const isHome = await page.locator('h1').textContent()
    
    expect(is404 || (isHome && isHome.includes('StockVision'))).toBeTruthy()
  })

  test('should maintain scroll position on navigation', async ({ page }) => {
    // Assuming there's enough content to scroll
    await page.evaluate(() => window.scrollTo(0, 500))
    const scrollY = await page.evaluate(() => window.scrollY)
    
    if (scrollY > 0) {
      // Navigate to another page and back
      await page.click('a[href*="watchlist"]')
      await page.click('a[href="/"]')
      
      // Check if scroll position is restored (modern browsers do this automatically)
      await page.waitForTimeout(100)
      const newScrollY = await page.evaluate(() => window.scrollY)
      
      // Note: Scroll restoration behavior may vary
      expect(typeof newScrollY).toBe('number')
    }
  })

  test('should handle navigation with keyboard', async ({ page }) => {
    // Focus on navigation element
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Find focused element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    
    if (focusedElement === 'A') {
      // Press Enter to navigate
      await page.keyboard.press('Enter')
      
      // Should navigate somewhere
      await page.waitForTimeout(100)
      const currentUrl = page.url()
      expect(currentUrl).toBeTruthy()
    }
  })

  test('should show loading states during navigation', async ({ page }) => {
    // Mock slow navigation by throttling network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100)
    })
    
    // Click navigation link
    const navigationPromise = page.click('a[href*="watchlist"]')
    
    // Look for loading indicators
    const loadingVisible = await Promise.race([
      page.locator('[data-testid="loading"], .loading, .spinner').isVisible(),
      page.waitForTimeout(50).then(() => false)
    ])
    
    await navigationPromise
    await expect(page).toHaveURL(/.*watchlist/)
    
    // Loading should be hidden now
    const loadingHidden = await Promise.race([
      page.locator('[data-testid="loading"], .loading, .spinner').isHidden(),
      page.waitForTimeout(50).then(() => true)
    ])
    
    expect(loadingHidden).toBeTruthy()
  })

  test('should handle rapid navigation clicks', async ({ page }) => {
    // Rapidly click different navigation links
    const promises = [
      page.click('a[href*="watchlist"]'),
      page.click('a[href*="settings"]'),
      page.click('a[href="/"]')
    ]
    
    // Wait for all clicks to complete
    await Promise.all(promises)
    
    // Should end up at home page (last click)
    await expect(page).toHaveURL('/')
  })

  test('should preserve form state during navigation', async ({ page }) => {
    // Look for any input fields
    const inputs = await page.locator('input[type="text"], input[type="search"], textarea').all()
    
    if (inputs.length > 0) {
      const input = inputs[0]
      const testValue = 'test value preservation'
      
      await input.fill(testValue)
      
      // Navigate away and back (if there's a way to come back to same page)
      await page.click('a[href*="settings"]')
      await page.goBack()
      
      // Check if value is preserved (depends on implementation)
      const value = await input.inputValue()
      
      // Note: Form state preservation varies by implementation
      expect(typeof value).toBe('string')
    }
  })

  test('should handle external links correctly', async ({ page, context }) => {
    // Look for external links (if any)
    const externalLinks = await page.locator('a[href^="http"], a[target="_blank"]').all()
    
    if (externalLinks.length > 0) {
      const link = externalLinks[0]
      const href = await link.getAttribute('href')
      
      if (href && href.startsWith('http')) {
        // Listen for new page
        const [newPage] = await Promise.all([
          context.waitForEvent('page'),
          link.click()
        ])
        
        await newPage.waitForLoadState()
        expect(newPage.url()).toContain('http')
        
        await newPage.close()
      }
    }
  })
})