import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import the context that doesn't exist yet - this MUST fail
import { ResponsiveContext, ResponsiveProvider } from '../../src/contexts/ResponsiveContext'
import { useContext } from 'react'

expect.extend(toHaveNoViolations)

// Test component to access ResponsiveContext
const TestComponent = () => {
  const context = useContext(ResponsiveContext)
  
  if (!context) {
    throw new Error('ResponsiveContext must be used within ResponsiveProvider')
  }
  
  const { breakpoint, isMobile, isTablet, isDesktop, width } = context
  
  return (
    <div data-testid="responsive-test">
      <div data-testid="breakpoint">{breakpoint}</div>
      <div data-testid="is-mobile">{isMobile.toString()}</div>
      <div data-testid="is-tablet">{isTablet.toString()}</div>
      <div data-testid="is-desktop">{isDesktop.toString()}</div>
      <div data-testid="width">{width}</div>
    </div>
  )
}

describe('ResponsiveContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset viewport size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    })
  })

  it('should provide default responsive values for desktop', () => {
    render(
      <ResponsiveProvider>
        <TestComponent />
      </ResponsiveProvider>
    )

    expect(screen.getByTestId('breakpoint')).toHaveTextContent('lg')
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('false')
    expect(screen.getByTestId('is-tablet')).toHaveTextContent('false')
    expect(screen.getByTestId('is-desktop')).toHaveTextContent('true')
    expect(screen.getByTestId('width')).toHaveTextContent('1024')
  })

  it('should detect mobile breakpoint (xs)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320,
    })

    render(
      <ResponsiveProvider>
        <TestComponent />
      </ResponsiveProvider>
    )

    expect(screen.getByTestId('breakpoint')).toHaveTextContent('xs')
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('true')
    expect(screen.getByTestId('is-tablet')).toHaveTextContent('false')
    expect(screen.getByTestId('is-desktop')).toHaveTextContent('false')
  })

  it('should detect small mobile breakpoint (sm)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 480,
    })

    render(
      <ResponsiveProvider>
        <TestComponent />
      </ResponsiveProvider>
    )

    expect(screen.getByTestId('breakpoint')).toHaveTextContent('sm')
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('true')
  })

  it('should detect tablet breakpoint (md)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    })

    render(
      <ResponsiveProvider>
        <TestComponent />
      </ResponsiveProvider>
    )

    expect(screen.getByTestId('breakpoint')).toHaveTextContent('md')
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('false')
    expect(screen.getByTestId('is-tablet')).toHaveTextContent('true')
    expect(screen.getByTestId('is-desktop')).toHaveTextContent('false')
  })

  it('should detect large desktop breakpoint (xl)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    })

    render(
      <ResponsiveProvider>
        <TestComponent />
      </ResponsiveProvider>
    )

    expect(screen.getByTestId('breakpoint')).toHaveTextContent('xl')
    expect(screen.getByTestId('is-desktop')).toHaveTextContent('true')
  })

  it('should detect extra large desktop breakpoint (2xl)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    })

    render(
      <ResponsiveProvider>
        <TestComponent />
      </ResponsiveProvider>
    )

    expect(screen.getByTestId('breakpoint')).toHaveTextContent('2xl')
    expect(screen.getByTestId('is-desktop')).toHaveTextContent('true')
  })

  it('should update on window resize', () => {
    const { rerender } = render(
      <ResponsiveProvider>
        <TestComponent />
      </ResponsiveProvider>
    )

    // Initially desktop
    expect(screen.getByTestId('breakpoint')).toHaveTextContent('lg')

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      })
      window.dispatchEvent(new Event('resize'))
    })

    rerender(
      <ResponsiveProvider>
        <TestComponent />
      </ResponsiveProvider>
    )

    expect(screen.getByTestId('breakpoint')).toHaveTextContent('xs')
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('true')
  })

  it('should handle edge case at breakpoint boundaries', () => {
    // Test exactly at sm breakpoint (640px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 640,
    })

    render(
      <ResponsiveProvider>
        <TestComponent />
      </ResponsiveProvider>
    )

    expect(screen.getByTestId('breakpoint')).toHaveTextContent('sm')
  })

  it('should use ResizeObserver when available', () => {
    const mockObserve = vi.fn()
    const mockDisconnect = vi.fn()
    
    global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
      observe: mockObserve,
      unobserve: vi.fn(),
      disconnect: mockDisconnect,
    }))

    const { unmount } = render(
      <ResponsiveProvider>
        <TestComponent />
      </ResponsiveProvider>
    )

    expect(mockObserve).toHaveBeenCalled()
    
    unmount()
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('should throw error when used outside ResponsiveProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('ResponsiveContext must be used within ResponsiveProvider')
    
    consoleSpy.mockRestore()
  })

  it('should be accessible with no axe violations', async () => {
    const { container } = render(
      <ResponsiveProvider>
        <TestComponent />
      </ResponsiveProvider>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})