/**
 * StockCard Enhanced Test Suite - TDD Phase
 * 
 * This test MUST FAIL initially (RED phase) before implementation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import enhanced StockCard that DON'T EXIST yet (will cause test failures)
import { StockCard } from '../../src/components/StockCard'

// Mock contexts that will be used
vi.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() })
}))

vi.mock('../../src/contexts/ResponsiveContext', () => ({
  useResponsive: () => ({ 
    isMobile: false, 
    isTablet: false, 
    isDesktop: true, 
    breakpoint: 'desktop' 
  })
}))

vi.mock('../../src/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({ 
    focusMode: false, 
    reducedMotion: false, 
    highContrast: false 
  })
}))

expect.extend(toHaveNoViolations)

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

describe('StockCard Enhanced', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Enhanced UI Components Integration', () => {
    it('should render with enhanced PriceDisplay component', () => {
      render(<StockCard stock={mockStock} />)

      const priceDisplay = screen.getByTestId('price-display-container')
      expect(priceDisplay).toBeInTheDocument()
      
      const currentPrice = screen.getByTestId('current-price')
      expect(currentPrice).toHaveTextContent('¥2,500.00')
    })

    it('should render with VisualIndicator for price changes', () => {
      render(<StockCard stock={mockStock} />)

      const priceChangeIndicator = screen.getByTestId('visual-indicator')
      expect(priceChangeIndicator).toBeInTheDocument()
      expect(priceChangeIndicator).toHaveClass('text-gain-600')
    })

    it('should show loading state with LoadingState component', () => {
      render(<StockCard stock={null} loading={true} />)

      const loadingState = screen.getByTestId('loading-state')
      expect(loadingState).toBeInTheDocument()
      expect(loadingState).toHaveClass('animate-pulse')
    })
  })

  describe('Responsive Design Integration', () => {
    it('should adapt layout for mobile devices', () => {
      vi.mocked(require('../../src/contexts/ResponsiveContext').useResponsive).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'mobile'
      })

      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('flex-col')
      expect(card).toHaveClass('p-3')
    })

    it('should show compact layout for tablet devices', () => {
      vi.mocked(require('../../src/contexts/ResponsiveContext').useResponsive).mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        breakpoint: 'tablet'
      })

      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('flex-row')
      expect(card).toHaveClass('p-4')
    })

    it('should show full layout for desktop devices', () => {
      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('flex-row')
      expect(card).toHaveClass('p-6')
      
      const additionalInfo = screen.getByTestId('stock-additional-info')
      expect(additionalInfo).toBeInTheDocument()
    })
  })

  describe('Theme Integration', () => {
    it('should apply dark theme styling', () => {
      vi.mocked(require('../../src/contexts/ThemeContext').useTheme).mockReturnValue({
        theme: 'dark',
        toggleTheme: vi.fn()
      })

      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('dark:bg-secondary-800')
      expect(card).toHaveClass('dark:text-white')
      expect(card).toHaveClass('dark:border-secondary-700')
    })

    it('should apply light theme styling', () => {
      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('bg-white')
      expect(card).toHaveClass('text-secondary-900')
      expect(card).toHaveClass('border-secondary-200')
    })
  })

  describe('Accessibility Enhancements', () => {
    it('should support focus mode navigation', () => {
      vi.mocked(require('../../src/contexts/AccessibilityContext').useAccessibility).mockReturnValue({
        focusMode: true,
        reducedMotion: false,
        highContrast: false
      })

      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveAttribute('tabIndex', '0')
      expect(card).toHaveClass('focus-mode')
    })

    it('should respect reduced motion preferences', () => {
      vi.mocked(require('../../src/contexts/AccessibilityContext').useAccessibility).mockReturnValue({
        focusMode: false,
        reducedMotion: true,
        highContrast: false
      })

      render(<StockCard stock={mockStock} />)

      const animatedElements = screen.queryAllByClass('animate-pulse')
      animatedElements.forEach(element => {
        expect(element).toHaveClass('motion-reduce:animate-none')
      })
    })

    it('should apply high contrast styling', () => {
      vi.mocked(require('../../src/contexts/AccessibilityContext').useAccessibility).mockReturnValue({
        focusMode: false,
        reducedMotion: false,
        highContrast: true
      })

      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('high-contrast')
      
      const priceElements = screen.getAllByTestId(/price|indicator/)
      priceElements.forEach(element => {
        expect(element).toHaveClass('high-contrast')
      })
    })

    it('should have comprehensive ARIA labels', () => {
      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveAttribute('role', 'article')
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('トヨタ自動車'))
      
      const priceChange = screen.getByTestId('visual-indicator')
      expect(priceChange).toHaveAttribute('aria-label', expect.stringContaining('price change'))
    })

    it('should have no accessibility violations', async () => {
      const { container } = render(<StockCard stock={mockStock} />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Interactive Features', () => {
    it('should handle click interactions', () => {
      const onCardClick = vi.fn()
      render(<StockCard stock={mockStock} onClick={onCardClick} />)

      const card = screen.getByTestId('stock-card')
      fireEvent.click(card)
      
      expect(onCardClick).toHaveBeenCalledWith(mockStock)
    })

    it('should handle keyboard navigation', () => {
      const onCardClick = vi.fn()
      render(<StockCard stock={mockStock} onClick={onCardClick} />)

      const card = screen.getByTestId('stock-card')
      
      // Test Enter key
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })
      expect(onCardClick).toHaveBeenCalledWith(mockStock)
      
      // Test Space key
      fireEvent.keyDown(card, { key: ' ', code: 'Space' })
      expect(onCardClick).toHaveBeenCalledTimes(2)
    })

    it('should show hover effects', () => {
      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      
      fireEvent.mouseEnter(card)
      expect(card).toHaveClass('hover:shadow-medium')
      expect(card).toHaveClass('hover:scale-102')
    })

    it('should support favorite/watchlist functionality', () => {
      const onToggleFavorite = vi.fn()
      render(<StockCard stock={mockStock} onToggleFavorite={onToggleFavorite} isFavorite={false} />)

      const favoriteButton = screen.getByTestId('favorite-button')
      expect(favoriteButton).toBeInTheDocument()
      
      fireEvent.click(favoriteButton)
      expect(onToggleFavorite).toHaveBeenCalledWith(mockStock.stock_code, true)
    })
  })

  describe('Enhanced Data Display', () => {
    it('should show volume with proper formatting', () => {
      render(<StockCard stock={mockStock} />)

      const volumeIndicator = screen.getByTestId('volume-indicator')
      expect(volumeIndicator).toHaveTextContent('15.0M')
    })

    it('should display market cap with formatting', () => {
      render(<StockCard stock={mockStock} />)

      const marketCapElement = screen.getByTestId('market-cap')
      expect(marketCapElement).toHaveTextContent('¥32.0T')
    })

    it('should show last updated time', () => {
      render(<StockCard stock={mockStock} />)

      const updatedTime = screen.getByTestId('updated-time')
      expect(updatedTime).toBeInTheDocument()
      expect(updatedTime).toHaveAttribute('aria-label', expect.stringContaining('Updated'))
    })

    it('should handle missing data gracefully', () => {
      const incompleteStock = {
        ...mockStock,
        volume: undefined,
        market_cap: undefined
      }

      render(<StockCard stock={incompleteStock} />)

      const volumeIndicator = screen.queryByTestId('volume-indicator')
      expect(volumeIndicator).toHaveTextContent('---')
      
      const marketCapElement = screen.queryByTestId('market-cap')
      expect(marketCapElement).toHaveTextContent('---')
    })
  })

  describe('Error States', () => {
    it('should show error state for invalid stock data', () => {
      render(<StockCard stock={null} error="Failed to load stock data" />)

      const errorState = screen.getByTestId('error-state')
      expect(errorState).toBeInTheDocument()
      expect(errorState).toHaveTextContent('Failed to load stock data')
    })

    it('should show retry functionality on error', () => {
      const onRetry = vi.fn()
      render(<StockCard stock={null} error="Network error" onRetry={onRetry} />)

      const retryButton = screen.getByTestId('retry-button')
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalled()
    })
  })

  describe('Animation and Transitions', () => {
    it('should animate price changes', () => {
      const { rerender } = render(<StockCard stock={mockStock} />)

      const updatedStock = {
        ...mockStock,
        current_price: 2600,
        price_change: 100
      }

      rerender(<StockCard stock={updatedStock} />)

      const priceElement = screen.getByTestId('current-price')
      expect(priceElement).toHaveClass('animate-pulse')
    })

    it('should respect motion preferences for animations', () => {
      vi.mocked(require('../../src/contexts/AccessibilityContext').useAccessibility).mockReturnValue({
        reducedMotion: true
      })

      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('motion-reduce:transform-none')
    })

    it('should have smooth transitions', () => {
      render(<StockCard stock={mockStock} />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('transition-all')
      expect(card).toHaveClass('duration-300')
    })
  })

  describe('Customization Options', () => {
    it('should accept custom className', () => {
      render(<StockCard stock={mockStock} className="custom-stock-card" />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('custom-stock-card')
    })

    it('should support different size variants', () => {
      render(<StockCard stock={mockStock} size="compact" />)

      const card = screen.getByTestId('stock-card')
      expect(card).toHaveClass('p-3')
      expect(card).toHaveClass('text-sm')
    })

    it('should support custom date formatting', () => {
      const customFormatter = vi.fn(() => 'Custom Date')
      render(<StockCard stock={mockStock} dateFormatter={customFormatter} />)

      expect(customFormatter).toHaveBeenCalledWith(mockStock.updated_at)
      expect(screen.getByText('Custom Date')).toBeInTheDocument()
    })
  })
})