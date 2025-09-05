import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import contexts that don't exist yet - this MUST fail
import { ResponsiveProvider } from '../../src/contexts/ResponsiveContext'
import { EnhancedStockCard as StockCard } from '../../src/components/stock/EnhancedStockCard'

expect.extend(toHaveNoViolations)

// Test app with responsive behavior
const ResponsiveApp = () => {
  return (
    <ResponsiveProvider>
      <div data-testid="app-container" className="responsive-container">
        <nav data-testid="navigation" className="hidden sm:block md:flex">
          ナビゲーション
        </nav>
        <main data-testid="main-content" className="p-2 sm:p-4 md:p-6">
          <div data-testid="stock-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StockCard 
              stockCode="7203"
              name="トヨタ自動車"
              price={2500}
              previousPrice={2400}
              responsive={true}
              data-testid="stock-card-1"
            />
            <StockCard 
              stockCode="6758"
              name="ソニー"
              price={12000}
              previousPrice={11800}
              responsive={true}
              data-testid="stock-card-2"
            />
          </div>
        </main>
      </div>
    </ResponsiveProvider>
  )
}

describe('Responsive Behavior Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset window size
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

  it('should adapt layout for mobile (320px)', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320,
    })

    render(<ResponsiveApp />)

    const navigation = screen.getByTestId('navigation')
    const stockGrid = screen.getByTestId('stock-grid')
    const mainContent = screen.getByTestId('main-content')

    expect(navigation).toHaveClass('hidden') // Mobile hides nav
    expect(stockGrid).toHaveClass('grid-cols-1') // Single column on mobile
    expect(mainContent).toHaveClass('p-2') // Smaller padding on mobile

    const stockCard1 = screen.getByTestId('stock-card-1')
    expect(stockCard1).toHaveClass('flex-col') // Vertical layout on mobile
  })

  it('should adapt layout for tablet (768px)', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    })

    render(<ResponsiveApp />)

    const navigation = screen.getByTestId('navigation')
    const stockGrid = screen.getByTestId('stock-grid')
    const mainContent = screen.getByTestId('main-content')

    expect(navigation).toHaveClass('sm:block') // Visible on tablet
    expect(stockGrid).toHaveClass('sm:grid-cols-2') // Two columns on tablet
    expect(mainContent).toHaveClass('sm:p-4') // Medium padding
  })

  it('should adapt layout for desktop (1024px+)', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    render(<ResponsiveApp />)

    const navigation = screen.getByTestId('navigation')
    const stockGrid = screen.getByTestId('stock-grid')
    const mainContent = screen.getByTestId('main-content')

    expect(navigation).toHaveClass('md:flex') // Flex layout on desktop
    expect(stockGrid).toHaveClass('lg:grid-cols-3') // Three columns on large screens
    expect(mainContent).toHaveClass('md:p-6') // Large padding
  })

  it('should handle window resize dynamically', async () => {
    const { rerender } = render(<ResponsiveApp />)

    // Start desktop
    expect(screen.getByTestId('stock-grid')).toHaveClass('lg:grid-cols-3')

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      })
      window.dispatchEvent(new Event('resize'))
    })

    rerender(<ResponsiveApp />)

    expect(screen.getByTestId('stock-grid')).toHaveClass('grid-cols-1')
  })

  it('should handle boundary breakpoints correctly', async () => {
    // Test exactly at sm breakpoint (640px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 640,
    })

    render(<ResponsiveApp />)

    const stockGrid = screen.getByTestId('stock-grid')
    expect(stockGrid).toHaveClass('sm:grid-cols-2') // Should use sm classes at 640px
  })

  it('should maintain touch-friendly targets on mobile', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320,
    })

    render(<ResponsiveApp />)

    const stockCard = screen.getByTestId('stock-card-1')
    expect(stockCard).toHaveClass('min-h-[44px]') // Touch target minimum
    expect(stockCard).toHaveClass('touch-manipulation')
  })

  it('should optimize text sizing for different screens', async () => {
    const { rerender } = render(<ResponsiveApp />)

    // Mobile - smaller text
    Object.defineProperty(window, 'innerWidth', { value: 320, writable: true })
    rerender(<ResponsiveApp />)
    
    const stockCard = screen.getByTestId('stock-card-1')
    expect(stockCard).toHaveClass('text-sm')

    // Desktop - larger text
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    rerender(<ResponsiveApp />)
    
    expect(stockCard).toHaveClass('md:text-base')
  })

  it('should handle orientation changes', async () => {
    // Portrait mobile
    Object.defineProperty(window, 'innerWidth', { value: 320, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 568, writable: true })

    render(<ResponsiveApp />)

    expect(screen.getByTestId('stock-grid')).toHaveClass('grid-cols-1')

    // Landscape mobile (should still behave as mobile due to width)
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 568, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 320, writable: true })
      window.dispatchEvent(new Event('resize'))
    })

    expect(screen.getByTestId('stock-grid')).toHaveClass('sm:grid-cols-2')
  })

  it('should use ResizeObserver when available', async () => {
    const mockObserve = vi.fn()
    const mockDisconnect = vi.fn()
    
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: mockObserve,
      unobserve: vi.fn(),
      disconnect: mockDisconnect,
    }))

    const { unmount } = render(<ResponsiveApp />)

    expect(mockObserve).toHaveBeenCalled()
    
    unmount()
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('should maintain accessibility across breakpoints', async () => {
    const { container, rerender } = render(<ResponsiveApp />)

    // Test mobile accessibility
    Object.defineProperty(window, 'innerWidth', { value: 320, writable: true })
    rerender(<ResponsiveApp />)
    
    const mobileResults = await axe(container)
    expect(mobileResults).toHaveNoViolations()

    // Test desktop accessibility
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    rerender(<ResponsiveApp />)
    
    const desktopResults = await axe(container)
    expect(desktopResults).toHaveNoViolations()
  })

  it('should handle container queries when supported', async () => {
    // Mock container query support
    const mockSupports = vi.spyOn(CSS, 'supports').mockImplementation((property) => {
      return property.includes('container-type')
    })

    render(<ResponsiveApp />)

    const container = screen.getByTestId('app-container')
    expect(container).toHaveClass('container-type:inline-size')

    mockSupports.mockRestore()
  })

  it('should optimize images for different screen densities', async () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 2, // Retina display
    })

    render(<ResponsiveApp />)

    const images = screen.getAllByRole('img')
    images.forEach(img => {
      expect(img).toHaveAttribute('srcset', expect.stringContaining('2x'))
    })
  })

  it('should handle extreme viewport sizes gracefully', async () => {
    // Very narrow (smartwatch)
    Object.defineProperty(window, 'innerWidth', { value: 200, writable: true })
    
    const { rerender } = render(<ResponsiveApp />)

    expect(screen.getByTestId('app-container')).toBeInTheDocument()

    // Ultra-wide desktop
    Object.defineProperty(window, 'innerWidth', { value: 2560, writable: true })
    rerender(<ResponsiveApp />)

    const stockGrid = screen.getByTestId('stock-grid')
    expect(stockGrid).toHaveClass('2xl:grid-cols-4') // Extra columns for ultra-wide
  })
})