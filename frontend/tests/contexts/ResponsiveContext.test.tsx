/**
 * ResponsiveContext Test Suite - TDD Phase
 * 
 * This test MUST FAIL initially (RED phase) before implementation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

// Import components that DON'T EXIST yet (will cause test failures)
import { ResponsiveProvider, useResponsive } from '../../src/contexts/ResponsiveContext'

// Test component to use the ResponsiveContext
const TestComponent = () => {
  const { breakpoint, isMobile, isTablet, isDesktop, screenSize } = useResponsive()
  
  return (
    <div data-testid="responsive-test">
      <span data-testid="current-breakpoint">{breakpoint}</span>
      <span data-testid="is-mobile">{isMobile.toString()}</span>
      <span data-testid="is-tablet">{isTablet.toString()}</span>
      <span data-testid="is-desktop">{isDesktop.toString()}</span>
      <span data-testid="screen-width">{screenSize.width}</span>
      <span data-testid="screen-height">{screenSize.height}</span>
    </div>
  )
}

describe('ResponsiveContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset window dimensions
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
    
    // Reset matchMedia mock for responsive queries
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query.includes('min-width: 768px') && query.includes('max-width: 1023px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  describe('Breakpoint Detection', () => {
    it('should detect mobile breakpoint for screens < 768px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 320 })
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 767px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <ResponsiveProvider>
          <TestComponent />
        </ResponsiveProvider>
      )

      expect(screen.getByTestId('current-breakpoint')).toHaveTextContent('mobile')
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('true')
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false')
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false')
    })

    it('should detect tablet breakpoint for screens 768px-1023px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('min-width: 768px') && query.includes('max-width: 1023px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <ResponsiveProvider>
          <TestComponent />
        </ResponsiveProvider>
      )

      expect(screen.getByTestId('current-breakpoint')).toHaveTextContent('tablet')
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false')
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('true')
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false')
    })

    it('should detect desktop breakpoint for screens >= 1024px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920 })
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('min-width: 1024px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <ResponsiveProvider>
          <TestComponent />
        </ResponsiveProvider>
      )

      expect(screen.getByTestId('current-breakpoint')).toHaveTextContent('desktop')
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false')
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false')
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('true')
    })
  })

  describe('Screen Size Tracking', () => {
    it('should track current window dimensions', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200 })
      Object.defineProperty(window, 'innerHeight', { value: 800 })

      render(
        <ResponsiveProvider>
          <TestComponent />
        </ResponsiveProvider>
      )

      expect(screen.getByTestId('screen-width')).toHaveTextContent('1200')
      expect(screen.getByTestId('screen-height')).toHaveTextContent('800')
    })

    it('should update dimensions on window resize', async () => {
      render(
        <ResponsiveProvider>
          <TestComponent />
        </ResponsiveProvider>
      )

      // Simulate window resize
      await act(async () => {
        Object.defineProperty(window, 'innerWidth', { value: 800 })
        Object.defineProperty(window, 'innerHeight', { value: 600 })
        window.dispatchEvent(new Event('resize'))
      })

      expect(screen.getByTestId('screen-width')).toHaveTextContent('800')
      expect(screen.getByTestId('screen-height')).toHaveTextContent('600')
    })
  })

  describe('Responsive Event Handling', () => {
    it('should add resize event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      render(
        <ResponsiveProvider>
          <TestComponent />
        </ResponsiveProvider>
      )

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should remove resize event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <ResponsiveProvider>
          <TestComponent />
        </ResponsiveProvider>
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should debounce resize events to prevent excessive re-renders', async () => {
      const { rerender } = render(
        <ResponsiveProvider>
          <TestComponent />
        </ResponsiveProvider>
      )

      // Simulate multiple rapid resize events
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          Object.defineProperty(window, 'innerWidth', { value: 800 + i })
          window.dispatchEvent(new Event('resize'))
        }
      })

      // Should only update once after debounce
      expect(screen.getByTestId('screen-width')).toHaveTextContent('809')
    })
  })

  describe('Context Error Handling', () => {
    it('should throw error when useResponsive is used outside ResponsiveProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useResponsive must be used within a ResponsiveProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('Media Query Integration', () => {
    it('should setup media query listeners for all breakpoints', () => {
      const matchMediaSpy = vi.spyOn(window, 'matchMedia')

      render(
        <ResponsiveProvider>
          <TestComponent />
        </ResponsiveProvider>
      )

      // Should call matchMedia for mobile, tablet, and desktop breakpoints
      expect(matchMediaSpy).toHaveBeenCalledWith('(max-width: 767px)')
      expect(matchMediaSpy).toHaveBeenCalledWith('(min-width: 768px) and (max-width: 1023px)')
      expect(matchMediaSpy).toHaveBeenCalledWith('(min-width: 1024px)')
    })

    it('should respond to media query changes', async () => {
      let mediaQueryCallback: (() => void) | null = null
      
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 767px'),
        media: query,
        onchange: null,
        addListener: vi.fn((cb) => { mediaQueryCallback = cb }),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event, cb) => { if (event === 'change') mediaQueryCallback = cb }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(
        <ResponsiveProvider>
          <TestComponent />
        </ResponsiveProvider>
      )

      // Simulate media query change
      await act(async () => {
        if (mediaQueryCallback) {
          mediaQueryCallback()
        }
      })

      expect(screen.getByTestId('current-breakpoint')).toHaveTextContent('mobile')
    })
  })
})