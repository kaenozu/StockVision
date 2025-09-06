/**
 * ThemeContext Test Suite - TDD Phase
 * 
 * This test MUST FAIL initially (RED phase) before implementation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from '@testing-library/react'

// Import components that DON'T EXIST yet (will cause test failures)
import { ThemeProvider, useTheme } from '../../src/contexts/ThemeContext'

// Test component to use the ThemeContext
const TestComponent = () => {
  const { theme, toggleTheme, systemPreference } = useTheme()
  
  return (
    <div data-testid="theme-test">
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="system-preference">{systemPreference}</span>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset matchMedia mock
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

  describe('Provider Initialization', () => {
    it('should provide default light theme when no saved preference', () => {
      const mockGetItem = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
      mockGetItem.mockRestore()
    })

    it('should load saved theme from localStorage', () => {
      const mockGetItem = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('dark')
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
      mockGetItem.mockRestore()
    })

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
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('system-preference')).toHaveTextContent('dark')
    })
  })

  describe('Theme Switching', () => {
    it('should toggle between light and dark themes', async () => {
      const mockGetItem = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('light')
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light')

      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-theme'))
      })

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
      mockGetItem.mockRestore()
    })

    it('should persist theme changes to localStorage', async () => {
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem')
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-theme'))
      })

      expect(mockSetItem).toHaveBeenCalledWith('theme', 'dark')
      mockSetItem.mockRestore()
    })

    it('should apply theme class to document.documentElement', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      // Initially light theme (no dark class)
      expect(document.documentElement.classList.contains('dark')).toBe(false)

      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-theme'))
      })

      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  describe('Context Error Handling', () => {
    it('should throw error when useTheme is used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useTheme must be used within a ThemeProvider')

      consoleSpy.mockRestore()
    })
  })
})