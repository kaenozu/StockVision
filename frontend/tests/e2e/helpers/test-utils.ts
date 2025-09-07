/**
 * Test Utilities for E2E Tests
 * 
 * Reusable functions and helpers to optimize test execution speed.
 */

import { Page, expect, Locator } from '@playwright/test';

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Fast navigation with optimized waiting
   */
  async fastGoto(url: string, options: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' } = {}) {
    const { waitUntil = 'domcontentloaded' } = options;
    
    // Skip navigation if already on the target page
    if (this.page.url().includes(url)) {
      return;
    }
    
    await this.page.goto(url, { 
      waitUntil,
      timeout: 10000 
    });
  }

  /**
   * Smart element waiting with multiple selectors
   */
  async waitForAnyElement(selectors: string[], timeout: number = 5000): Promise<Locator | null> {
    try {
      const promises = selectors.map(selector => 
        this.page.locator(selector).first().waitFor({ timeout })
      );
      
      await Promise.race(promises);
      
      // Return the first visible element
      for (const selector of selectors) {
        const element = this.page.locator(selector).first();
        if (await element.isVisible()) {
          return element;
        }
      }
    } catch (error) {
      // No element found
    }
    
    return null;
  }

  /**
   * Fast element interaction with retry logic
   */
  async fastClick(selector: string, options: { timeout?: number, retries?: number } = {}): Promise<boolean> {
    const { timeout = 5000, retries = 2 } = options;
    
    for (let i = 0; i < retries; i++) {
      try {
        const element = this.page.locator(selector).first();
        await element.waitFor({ state: 'visible', timeout });
        
        // Ensure element is clickable
        if (await element.isEnabled()) {
          await element.click({ timeout: timeout / 2 });
          return true;
        }
      } catch (error) {
        if (i === retries - 1) {
          console.warn(`Failed to click ${selector} after ${retries} retries`);
        }
      }
    }
    
    return false;
  }

  /**
   * Fast form filling with validation
   */
  async fastFill(selector: string, value: string, options: { clear?: boolean } = {}): Promise<boolean> {
    const { clear = true } = options;
    
    try {
      const element = this.page.locator(selector).first();
      await element.waitFor({ state: 'visible', timeout: 5000 });
      
      if (clear) {
        await element.clear();
      }
      
      await element.fill(value);
      
      // Verify the value was set
      const currentValue = await element.inputValue();
      return currentValue === value;
    } catch (error) {
      console.warn(`Failed to fill ${selector} with value ${value}`);
      return false;
    }
  }

  /**
   * Batch element checks for faster assertions
   */
  async checkElements(elements: { selector: string; shouldExist: boolean }[]): Promise<{ [selector: string]: boolean }> {
    const results: { [selector: string]: boolean } = {};
    
    // Check all elements in parallel
    const checks = elements.map(async ({ selector, shouldExist }) => {
      try {
        const element = this.page.locator(selector).first();
        const exists = await element.isVisible({ timeout: 2000 });
        results[selector] = exists === shouldExist;
      } catch (error) {
        results[selector] = !shouldExist; // If we expect it not to exist, error is success
      }
    });
    
    await Promise.allSettled(checks);
    return results;
  }

  /**
   * Mock API responses for consistent test performance
   */
  async mockApiResponse(pattern: string, responseData: any, options: { status?: number; delay?: number } = {}) {
    const { status = 200, delay = 0 } = options;
    
    await this.page.route(pattern, async route => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }

  /**
   * Batch API mocking for test setup
   */
  async setupApiMocks(mocks: { pattern: string; data: any; options?: { status?: number; delay?: number } }[]) {
    const mockPromises = mocks.map(mock => 
      this.mockApiResponse(mock.pattern, mock.data, mock.options)
    );
    
    await Promise.all(mockPromises);
  }

  /**
   * Fast search operation with result validation
   */
  async performSearch(searchTerm: string, options: { 
    inputSelector?: string;
    submitMethod?: 'enter' | 'button';
    buttonSelector?: string;
    expectedResults?: boolean;
  } = {}) {
    const {
      inputSelector = 'input[type="search"]',
      submitMethod = 'enter',
      buttonSelector = 'button[type="submit"]',
      expectedResults = true
    } = options;

    // Find and fill search input
    const searchInput = await this.waitForAnyElement([
      inputSelector,
      'input[placeholder*="検索"]',
      'input[placeholder*="search"]',
      '[data-testid="search-input"]'
    ]);

    if (!searchInput) {
      return { success: false, message: 'Search input not found' };
    }

    await this.fastFill(inputSelector, searchTerm);

    // Submit search
    if (submitMethod === 'enter') {
      await this.page.keyboard.press('Enter');
    } else {
      await this.fastClick(buttonSelector);
    }

    // Wait for results or error message
    if (expectedResults) {
      const hasResults = await this.waitForAnyElement([
        '.search-results',
        '.stock-item',
        '.result-item',
        '[data-testid*="result"]'
      ]);

      return { 
        success: !!hasResults, 
        message: hasResults ? 'Results found' : 'No results found' 
      };
    }

    return { success: true, message: 'Search submitted' };
  }

  /**
   * Navigation helper with loading state handling
   */
  async navigateWithLoading(linkSelector: string, expectedUrl: string | RegExp) {
    // Click navigation link
    const clicked = await this.fastClick(linkSelector);
    if (!clicked) {
      return { success: false, message: `Failed to click ${linkSelector}` };
    }

    // Wait for navigation to complete
    try {
      await this.page.waitForURL(expectedUrl, { timeout: 10000 });
      
      // Wait for loading to finish
      const loadingElements = [
        '[data-testid="loading"]',
        '.loading',
        '.spinner'
      ];
      
      // Check if any loading elements are present and wait for them to disappear
      for (const selector of loadingElements) {
        const element = this.page.locator(selector);
        if (await element.isVisible()) {
          await element.waitFor({ state: 'hidden', timeout: 5000 });
        }
      }

      return { success: true, message: 'Navigation completed' };
    } catch (error) {
      return { success: false, message: `Navigation failed: ${error}` };
    }
  }

  /**
   * Form submission with validation
   */
  async submitFormWithValidation(formSelector: string, expectedOutcome: 'success' | 'error' = 'success') {
    const form = this.page.locator(formSelector);
    await form.waitFor({ state: 'visible', timeout: 5000 });
    
    // Find submit button
    const submitButton = await this.waitForAnyElement([
      `${formSelector} button[type="submit"]`,
      `${formSelector} input[type="submit"]`,
      `${formSelector} button:has-text("送信")`,
      `${formSelector} button:has-text("Submit")`,
      `${formSelector} button:has-text("保存")`,
      `${formSelector} button:has-text("Save")`
    ]);

    if (!submitButton) {
      return { success: false, message: 'Submit button not found' };
    }

    await submitButton.click();

    // Wait for response
    if (expectedOutcome === 'success') {
      const successIndicators = await this.waitForAnyElement([
        '.success-message',
        '.alert-success',
        'text=成功',
        'text=Success',
        'text=保存しました',
        'text=Saved'
      ]);

      return { 
        success: !!successIndicators, 
        message: successIndicators ? 'Form submitted successfully' : 'No success confirmation found' 
      };
    } else {
      const errorIndicators = await this.waitForAnyElement([
        '.error-message',
        '.alert-error',
        'text=エラー',
        'text=Error',
        'text=失敗',
        'text=Failed'
      ]);

      return { 
        success: !!errorIndicators, 
        message: errorIndicators ? 'Error displayed as expected' : 'No error message found' 
      };
    }
  }

  /**
   * Performance measurement helper
   */
  async measurePerformance<T>(operation: () => Promise<T>, label: string): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const duration = performance.now() - startTime;
    
    console.log(`Performance [${label}]: ${duration.toFixed(2)}ms`);
    
    return { result, duration };
  }

  /**
   * Cleanup helper for test isolation
   */
  async cleanup() {
    // Clear localStorage test data
    await this.page.evaluate(() => {
      const testKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('test-') || key.includes('mock') || key.includes('e2e')
      );
      testKeys.forEach(key => localStorage.removeItem(key));
    });

    // Clear any test cookies
    const context = this.page.context();
    await context.clearCookies();

    // Unroute all mocked routes
    await this.page.unrouteAll();
  }
}

