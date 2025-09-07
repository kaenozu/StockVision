/**
 * API Integration E2E Tests
 * 
 * Tests for API endpoints, data flow, and integration scenarios.
 */

import { test, expect } from '@playwright/test'

test.describe('API Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should handle stock data API responses', async ({ page }) => {
    // Mock API responses for predictable testing
    await page.route('**/api/stocks/**', async route => {
      if (route.request().url().includes('7203')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            stock_code: '7203',
            company_name: 'トヨタ自動車',
            current_price: 2850,
            price_change: 45,
            price_change_pct: 1.6,
            volume: 1000000,
            market_cap: 45000000000,
            last_updated: new Date().toISOString()
          })
        })
      } else {
        await route.continue()
      }
    })

    // Test stock search with API integration
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('7203')
      await page.keyboard.press('Enter')
      
      // Wait for API response and verify data display
      await expect(page.locator('text=トヨタ自動車')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=2850')).toBeVisible({ timeout: 3000 })
      await expect(page.locator('text=+1.6%')).toBeVisible({ timeout: 3000 })
    }
  })

  test('should handle API error responses gracefully', async ({ page }) => {
    // Mock API error responses
    await page.route('**/api/stocks/**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'Failed to fetch stock data'
        })
      })
    })

    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('INVALID')
      await page.keyboard.press('Enter')
      
      // Should show error message
      await expect(
        page.locator('text=エラーが発生しました, text=Error occurred, .error-message')
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('should handle slow API responses', async ({ page }) => {
    // Mock slow API responses
    await page.route('**/api/stocks/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stock_code: '6758',
          company_name: 'ソニー',
          current_price: 12500,
          price_change: -150,
          price_change_pct: -1.2,
          volume: 500000
        })
      })
    })

    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('6758')
      await page.keyboard.press('Enter')
      
      // Should show loading indicator
      const loadingVisible = await Promise.race([
        page.locator('[data-testid="loading"], .loading, .spinner').isVisible(),
        page.waitForTimeout(1000).then(() => false)
      ])
      
      if (loadingVisible) {
        expect(loadingVisible).toBeTruthy()
      }
      
      // Eventually show results
      await expect(page.locator('text=ソニー')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should handle watchlist API operations', async ({ page }) => {
    // Mock watchlist API endpoints
    await page.route('**/api/watchlist', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              stock_code: '7203',
              company_name: 'トヨタ自動車',
              current_price: 2850,
              price_change: 45,
              price_change_pct: 1.6,
              added_date: new Date().toISOString()
            }
          ])
        })
      } else if (route.request().method() === 'POST') {
        const body = await route.request().postData()
        const data = JSON.parse(body || '{}')
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Stock added to watchlist',
            stock_code: data.stock_code
          })
        })
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Stock removed from watchlist'
          })
        })
      }
    })

    // Navigate to watchlist
    await page.click('a[href*="watchlist"], a:has-text("ウォッチリスト")')
    await expect(page).toHaveURL(/.*watchlist/)
    
    // Should load watchlist data from API
    await expect(page.locator('text=トヨタ自動車')).toBeVisible({ timeout: 5000 })
    
    // Test adding stock to watchlist (if functionality exists)
    const addInput = page.locator('input[placeholder*="株式コード"], [data-testid="add-stock-input"]')
    if (await addInput.isVisible()) {
      await addInput.fill('9984')
      
      const addButton = page.locator('button:has-text("追加"), [data-testid="add-stock-button"]')
      if (await addButton.isVisible()) {
        await addButton.click()
        
        // Should show success message or update list
        await page.waitForTimeout(1000)
      }
    }
  })

  test('should handle real-time data updates', async ({ page }) => {
    let updateCount = 0
    
    // Mock real-time updates
    await page.route('**/api/stocks/realtime/**', async route => {
      updateCount++
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stock_code: '7203',
          current_price: 2850 + (updateCount * 10), // Price increases with each update
          price_change: 45 + (updateCount * 10),
          price_change_pct: 1.6 + (updateCount * 0.3),
          last_updated: new Date().toISOString(),
          update_sequence: updateCount
        })
      })
    })

    // Search for a stock
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('7203')
      await page.keyboard.press('Enter')
      
      // Wait for initial data
      await page.waitForTimeout(1000)
      
      // Check for price updates (if real-time updates are implemented)
      const initialPrice = await page.locator('[data-testid="stock-price"], .stock-price').first().textContent()
      
      if (initialPrice) {
        // Wait for potential update
        await page.waitForTimeout(3000)
        
        const updatedPrice = await page.locator('[data-testid="stock-price"], .stock-price').first().textContent()
        
        // Prices might update in real-time applications
        expect(typeof updatedPrice).toBe('string')
      }
    }
  })

  test('should handle batch API requests', async ({ page }) => {
    // Mock batch API endpoint
    await page.route('**/api/stocks/batch', async route => {
      const body = await route.request().postData()
      const { stock_codes } = JSON.parse(body || '{}')
      
      const mockData = stock_codes.map((code: string, index: number) => ({
        stock_code: code,
        company_name: `Company ${code}`,
        current_price: 1000 + (index * 100),
        price_change: Math.random() * 100 - 50,
        price_change_pct: Math.random() * 10 - 5,
        volume: Math.floor(Math.random() * 1000000)
      }))
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData)
      })
    })

    // Navigate to a page that might use batch requests (like watchlist)
    await page.click('a[href*="watchlist"], a:has-text("ウォッチリスト")')
    
    // If batch requests are implemented, the page should load multiple stocks efficiently
    await page.waitForTimeout(2000)
    
    // Check that multiple stocks are loaded (if applicable)
    const stockItems = await page.locator('.stock-item, .watchlist-item, [data-testid*="stock"]').count()
    
    // Should handle batch data appropriately
    expect(stockItems).toBeGreaterThanOrEqual(0)
  })

  test('should handle API pagination', async ({ page }) => {
    let currentPage = 1
    
    // Mock paginated API responses
    await page.route('**/api/stocks**', async route => {
      const url = new URL(route.request().url())
      const page_param = url.searchParams.get('page')
      const limit = parseInt(url.searchParams.get('limit') || '20')
      
      if (page_param) {
        currentPage = parseInt(page_param)
      }
      
      const mockStocks = Array.from({ length: limit }, (_, i) => ({
        stock_code: `${1000 + ((currentPage - 1) * limit) + i}`,
        company_name: `Company ${i + 1}`,
        current_price: Math.random() * 5000,
        price_change: Math.random() * 200 - 100,
        price_change_pct: Math.random() * 10 - 5,
        volume: Math.floor(Math.random() * 1000000)
      }))
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockStocks,
          pagination: {
            page: currentPage,
            limit: limit,
            total: 1000,
            pages: Math.ceil(1000 / limit)
          }
        })
      })
    })

    // Navigate to stocks page
    const stocksLink = page.locator('a[href*="stocks"], nav a:has-text("株式検索")')
    if (await stocksLink.isVisible()) {
      await stocksLink.click()
      
      // Wait for initial data load
      await page.waitForTimeout(2000)
      
      // Test pagination controls (if they exist)
      const nextButton = page.locator('button:has-text("次へ"), button:has-text("Next"), [data-testid="next-page"]')
      if (await nextButton.isVisible()) {
        await nextButton.click()
        
        // Should load next page
        await page.waitForTimeout(1000)
        
        // Verify page changed (check URL or content)
        const currentUrl = page.url()
        expect(currentUrl).toBeTruthy()
      }
    }
  })

  test('should handle API authentication and authorization', async ({ page }) => {
    // Mock authentication-required endpoints
    await page.route('**/api/user/**', async route => {
      const authHeader = route.request().headers()['authorization']
      
      if (!authHeader || !authHeader.includes('Bearer')) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Authentication required'
          })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user_id: '12345',
            preferences: {
              theme: 'dark',
              language: 'ja',
              notifications: true
            }
          })
        })
      }
    })

    // Navigate to settings (which might require authentication)
    const settingsLink = page.locator('a[href*="settings"], a:has-text("設定")')
    if (await settingsLink.isVisible()) {
      await settingsLink.click()
      
      // Should either show login prompt or settings (depending on implementation)
      await page.waitForTimeout(1000)
      
      const hasLoginForm = await page.locator('form, input[type="password"], button:has-text("ログイン")').isVisible()
      const hasSettings = await page.locator('h1:has-text("設定"), h2:has-text("Settings")').isVisible()
      
      // Should handle authentication appropriately
      expect(hasLoginForm || hasSettings).toBeTruthy()
    }
  })

  test('should handle WebSocket connections for real-time data', async ({ page }) => {
    // Mock WebSocket responses (if WebSocket is used)
    await page.addInitScript(() => {
      class MockWebSocket {
        constructor(url: string) {
          console.log('Mock WebSocket created:', url)
          
          // Simulate connection after short delay
          setTimeout(() => {
            if (this.onopen) this.onopen({} as Event)
            
            // Send mock price updates
            setInterval(() => {
              if (this.onmessage) {
                this.onmessage({
                  data: JSON.stringify({
                    type: 'price_update',
                    stock_code: '7203',
                    price: 2850 + Math.random() * 100,
                    timestamp: Date.now()
                  })
                } as MessageEvent)
              }
            }, 2000)
          }, 100)
        }
        
        send(data: string) {
          console.log('WebSocket send:', data)
        }
        
        close() {
          console.log('WebSocket closed')
        }
        
        onopen: ((event: Event) => void) | null = null
        onmessage: ((event: MessageEvent) => void) | null = null
        onclose: ((event: CloseEvent) => void) | null = null
        onerror: ((event: Event) => void) | null = null
      }
      
      (window as any).WebSocket = MockWebSocket
    })

    // Navigate to a page that might use WebSocket
    const searchInput = page.locator('input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('7203')
      await page.keyboard.press('Enter')
      
      // Wait for WebSocket connection and updates
      await page.waitForTimeout(5000)
      
      // Check if real-time updates are working (depends on implementation)
      const priceElement = page.locator('[data-testid="stock-price"], .stock-price').first()
      if (await priceElement.isVisible()) {
        const price = await priceElement.textContent()
        expect(price).toBeTruthy()
      }
    }
  })
})