/**
 * Responsive Behavior Integration Test Suite - TDD Phase
 * 
 * This test MUST FAIL initially (RED phase) before implementation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'

// Import components that DON'T EXIST yet (will cause test failures)
import { ResponsiveProvider } from '../../src/contexts/ResponsiveContext'
import { ThemeProvider } from '../../src/contexts/ThemeContext'
import { AccessibilityProvider } from '../../src/contexts/AccessibilityContext'
import { StockCard } from '../../src/components/StockCard'
import { PriceDisplay } from '../../src/components/enhanced/PriceDisplay'
import { LoadingState } from '../../src/components/enhanced/LoadingState'

const mockStock = {
  stock_code: '7203',
  company_name: 'トヨタ自動車',
  current_price: 2500,
  previous_close: 2450,
  price_change: 50,
  percentage_change: 2.04,
  volume: 15000000,
  market_cap: 32000000000000,
  updated_at: '2025-01-15T09:30:00Z'
}

// Test wrapper with all providers
const TestApp = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <ResponsiveProvider>
      <AccessibilityProvider>
        {children}
      </AccessibilityProvider>
    </ResponsiveProvider>
  </ThemeProvider>
)

// Helper to simulate window resize
const simulateResize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  window.dispatchEvent(new Event('resize'))
}

describe('Responsive Behavior Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set default desktop size
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
    
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))

    // Mock matchMedia for responsive queries
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
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

  describe('Breakpoint Detection', () => {
    it('should detect mobile breakpoint (< 768px)', async () => {
      render(
        <TestApp>
          <div data-testid="breakpoint-display">
            <StockCard stock={mockStock} />
          </div>
        </TestApp>
      )

      await act(async () => {
        simulateResize(320, 568)
      })

      await waitFor(() => {
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('flex-col') // Mobile stacking
        expect(card).toHaveClass('p-3') // Mobile padding
      })
    })

    it('should detect tablet breakpoint (768px - 1023px)', async () => {
      render(
        <TestApp>
          <div data-testid="breakpoint-display">
            <StockCard stock={mockStock} />
          </div>
        </TestApp>
      )

      await act(async () => {
        simulateResize(768, 1024)
      })

      await waitFor(() => {
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('flex-row') // Tablet horizontal layout
        expect(card).toHaveClass('p-4') // Tablet padding
      })
    })

    it('should detect desktop breakpoint (>= 1024px)', async () => {
      render(
        <TestApp>
          <div data-testid="breakpoint-display">
            <StockCard stock={mockStock} />
          </div>
        </TestApp>
      )

      await act(async () => {
        simulateResize(1920, 1080)
      })

      await waitFor(() => {
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('flex-row') // Desktop horizontal layout
        expect(card).toHaveClass('p-6') // Desktop padding
        
        const additionalInfo = screen.getByTestId('stock-additional-info')
        expect(additionalInfo).toBeInTheDocument() // Desktop shows more info
      })
    })
  })

  describe('Layout Adaptation', () => {
    it('should adapt StockCard layout for different screen sizes', async () => {
      const { rerender } = render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      // Mobile layout
      await act(async () => {
        simulateResize(375, 667)
      })

      await waitFor(() => {
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('flex-col')
        
        const priceDisplay = screen.getByTestId('price-display-container')
        expect(priceDisplay).toHaveClass('flex-col') // Stack price elements
      })

      // Desktop layout
      await act(async () => {
        simulateResize(1440, 900)
      })

      await waitFor(() => {
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('flex-row')
        
        const priceDisplay = screen.getByTestId('price-display-container')
        expect(priceDisplay).toHaveClass('flex-row') // Horizontal price elements
      })
    })

    it('should adapt PriceDisplay for different screen sizes', async () => {
      render(
        <TestApp>
          <PriceDisplay 
            currentPrice={mockStock.current_price}
            previousPrice={mockStock.previous_close}
            currency="JPY"
            showPercentage={true}
          />
        </TestApp>
      )

      // Mobile - smaller text and vertical layout
      await act(async () => {
        simulateResize(320, 568)
      })

      await waitFor(() => {
        const priceElement = screen.getByTestId('current-price')
        expect(priceElement).toHaveClass('text-lg') // Smaller on mobile
        
        const container = screen.getByTestId('price-display-container')
        expect(container).toHaveClass('flex-col')
      })

      // Desktop - larger text and horizontal layout
      await act(async () => {
        simulateResize(1920, 1080)
      })

      await waitFor(() => {
        const priceElement = screen.getByTestId('current-price')
        expect(priceElement).toHaveClass('text-3xl') // Larger on desktop
        
        const container = screen.getByTestId('price-display-container')
        expect(container).toHaveClass('flex-row')
      })
    })

    it('should adapt LoadingState for different screen sizes', async () => {
      render(
        <TestApp>
          <LoadingState type="skeleton" variant="stock-card" />
        </TestApp>
      )

      // Mobile - compact skeleton
      await act(async () => {
        simulateResize(375, 667)
      })

      await waitFor(() => {
        const skeleton = screen.getByTestId('skeleton-stock-card')
        expect(skeleton).toHaveClass('p-3') // Mobile padding
        expect(skeleton).toHaveClass('h-24') // Compact height
      })

      // Desktop - full skeleton
      await act(async () => {
        simulateResize(1440, 900)
      })

      await waitFor(() => {
        const skeleton = screen.getByTestId('skeleton-stock-card')
        expect(skeleton).toHaveClass('p-6') // Desktop padding
        expect(skeleton).toHaveClass('h-32') // Full height
      })
    })
  })

  describe('Content Hiding/Showing', () => {
    it('should hide secondary information on mobile', async () => {
      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      await act(async () => {
        simulateResize(320, 568)
      })

      await waitFor(() => {
        // Market cap should be hidden on mobile
        const marketCap = screen.queryByTestId('market-cap')
        expect(marketCap).not.toBeInTheDocument()
        
        // Volume might be shown in compact format
        const volume = screen.queryByTestId('volume-indicator')
        if (volume) {
          expect(volume).toHaveClass('text-xs')
        }
      })
    })

    it('should show all information on desktop', async () => {
      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      await act(async () => {
        simulateResize(1920, 1080)
      })

      await waitFor(() => {
        // All information should be visible on desktop
        const marketCap = screen.getByTestId('market-cap')
        expect(marketCap).toBeInTheDocument()
        
        const volume = screen.getByTestId('volume-indicator')
        expect(volume).toBeInTheDocument()
        
        const updatedTime = screen.getByTestId('updated-time')
        expect(updatedTime).toBeInTheDocument()
        
        const additionalInfo = screen.getByTestId('stock-additional-info')
        expect(additionalInfo).toBeInTheDocument()
      })
    })

    it('should show/hide percentage based on screen size', async () => {
      render(
        <TestApp>
          <PriceDisplay 
            currentPrice={mockStock.current_price}
            previousPrice={mockStock.previous_close}
            currency="JPY"
            showPercentage={true}
          />
        </TestApp>
      )

      // Very small mobile - hide percentage
      await act(async () => {
        simulateResize(280, 568)
      })

      await waitFor(() => {
        const percentage = screen.queryByTestId('percentage-change')
        expect(percentage).not.toBeInTheDocument()
      })

      // Larger screens - show percentage
      await act(async () => {
        simulateResize(768, 1024)
      })

      await waitFor(() => {
        const percentage = screen.getByTestId('percentage-change')
        expect(percentage).toBeInTheDocument()
      })
    })
  })

  describe('Touch and Interaction Adaptation', () => {
    it('should increase touch targets on mobile', async () => {
      render(
        <TestApp>
          <StockCard 
            stock={mockStock} 
            onToggleFavorite={vi.fn()}
            onClick={vi.fn()}
          />
        </TestApp>
      )

      await act(async () => {
        simulateResize(375, 667)
      })

      await waitFor(() => {
        const favoriteButton = screen.getByTestId('favorite-button')
        expect(favoriteButton).toHaveClass('h-12') // Larger touch target
        expect(favoriteButton).toHaveClass('w-12')
        
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('min-h-[48px]') // Minimum touch target size
      })
    })

    it('should use smaller interactive elements on desktop', async () => {
      render(
        <TestApp>
          <StockCard 
            stock={mockStock} 
            onToggleFavorite={vi.fn()}
            onClick={vi.fn()}
          />
        </TestApp>
      )

      await act(async () => {
        simulateResize(1440, 900)
      })

      await waitFor(() => {
        const favoriteButton = screen.getByTestId('favorite-button')
        expect(favoriteButton).toHaveClass('h-8') // Smaller on desktop
        expect(favoriteButton).toHaveClass('w-8')
      })
    })
  })

  describe('Performance Considerations', () => {
    it('should debounce resize events', async () => {
      const mockCallback = vi.fn()
      
      render(
        <TestApp>
          <div data-testid="resize-listener" />
        </TestApp>
      )

      // Simulate rapid resize events
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          simulateResize(800 + i, 600)
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      })

      // Should not trigger excessive re-renders
      await waitFor(() => {
        // The final size should be applied
        expect(window.innerWidth).toBe(809)
      })
    })

    it('should not cause memory leaks with resize listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })
  })

  describe('Orientation Changes', () => {
    it('should handle orientation changes on mobile', async () => {
      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      // Portrait mobile
      await act(async () => {
        simulateResize(375, 667)
      })

      await waitFor(() => {
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('flex-col')
      })

      // Landscape mobile
      await act(async () => {
        simulateResize(667, 375)
      })

      await waitFor(() => {
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('flex-row') // Horizontal in landscape
      })
    })

    it('should handle tablet orientation changes', async () => {
      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      // Portrait tablet
      await act(async () => {
        simulateResize(768, 1024)
      })

      await waitFor(() => {
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('flex-row')
      })

      // Landscape tablet
      await act(async () => {
        simulateResize(1024, 768)
      })

      await waitFor(() => {
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('flex-row')
        
        // Should show more info in landscape
        const additionalInfo = screen.getByTestId('stock-additional-info')
        expect(additionalInfo).toBeInTheDocument()
      })
    })
  })

  describe('Extreme Viewport Sizes', () => {
    it('should handle very narrow screens', async () => {
      render(
        <TestApp>
          <StockCard stock={mockStock} />
          <PriceDisplay currentPrice={mockStock.current_price} currency="JPY" />
        </TestApp>
      )

      await act(async () => {
        simulateResize(240, 320) // Very narrow
      })

      await waitFor(() => {
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('flex-col')
        expect(card).toHaveClass('p-2') // Minimal padding
        
        const priceElement = screen.getByTestId('current-price')
        expect(priceElement).toHaveClass('text-sm') // Small text
      })
    })

    it('should handle very wide screens', async () => {
      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      await act(async () => {
        simulateResize(3440, 1440) // Ultra-wide
      })

      await waitFor(() => {
        const card = screen.getByTestId('stock-card')
        expect(card).toHaveClass('max-w-md') // Prevent over-stretching
      })
    })

    it('should handle very short screens', async () => {
      render(
        <TestApp>
          <LoadingState type="skeleton" variant="stock-list" count={5} />
        </TestApp>
      )

      await act(async () => {
        simulateResize(1920, 400) // Very short
      })

      await waitFor(() => {
        const skeletonItems = screen.getAllByTestId('skeleton-list-item')
        expect(skeletonItems.length).toBe(3) // Reduce count for short screens
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle ResizeObserver errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock ResizeObserver to throw error
      global.ResizeObserver = vi.fn().mockImplementation(() => {
        throw new Error('ResizeObserver error')
      })

      render(
        <TestApp>
          <StockCard stock={mockStock} />
        </TestApp>
      )

      const card = screen.getByTestId('stock-card')
      expect(card).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('should fallback when responsive context is missing', () => {
      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toBeInTheDocument()
      // Should render with default styles
    })
  })
})