import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import the context that doesn't exist yet - this MUST fail
import { ThemeContext, ThemeProvider } from '../../src/contexts/ThemeContext'
import { useContext } from 'react'

expect.extend(toHaveNoViolations)

// Test component to access ThemeContext
const TestComponent = () => {
  const context = useContext(ThemeContext)
  
  if (!context) {
    throw new Error('ThemeContext must be used within ThemeProvider')
  }
  
  const { theme, toggleTheme, systemPreference, isDark } = context
  
  return (
    <div data-testid="theme-test">
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="system-preference">{systemPreference}</div>
      <div data-testid="is-dark">{isDark.toString()}</div>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should provide default theme values', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    expect(screen.getByTestId('system-preference')).toHaveTextContent('light')
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false')
  })

  it('should toggle theme from light to dark', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const toggleButton = screen.getByTestId('toggle-theme')
    
    act(() => {
      fireEvent.click(toggleButton)
    })

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('is-dark')).toHaveTextContent('true')
  })

  it('should toggle theme from dark to system', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const toggleButton = screen.getByTestId('toggle-theme')
    
    // First click: light -> dark
    act(() => {
      fireEvent.click(toggleButton)
    })
    
    // Second click: dark -> system
    act(() => {
      fireEvent.click(toggleButton)
    })

    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
  })

  it('should toggle theme from system to light', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const toggleButton = screen.getByTestId('toggle-theme')
    
    // Cycle through: light -> dark -> system -> light
    act(() => {
      fireEvent.click(toggleButton) // dark
      fireEvent.click(toggleButton) // system
      fireEvent.click(toggleButton) // light
    })

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false')
  })

  it('should persist theme to localStorage', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem')
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const toggleButton = screen.getByTestId('toggle-theme')
    
    act(() => {
      fireEvent.click(toggleButton)
    })

    expect(setItemSpy).toHaveBeenCalledWith('theme', 'dark')
  })

  it('should load theme from localStorage on initialization', () => {
    localStorage.setItem('theme', 'dark')
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('is-dark')).toHaveTextContent('true')
  })

  it('should detect system theme preference', () => {
    // Mock dark mode preference
    const matchMediaSpy = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaSpy,
    })

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('system-preference')).toHaveTextContent('dark')
  })

  it('should update isDark based on system preference when theme is system', () => {
    // Mock dark mode system preference
    const matchMediaSpy = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaSpy,
    })

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const toggleButton = screen.getByTestId('toggle-theme')
    
    // Switch to system theme
    act(() => {
      fireEvent.click(toggleButton) // dark
      fireEvent.click(toggleButton) // system
    })

    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
    expect(screen.getByTestId('is-dark')).toHaveTextContent('true') // Should use system preference
  })

  it('should throw error when used outside ThemeProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('ThemeContext must be used within ThemeProvider')
    
    consoleSpy.mockRestore()
  })

  it('should be accessible with no axe violations', async () => {
    const { container } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})