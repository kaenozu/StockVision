import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import enhanced StockCard that doesn't exist yet - this MUST fail
import { EnhancedStockCard as StockCard } from '../../src/components/stock/EnhancedStockCard'

expect.extend(toHaveNoViolations)

// Mock contexts for testing
const mockThemeContext = {
  theme: 'light' as const,
  toggleTheme: vi.fn(),
  systemPreference: 'light' as const,
  isDark: false
}

const mockResponsiveContext = {
  breakpoint: 'lg' as const,
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  width: 1024
}

const mockAccessibilityContext = {
  highContrast: false,
  reduceMotion: false,
  keyboardNavigation: false,
  screenReaderActive: false,
  setHighContrast: vi.fn(),
  setReduceMotion: vi.fn()
}

// Mock React contexts
vi.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => mockThemeContext
}))

vi.mock('../../src/contexts/ResponsiveContext', () => ({
  useResponsive: () => mockResponsiveContext
}))

vi.mock('../../src/hooks/useFocusManagement', () => ({
  useFocusManagement: () => ({
    focusElement: vi.fn(),
    trapFocus: vi.fn(),
    focusVisible: false,
    keyboardNavigation: mockAccessibilityContext.keyboardNavigation,
  }),
}))

describe('StockCard Enhanced', () => {
  const defaultProps = {
    stockCode: '7203',
    name: 'トヨタ自動車',
    price: 2500,
    previousPrice: 2400,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render enhanced stock card with visual indicators', () => {
    render(
      <StockCard 
        {...defaultProps}
        visualIndicator={{
          value: 2500,
          previousValue: 2400,
          showTrend: true,
          showIcon: true
        }}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toBeInTheDocument()
    expect(card).toHaveTextContent('トヨタ自動車')
    expect(card).toHaveTextContent('7203')
    expect(card).toHaveTextContent('2500')
  })

  it('should display price change with gain indicators', () => {
    render(
      <StockCard 
        {...defaultProps}
        visualIndicator={{
          value: 2500,
          previousValue: 2400,
          showTrend: true,
          showIcon: true
        }}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveTextContent('↑') // Up arrow
    expect(card).toHaveTextContent('+') // Plus sign
    expect(card).toHaveClass('border-gain-200') // Gain border color
  })

  it('should display price change with loss indicators', () => {
    render(
      <StockCard 
        {...defaultProps}
        price={2200}
        visualIndicator={{
          value: 2200,
          previousValue: 2400,
          showTrend: true,
          showIcon: true
        }}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveTextContent('↓') // Down arrow
    expect(card).toHaveTextContent('-') // Minus sign
    expect(card).toHaveClass('border-loss-200') // Loss border color
  })

  it('should adapt to mobile responsive layout', () => {
    // Mock mobile context
    mockResponsiveContext.breakpoint = 'xs'
    mockResponsiveContext.isMobile = true
    mockResponsiveContext.isDesktop = false
    mockResponsiveContext.width = 320

    render(
      <StockCard 
        {...defaultProps}
        responsive={true}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveClass('flex-col') // Mobile vertical layout
    expect(card).toHaveClass('text-sm') // Smaller text on mobile
  })

  it('should adapt to dark theme', () => {
    mockThemeContext.theme = 'dark'
    mockThemeContext.isDark = true

    render(
      <StockCard 
        {...defaultProps}
        theme="dark"
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveClass('dark:bg-gray-800')
    expect(card).toHaveClass('dark:text-white')
  })

  it('should handle keyboard navigation', () => {
    render(
      <StockCard 
        {...defaultProps}
        accessibility={{
          ariaLabel: 'トヨタ自動車 株価カード',
          keyboardNavigation: true
        }}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveAttribute('tabindex', '0')
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('aria-label', 'トヨタ自動車 株価カード')

    // Test keyboard focus
    fireEvent.focus(card)
    expect(card).toHaveFocus()
    expect(card).toHaveClass('focus:outline-focus')
  })

  it('should handle Enter key press for activation', () => {
    const onClickSpy = vi.fn()

    render(
      <StockCard 
        {...defaultProps}
        onClick={onClickSpy}
        accessibility={{
          keyboardNavigation: true
        }}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })

    expect(onClickSpy).toHaveBeenCalledOnce()
  })

  it('should handle Space key press for activation', () => {
    const onClickSpy = vi.fn()

    render(
      <StockCard 
        {...defaultProps}
        onClick={onClickSpy}
        accessibility={{
          keyboardNavigation: true
        }}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    fireEvent.keyDown(card, { key: ' ', code: 'Space' })

    expect(onClickSpy).toHaveBeenCalledOnce()
  })

  it('should apply high contrast mode', () => {
    mockAccessibilityContext.highContrast = true

    render(
      <StockCard 
        {...defaultProps}
        accessibility={{
          highContrast: true
        }}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveClass('high-contrast')
    expect(card).toHaveClass('border-2') // Thicker borders in high contrast
  })

  it('should respect reduced motion preference', () => {
    mockAccessibilityContext.reduceMotion = true

    render(
      <StockCard 
        {...defaultProps}
        accessibility={{
          reduceMotion: true
        }}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveClass('motion-reduce:transition-none')
  })

  it('should handle loading state', () => {
    render(
      <StockCard 
        {...defaultProps}
        loading={true}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveClass('animate-pulse')
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  })

  it('should handle error state', () => {
    render(
      <StockCard 
        {...defaultProps}
        error="データの取得に失敗しました"
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveClass('border-red-300')
    expect(card).toHaveTextContent('データの取得に失敗しました')
  })

  it('should display percentage change correctly', () => {
    render(
      <StockCard 
        {...defaultProps}
        visualIndicator={{
          value: 2500,
          previousValue: 2400,
          showTrend: true
        }}
        showPercentageChange={true}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveTextContent('+4.17%') // (2500-2400)/2400 * 100
  })

  it('should handle very long stock names gracefully', () => {
    render(
      <StockCard 
        {...defaultProps}
        name="非常に長い会社名の株式会社テストケースサンプルコーポレーション"
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveClass('truncate') // Text truncation for long names
  })

  it('should provide screen reader optimized content', () => {
    mockAccessibilityContext.screenReaderActive = true

    render(
      <StockCard 
        {...defaultProps}
        visualIndicator={{
          value: 2500,
          previousValue: 2400,
          showTrend: true
        }}
        data-testid="stock-card"
      />
    )

    const card = screen.getByTestId('stock-card')
    expect(card).toHaveAttribute('aria-describedby')
    
    const description = screen.getByText(/現在価格.*前日比/i)
    expect(description).toBeInTheDocument()
  })

  it('should be accessible with no axe violations', async () => {
    const { container } = render(
      <StockCard 
        {...defaultProps}
        visualIndicator={{
          value: 2500,
          previousValue: 2400,
          showTrend: true,
          showIcon: true
        }}
        accessibility={{
          ariaLabel: 'トヨタ自動車 株価カード',
          keyboardNavigation: true
        }}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})