/**
 * Common test data factory
 */
export class TestDataFactory {
  static generateStockData(count: number = 10) {
    return Array.from({ length: count }, (_, i) => ({
      stock_code: `${1000 + i}`,
      company_name: `Test Company ${i}`,
      current_price: Math.random() * 10000,
      price_change: Math.random() * 200 - 100,
      price_change_pct: Math.random() * 10 - 5,
      volume: Math.floor(Math.random() * 1000000),
      last_updated: new Date().toISOString()
    }));
  }

  static generateWatchlistData(count: number = 5) {
    return Array.from({ length: count }, (_, i) => ({
      stock_code: `${7000 + i}`,
      company_name: `Watchlist Company ${i}`,
      current_price: Math.random() * 5000,
      price_change: Math.random() * 100 - 50,
      price_change_pct: Math.random() * 5 - 2.5,
      added_date: new Date(Date.now() - i * 86400000).toISOString()
    }));
  }

  static generateApiErrorResponse(message: string = 'Test error') {
    return {
      error: message,
      code: 'TEST_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test assertions helpers
 */
export class TestAssertions {
  constructor(private page: Page) {}

  async expectElementToBeVisible(selector: string, timeout: number = 5000) {
    await expect(this.page.locator(selector)).toBeVisible({ timeout });
  }

  async expectElementToBeHidden(selector: string, timeout: number = 5000) {
    await expect(this.page.locator(selector)).toBeHidden({ timeout });
  }

  async expectTextToContain(selector: string, text: string, timeout: number = 5000) {
    await expect(this.page.locator(selector)).toContainText(text, { timeout });
  }

  async expectUrlToMatch(pattern: string | RegExp, timeout: number = 10000) {
    await expect(this.page).toHaveURL(pattern, { timeout });
  }

  async expectPerformance(operation: () => Promise<any>, maxDuration: number, label: string = 'operation') {
    const startTime = performance.now();
    await operation();
    const duration = performance.now() - startTime;
    
    expect(duration, `${label} should complete within ${maxDuration}ms`).toBeLessThan(maxDuration);
  }
}