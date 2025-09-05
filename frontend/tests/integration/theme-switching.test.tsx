/**
 * Theme Switching Integration Test Suite - TDD Phase
 * 
 * This test MUST FAIL initially (RED phase) before implementation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'

// Import components that DON'T EXIST yet (will cause test failures)
import { ThemeProvider } from '../../src/contexts/ThemeContext'
import { AccessibilityProvider } from '../../src/contexts/AccessibilityContext'
import { StockCard } from '../../src/components/StockCard'
import { PriceDisplay } from '../../src/components/enhanced/PriceDisplay'

const mockStock = {
  stock_code: '7203',
  company_name: 'トヨタ自動車',
  current_price: 2500,
  previous_close: 2450,
  price_change: 50,
  percentage_change: 2.04,
  volume: 15000000,
  updated_at: '2025-01-15T09:30:00Z'
}

// Test wrapper component that includes all providers
const TestApp = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AccessibilityProvider>
      {children}
    </AccessibilityProvider>
  </ThemeProvider>
)

describe('Theme Switching Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.className = ''
    
    // Mock matchMedia for system preference detection
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Theme Switching', () => {
    it('should start with light theme by default', () => {
      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('bg-white')
      expect(card).toHaveClass('text-secondary-900')
      expect(document.documentElement).not.toHaveClass('dark')
    })

    it('should switch to dark theme when toggle is clicked', async () => {
      render(
        <TestApp>
          <button data-testid="theme-toggle" onClick={() => {
            const themeContext = require('../../src/contexts/ThemeContext')
            themeContext.toggleTheme()
          }}>
            Toggle Theme
          </button>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      const toggleButton = screen.getByTestId('theme-toggle')
      
      await act(async () => {
        fireEvent.click(toggleButton)
      })

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('dark:bg-secondary-800')
      expect(card).toHaveClass('dark:text-white')
    })

    it('should switch back to light theme on second toggle', async () => {
      render(
        <TestApp>
          <button data-testid="theme-toggle" onClick={() => {
            const themeContext = require('../../src/contexts/ThemeContext')
            themeContext.toggleTheme()
          }}>
            Toggle Theme
          </button>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      const toggleButton = screen.getByTestId('theme-toggle')
      
      // First toggle to dark
      await act(async () => {
        fireEvent.click(toggleButton)
      })

      // Second toggle back to light
      await act(async () => {
        fireEvent.click(toggleButton)
      })

      await waitFor(() => {
        expect(document.documentElement).not.toHaveClass('dark')
      })

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('bg-white')
      expect(card).toHaveClass('text-secondary-900')
    })
  })

  describe('Theme Persistence', () => {
    it('should persist theme to localStorage', async () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem')

      render(
        <TestApp>
          <button data-testid="theme-toggle" onClick={() => {
            const themeContext = require('../../src/contexts/ThemeContext')
            themeContext.toggleTheme()
          }}>
            Toggle Theme
          </button>
        </TestApp>
      )

      const toggleButton = screen.getByTestId('theme-toggle')
      
      await act(async () => {
        fireEvent.click(toggleButton)
      })

      expect(setItemSpy).toHaveBeenCalledWith('theme', 'dark')
    })

    it('should load saved theme from localStorage on mount', () => {
      localStorage.setItem('theme', 'dark')

      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      expect(document.documentElement).toHaveClass('dark')
      
      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('dark:bg-secondary-800')
    })

    it('should clear localStorage when reset to default', async () => {
      const removeItemSpy = vi.spyOn(localStorage, 'removeItem')
      localStorage.setItem('theme', 'dark')

      render(
        <TestApp>
          <button data-testid="reset-theme" onClick={() => {
            const themeContext = require('../../src/contexts/ThemeContext')
            themeContext.resetTheme()
          }}>
            Reset Theme
          </button>
        </TestApp>
      )

      const resetButton = screen.getByTestId('reset-theme')
      
      await act(async () => {
        fireEvent.click(resetButton)
      })

      expect(removeItemSpy).toHaveBeenCalledWith('theme')
    })
  })

  describe('System Preference Detection', () => {
    it('should detect system dark mode preference', () => {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      expect(document.documentElement).toHaveClass('dark')
    })

    it('should respond to system preference changes', async () => {
      let mediaQueryCallback: ((e: MediaQueryListEvent) => void) | null = null
      
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn((cb) => { mediaQueryCallback = cb }),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event, cb) => { 
          if (event === 'change') mediaQueryCallback = cb 
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      // Simulate system theme change to dark
      await act(async () => {
        if (mediaQueryCallback) {
          const mockEvent = { matches: true } as MediaQueryListEvent
          mediaQueryCallback(mockEvent)
        }
      })

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })
    })

    it('should override system preference with user setting', async () => {
      // System prefers dark
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <TestApp>
          <button data-testid="theme-toggle" onClick={() => {
            const themeContext = require('../../src/contexts/ThemeContext')
            themeContext.setTheme('light')
          }}>
            Force Light
          </button>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      // Should start with system preference (dark)
      expect(document.documentElement).toHaveClass('dark')

      // User overrides to light
      const toggleButton = screen.getByTestId('theme-toggle')
      
      await act(async () => {
        fireEvent.click(toggleButton)
      })

      await waitFor(() => {
        expect(document.documentElement).not.toHaveClass('dark')
      })
    })
  })

  describe('Cross-Component Theme Integration', () => {
    it('should apply theme to all UI components consistently', () => {
      localStorage.setItem('theme', 'dark')

      render(
        <TestApp>
          <div data-testid="app-container">
            <StockCard stock={mockStock} />
            <PriceDisplay 
              currentPrice={mockStock.current_price}
              previousPrice={mockStock.previous_close}
              currency="JPY"
            />
          </div>
        </TestApp>
      )

      // Check StockCard theming
      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('dark:bg-secondary-800')
      expect(card).toHaveClass('dark:text-white')

      // Check PriceDisplay theming
      const priceContainer = screen.getByTestId('price-display-container')
      expect(priceContainer).toHaveClass('dark:text-white')
    })

    it('should handle theme transitions smoothly', async () => {
      render(
        <TestApp>
          <button data-testid="theme-toggle" onClick={() => {
            const themeContext = require('../../src/contexts/ThemeContext')
            themeContext.toggleTheme()
          }}>
            Toggle Theme
          </button>
          <StockCard stock={mockStock} />
          <PriceDisplay 
            currentPrice={mockStock.current_price}
            currency="JPY"
          />
        </TestApp>
      )

      const toggleButton = screen.getByTestId('theme-toggle')
      const card = screen.getByTestId('stock-card')
      const priceContainer = screen.getByTestId('price-display-container')

      // Check transition classes are applied
      expect(card).toHaveClass('transition-colors')
      expect(priceContainer).toHaveClass('transition-colors')

      await act(async () => {
        fireEvent.click(toggleButton)
      })

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
        expect(card).toHaveClass('dark:bg-secondary-800')
        expect(priceContainer).toHaveClass('dark:text-white')
      })
    })
  })

  describe('Theme with Accessibility Integration', () => {
    it('should work with high contrast mode', () => {
      localStorage.setItem('theme', 'dark')
      localStorage.setItem('accessibility-high-contrast', 'true')

      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('high-contrast')
      expect(card).toHaveClass('dark:bg-secondary-800')
    })

    it('should respect reduced motion in theme transitions', async () => {
      localStorage.setItem('accessibility-reduced-motion', 'true')

      render(
        <TestApp>
          <button data-testid="theme-toggle" onClick={() => {
            const themeContext = require('../../src/contexts/ThemeContext')
            themeContext.toggleTheme()
          }}>
            Toggle Theme
          </button>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      const toggleButton = screen.getByTestId('theme-toggle')
      const card = screen.getByTestId('stock-card')

      expect(card).toHaveClass('motion-reduce:transition-none')

      await act(async () => {
        fireEvent.click(toggleButton)
      })

      // Theme should still switch, but without animations
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })
    })
  })

  describe('Theme Keyboard Shortcuts', () => {
    it('should toggle theme with Ctrl+Shift+T', async () => {
      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      await act(async () => {
        fireEvent.keyDown(document, { 
          key: 'T', 
          ctrlKey: true, 
          shiftKey: true,
          code: 'KeyT'
        })
      })

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })
    })

    it('should handle keyboard shortcuts consistently', async () => {
      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      // First shortcut press
      await act(async () => {
        fireEvent.keyDown(document, { 
          key: 'T', 
          ctrlKey: true, 
          shiftKey: true 
        })
      })

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })

      // Second shortcut press
      await act(async () => {
        fireEvent.keyDown(document, { 
          key: 'T', 
          ctrlKey: true, 
          shiftKey: true 
        })
      })

      await waitFor(() => {
        expect(document.documentElement).not.toHaveClass('dark')
      })
    })
  })

  describe('Theme Error Handling', () => {
    it('should handle corrupted localStorage theme data', () => {
      localStorage.setItem('theme', 'invalid-theme')

      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      // Should fallback to system preference or light theme
      expect(document.documentElement).not.toHaveClass('dark')
    })

    it('should handle missing localStorage gracefully', () => {
      const originalLocalStorage = window.localStorage
      Object.defineProperty(window, 'localStorage', {
        value: null,
        writable: true
      })

      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      // Should work without localStorage
      const card = screen.getByTestId('stock-card')
      expect(card).toBeInTheDocument()

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      })
    })

    it('should handle theme context errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Component outside ThemeProvider should handle gracefully
      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })
})