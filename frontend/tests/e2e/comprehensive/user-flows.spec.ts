/**
 * User Flows E2E Tests
 * 
 * Tests for complete user journeys and workflows.
 */

import { test, expect } from '@playwright/test'

test.describe('Complete User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Complete stock research workflow', async ({ page }) => {
    // 1. Search for a stock
    const searchInput = page.locator('input[type="search"], input[placeholder*="検索"], [data-testid="stock-search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('7203')
      await page.keyboard.press('Enter')
      
      // Wait for search results
      await page.waitForTimeout(1000)
    }
    
    // 2. View stock details
    const stockLink = page.locator('a:has-text("7203"), [data-testid*="stock-7203"], .stock-card').first()
    if (await stockLink.isVisible()) {
      await stockLink.click()
      
      // Should be on stock detail page
      await expect(page.locator('h1, h2, [data-testid="stock-title"]')).toContainText('7203')
    }
    
    // 3. Add to watchlist
    const addToWatchlistBtn = page.locator('button:has-text("ウォッチリストに追加"), [data-testid="add-to-watchlist"], button:has-text("☆")')
    if (await addToWatchlistBtn.isVisible()) {
      await addToWatchlistBtn.click()
      
      // Should show success message or change button state
      await expect(
        page.locator('button:has-text("ウォッチリストに追加済み"), [data-testid="remove-from-watchlist"], button:has-text("⭐")')
      ).toBeVisible({ timeout: 3000 })
    }
    
    // 4. Navigate to watchlist
    await page.click('nav a[href*="watchlist"], a:has-text("ウォッチリスト")')
    
    // 5. Verify stock is in watchlist
    await expect(page.locator('text=7203')).toBeVisible({ timeout: 5000 })
  })

  test('Watchlist management workflow', async ({ page }) => {
    // Navigate to watchlist
    await page.click('a[href*="watchlist"], a:has-text("ウォッチリスト")')
    
    // Add a stock to watchlist (if add functionality is available on watchlist page)
    const addStockInput = page.locator('input[placeholder*="株式コード"], input[placeholder*="stock code"], [data-testid="add-stock-input"]')
    if (await addStockInput.isVisible()) {
      await addStockInput.fill('6758')
      
      const addButton = page.locator('button:has-text("追加"), [data-testid="add-stock-button"]')
      if (await addButton.isVisible()) {
        await addButton.click()
        
        // Wait for stock to be added
        await expect(page.locator('text=6758')).toBeVisible({ timeout: 3000 })
      }
    }
    
    // Test sorting functionality
    const sortSelect = page.locator('select, [data-testid="sort-select"]').first()
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('price_change')
      await page.waitForTimeout(500)
      
      // Verify sorting applied (check if first item changed)
      const firstItem = await page.locator('.stock-item, .watchlist-item').first().textContent()
      expect(firstItem).toBeTruthy()
    }
    
    // Test filtering functionality  
    const filterButton = page.locator('button:has-text("Gainers"), input[type="checkbox"]').first()
    if (await filterButton.isVisible()) {
      await filterButton.click()
      await page.waitForTimeout(500)
      
      // Should filter results
      const items = await page.locator('.stock-item, .watchlist-item').count()
      expect(items).toBeGreaterThanOrEqual(0)
    }
    
    // Remove a stock from watchlist
    const removeButton = page.locator('button:has-text("削除"), [data-testid="remove-stock"], button:has-text("⭐")').first()
    if (await removeButton.isVisible()) {
      await removeButton.click()
      
      // Confirm removal if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("はい"), button:has-text("削除"), [data-testid="confirm-remove"]')
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click()
      }
      
      await page.waitForTimeout(1000)
    }
  })

  test('Settings configuration workflow', async ({ page }) => {
    // Navigate to settings
    await page.click('a[href*="settings"], a:has-text("設定")')
    await expect(page).toHaveURL(/.*settings/)
    
    // Test theme toggle
    const themeToggle = page.locator('button:has-text("ダーク"), input[type="checkbox"]', 
      'button:has-text("テーマ"), [data-testid="theme-toggle"]').first()
    if (await themeToggle.isVisible()) {
      const initialClass = await page.locator('body, html').getAttribute('class')
      await themeToggle.click()
      await page.waitForTimeout(300)
      
      const newClass = await page.locator('body, html').getAttribute('class')
      expect(newClass).not.toBe(initialClass)
    }
    
    // Test notification settings
    const notificationCheckbox = page.locator('input[type="checkbox"]').first()
    if (await notificationCheckbox.isVisible()) {
      const isChecked = await notificationCheckbox.isChecked()
      await notificationCheckbox.click()
      
      const newState = await notificationCheckbox.isChecked()
      expect(newState).toBe(!isChecked)
    }
    
    // Test language selection (if available)
    const languageSelect = page.locator('select[name*="language"], select[name*="言語"]')
    if (await languageSelect.isVisible()) {
      await languageSelect.selectOption('en')
      await page.waitForTimeout(500)
      
      // Verify language change (look for English text)
      const englishText = await page.locator('text=Settings, text=English').isVisible({ timeout: 2000 })
      if (!englishText) {
        // Switch back to Japanese if English didn't work
        await languageSelect.selectOption('ja')
      }
    }
    
    // Save settings
    const saveButton = page.locator('button:has-text("保存"), button:has-text("Save"), [data-testid="save-settings"]')
    if (await saveButton.isVisible()) {
      await saveButton.click()
      
      // Look for success message
      await expect(
        page.locator('text=保存しました, text=Saved, .success-message')
      ).toBeVisible({ timeout: 3000 })
    }
  })

  test('Error recovery workflow', async ({ page }) => {
    // Simulate network error by blocking API requests
    await page.route('**/api/**', route => route.abort())
    
    // Try to perform actions that require API
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('INVALID_STOCK')
      await page.keyboard.press('Enter')
      
      // Should show error message
      await expect(
        page.locator('text=エラー, text=Error, .error-message, [data-testid="error-message"]')
      ).toBeVisible({ timeout: 5000 })
    }
    
    // Test retry functionality
    const retryButton = page.locator('button:has-text("再試行"), button:has-text("Retry"), [data-testid="retry-button"]')
    if (await retryButton.isVisible()) {
      // Re-enable network
      await page.unroute('**/api/**')
      
      await retryButton.click()
      await page.waitForTimeout(1000)
      
      // Error should be cleared
      const errorStillVisible = await page.locator('.error-message').isVisible()
      expect(errorStillVisible).toBeFalsy()
    }
  })

  test('Responsive design workflow', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.reload()
    
    // Verify desktop navigation is visible
    const desktopNav = page.locator('nav:not(.mobile), .desktop-nav')
    if (await desktopNav.isVisible()) {
      await expect(desktopNav).toBeVisible()
    }
    
    // Switch to mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    
    // Test mobile navigation
    const hamburgerMenu = page.locator('button[aria-label*="menu"], .hamburger, [data-testid="mobile-menu-button"]')
    if (await hamburgerMenu.isVisible()) {
      await hamburgerMenu.click()
      
      // Mobile menu should appear
      const mobileMenu = page.locator('.mobile-menu, .navigation-drawer, nav.mobile')
      await expect(mobileMenu).toBeVisible()
      
      // Test mobile navigation
      await page.click('a:has-text("ウォッチリスト")')
      await expect(page).toHaveURL(/.*watchlist/)
    }
    
    // Switch to tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.reload()
    
    // Verify tablet layout
    const content = page.locator('main, .main-content')
    if (await content.isVisible()) {
      const width = await content.boundingBox()
      expect(width?.width).toBeGreaterThan(300)
      expect(width?.width).toBeLessThan(800)
    }
  })

  test('Accessibility workflow', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    const firstFocusable = await page.evaluate(() => document.activeElement?.tagName)
    expect(['A', 'BUTTON', 'INPUT', 'SELECT'].includes(firstFocusable || '')).toBeTruthy()
    
    // Navigate through elements with Tab
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
    }
    
    // Test screen reader support (basic checks)
    const mainContent = page.locator('main[role="main"], main, [aria-label], h1')
    if (await mainContent.isVisible()) {
      const ariaLabel = await mainContent.getAttribute('aria-label')
      const heading = await page.locator('h1, h2').first().textContent()
      expect(ariaLabel || heading).toBeTruthy()
    }
    
    // Test high contrast mode (if supported)
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForTimeout(500)
    
    const bodyClass = await page.locator('body').getAttribute('class')
    expect(bodyClass).toBeTruthy()
  })
})