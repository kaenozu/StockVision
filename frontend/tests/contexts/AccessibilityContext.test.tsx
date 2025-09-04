import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import the context that doesn't exist yet - this MUST fail
import { AccessibilityContext, AccessibilityProvider } from '../../src/contexts/AccessibilityContext'
import { useContext } from 'react'

expect.extend(toHaveNoViolations)

// Test component to access AccessibilityContext
const TestComponent = () => {
  const context = useContext(AccessibilityContext)
  
  if (!context) {
    throw new Error('AccessibilityContext must be used within AccessibilityProvider')
  }
  
  const { 
    highContrast, 
    reduceMotion, 
    keyboardNavigation, 
    screenReaderActive,
    setHighContrast,
    setReduceMotion
  } = context
  
  return (
    <div data-testid="accessibility-test">
      <div data-testid="high-contrast">{highContrast.toString()}</div>
      <div data-testid="reduce-motion">{reduceMotion.toString()}</div>
      <div data-testid="keyboard-navigation">{keyboardNavigation.toString()}</div>
      <div data-testid="screen-reader-active">{screenReaderActive.toString()}</div>
      <button 
        data-testid="toggle-high-contrast" 
        onClick={() => setHighContrast(!highContrast)}
      >
        Toggle High Contrast
      </button>
      <button 
        data-testid="toggle-reduce-motion" 
        onClick={() => setReduceMotion(!reduceMotion)}
      >
        Toggle Reduce Motion
      </button>
    </div>
  )
}

describe('AccessibilityContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    
    // Reset media queries
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
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

  it('should provide default accessibility values', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    expect(screen.getByTestId('high-contrast')).toHaveTextContent('false')
    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('false')
    expect(screen.getByTestId('keyboard-navigation')).toHaveTextContent('false')
    expect(screen.getByTestId('screen-reader-active')).toHaveTextContent('false')
  })

  it('should toggle high contrast mode', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    const toggleButton = screen.getByTestId('toggle-high-contrast')
    
    act(() => {
      fireEvent.click(toggleButton)
    })

    expect(screen.getByTestId('high-contrast')).toHaveTextContent('true')
  })

  it('should toggle reduce motion preference', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    const toggleButton = screen.getByTestId('toggle-reduce-motion')
    
    act(() => {
      fireEvent.click(toggleButton)
    })

    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('true')
  })

  it('should detect system prefers-reduced-motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('true')
  })

  it('should detect system prefers-contrast', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    expect(screen.getByTestId('high-contrast')).toHaveTextContent('true')
  })

  it('should persist accessibility settings to localStorage', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem')
    
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    const toggleButton = screen.getByTestId('toggle-high-contrast')
    
    act(() => {
      fireEvent.click(toggleButton)
    })

    expect(setItemSpy).toHaveBeenCalledWith('accessibility-settings', 
      expect.stringContaining('"highContrast":true'))
  })

  it('should load accessibility settings from localStorage', () => {
    localStorage.setItem('accessibility-settings', JSON.stringify({
      highContrast: true,
      reduceMotion: true
    }))
    
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    expect(screen.getByTestId('high-contrast')).toHaveTextContent('true')
    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('true')
  })

  it('should detect keyboard navigation activation', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    // Simulate tab key press to activate keyboard navigation
    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' })
    })

    expect(screen.getByTestId('keyboard-navigation')).toHaveTextContent('true')
  })

  it('should detect screen reader activity', () => {
    // Mock screen reader detection
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'NVDA'
    })
    
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    expect(screen.getByTestId('screen-reader-active')).toHaveTextContent('true')
  })

  it('should handle focus management for keyboard users', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    const button = screen.getByTestId('toggle-high-contrast')

    // Simulate keyboard focus
    act(() => {
      fireEvent.keyDown(document, { key: 'Tab' })
      button.focus()
    })

    expect(document.activeElement).toBe(button)
    expect(screen.getByTestId('keyboard-navigation')).toHaveTextContent('true')
  })

  it('should respond to system preference changes', () => {
    const mockAddEventListener = vi.fn()
    const mockRemoveEventListener = vi.fn()
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
        dispatchEvent: vi.fn(),
      })),
    })

    const { unmount } = render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    expect(mockAddEventListener).toHaveBeenCalled()
    
    unmount()
    expect(mockRemoveEventListener).toHaveBeenCalled()
  })

  it('should override system preferences with user settings', () => {
    // System prefers reduced motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    // Initially uses system preference
    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('true')

    // User overrides to disable
    const toggleButton = screen.getByTestId('toggle-reduce-motion')
    
    act(() => {
      fireEvent.click(toggleButton)
    })

    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('false')
  })

  it('should throw error when used outside AccessibilityProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('AccessibilityContext must be used within AccessibilityProvider')
    
    consoleSpy.mockRestore()
  })

  it('should be accessible with no axe violations', async () => {
    const { container } = render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})