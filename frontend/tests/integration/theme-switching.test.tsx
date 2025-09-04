import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import contexts that don't exist yet - this MUST fail
import { ThemeProvider } from '../../src/contexts/ThemeContext'
import { AccessibilityProvider } from '../../src/contexts/AccessibilityContext'

expect.extend(toHaveNoViolations)

// Test component that uses theme switching
const ThemeSwitchingApp = () => {
  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <div data-testid="app-container" className="min-h-screen transition-colors">
          <header data-testid="header" className="bg-white dark:bg-gray-900">
            <button data-testid="theme-toggle" className="theme-toggle">
              テーマ切り替え
            </button>
          </header>
          <main data-testid="main-content" className="p-4">
            <div data-testid="stock-card" className="bg-gray-50 dark:bg-gray-800">
              株式カード
            </div>
          </main>
        </div>
      </AccessibilityProvider>
    </ThemeProvider>
  )
}

describe('Theme Switching Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    
    // Reset system theme
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('should switch from light to dark theme', async () => {
    render(<ThemeSwitchingApp />)

    const container = screen.getByTestId('app-container')
    const themeToggle = screen.getByTestId('theme-toggle')

    // Initially light theme
    expect(container).toHaveClass('light')
    expect(container).not.toHaveClass('dark')

    // Switch to dark theme
    act(() => {
      fireEvent.click(themeToggle)
    })

    expect(container).toHaveClass('dark')
    expect(container).not.toHaveClass('light')
  })

  it('should persist theme preference to localStorage', async () => {
    render(<ThemeSwitchingApp />)

    const themeToggle = screen.getByTestId('theme-toggle')

    act(() => {
      fireEvent.click(themeToggle) // Switch to dark
    })

    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
  })

  it('should apply theme classes to all components', async () => {
    render(<ThemeSwitchingApp />)

    const header = screen.getByTestId('header')
    const stockCard = screen.getByTestId('stock-card')
    const themeToggle = screen.getByTestId('theme-toggle')

    // Switch to dark theme
    act(() => {
      fireEvent.click(themeToggle)
    })

    expect(header).toHaveClass('dark:bg-gray-900')
    expect(stockCard).toHaveClass('dark:bg-gray-800')
  })

  it('should respect system preference on initial load', async () => {
    // Mock dark system preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(<ThemeSwitchingApp />)

    const container = screen.getByTestId('app-container')
    expect(container).toHaveClass('dark')
  })

  it('should cycle through light → dark → system → light', async () => {
    render(<ThemeSwitchingApp />)

    const container = screen.getByTestId('app-container')
    const themeToggle = screen.getByTestId('theme-toggle')

    // Initial: light
    expect(container).toHaveClass('light')

    // First click: dark
    act(() => {
      fireEvent.click(themeToggle)
    })
    expect(container).toHaveClass('dark')

    // Second click: system
    act(() => {
      fireEvent.click(themeToggle)
    })
    expect(container).toHaveAttribute('data-theme', 'system')

    // Third click: back to light
    act(() => {
      fireEvent.click(themeToggle)
    })
    expect(container).toHaveClass('light')
  })

  it('should handle system theme changes when in system mode', async () => {
    let matchMediaCallback: ((e: any) => void) | null = null
    
    const mockAddEventListener = vi.fn((event, callback) => {
      if (event === 'change') {
        matchMediaCallback = callback
      }
    })

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: mockAddEventListener,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(<ThemeSwitchingApp />)

    const container = screen.getByTestId('app-container')
    const themeToggle = screen.getByTestId('theme-toggle')

    // Switch to system mode (two clicks: light → dark → system)
    act(() => {
      fireEvent.click(themeToggle)
      fireEvent.click(themeToggle)
    })

    expect(container).toHaveAttribute('data-theme', 'system')

    // Simulate system preference change to dark
    if (matchMediaCallback) {
      act(() => {
        matchMediaCallback({ matches: true })
      })
    }

    expect(container).toHaveClass('dark')
  })

  it('should maintain accessibility during theme transitions', async () => {
    const { container } = render(<ThemeSwitchingApp />)

    // Test initial accessibility
    const results1 = await axe(container)
    expect(results1).toHaveNoViolations()

    const themeToggle = screen.getByTestId('theme-toggle')

    // Switch theme and test again
    act(() => {
      fireEvent.click(themeToggle)
    })

    const results2 = await axe(container)
    expect(results2).toHaveNoViolations()
  })

  it('should work with keyboard navigation', async () => {
    render(<ThemeSwitchingApp />)

    const themeToggle = screen.getByTestId('theme-toggle')
    const container = screen.getByTestId('app-container')

    // Focus on theme toggle
    act(() => {
      themeToggle.focus()
    })

    expect(themeToggle).toHaveFocus()

    // Activate with Enter
    act(() => {
      fireEvent.keyDown(themeToggle, { key: 'Enter' })
    })

    expect(container).toHaveClass('dark')
  })

  it('should provide proper ARIA attributes', async () => {
    render(<ThemeSwitchingApp />)

    const themeToggle = screen.getByTestId('theme-toggle')

    expect(themeToggle).toHaveAttribute('aria-label', expect.stringContaining('テーマ'))
    expect(themeToggle).toHaveAttribute('role', 'switch')
  })

  it('should handle reduced motion during theme transitions', async () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return { matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }
        }
        return { matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }
      }),
    })

    render(<ThemeSwitchingApp />)

    const container = screen.getByTestId('app-container')
    expect(container).toHaveClass('motion-reduce:transition-none')
  })
})