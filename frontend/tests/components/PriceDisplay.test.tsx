import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import the component that doesn't exist yet - this MUST fail
import { PriceDisplay } from '../../src/components/UI/PriceDisplay'

expect.extend(toHaveNoViolations)

describe('PriceDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render basic price with default formatting', () => {
    render(
      <PriceDisplay 
        price={1234.56} 
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toBeInTheDocument()
    expect(display).toHaveTextContent('¥1,234.56')
  })

  it('should render price with custom currency', () => {
    render(
      <PriceDisplay 
        price={1234.56}
        currency="USD"
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveTextContent('$1,234.56')
  })

  it('should handle precision formatting', () => {
    render(
      <PriceDisplay 
        price={1234.56789}
        precision={0}
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveTextContent('¥1,235')
  })

  it('should show upward trend with visual indicators', () => {
    render(
      <PriceDisplay 
        price={1200}
        previousPrice={1000}
        showTrend={true}
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveTextContent('¥1,200')
    expect(display).toHaveClass('text-gain-600')
    expect(display).toHaveTextContent('↑')
  })

  it('should show downward trend with visual indicators', () => {
    render(
      <PriceDisplay 
        price={800}
        previousPrice={1000}
        showTrend={true}
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveTextContent('¥800')
    expect(display).toHaveClass('text-loss-600')
    expect(display).toHaveTextContent('↓')
  })

  it('should show neutral state for no change', () => {
    render(
      <PriceDisplay 
        price={1000}
        previousPrice={1000}
        showTrend={true}
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveClass('text-gray-500')
    expect(display).toHaveTextContent('→')
  })

  it('should handle different size variants', () => {
    const { rerender } = render(
      <PriceDisplay 
        price={1000}
        size="sm"
        data-testid="price-display"
      />
    )

    expect(screen.getByTestId('price-display')).toHaveClass('text-sm')

    rerender(
      <PriceDisplay 
        price={1000}
        size="md"
        data-testid="price-display"
      />
    )

    expect(screen.getByTestId('price-display')).toHaveClass('text-base')

    rerender(
      <PriceDisplay 
        price={1000}
        size="lg"
        data-testid="price-display"
      />
    )

    expect(screen.getByTestId('price-display')).toHaveClass('text-lg')
  })

  it('should adapt to theme context', () => {
    // Mock dark theme context
    render(
      <PriceDisplay 
        price={1000}
        theme="dark"
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveClass('dark:text-white')
  })

  it('should handle very large numbers', () => {
    render(
      <PriceDisplay 
        price={1234567890}
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveTextContent('¥1,234,567,890')
  })

  it('should handle very small numbers', () => {
    render(
      <PriceDisplay 
        price={0.0123}
        precision={4}
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveTextContent('¥0.0123')
  })

  it('should handle zero price', () => {
    render(
      <PriceDisplay 
        price={0}
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveTextContent('¥0.00')
  })

  it('should handle negative prices', () => {
    render(
      <PriceDisplay 
        price={-100}
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveTextContent('-¥100.00')
    expect(display).toHaveClass('text-loss-600')
  })

  it('should provide proper accessibility attributes', () => {
    render(
      <PriceDisplay 
        price={1200}
        previousPrice={1000}
        showTrend={true}
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveAttribute('role', 'status')
    expect(display).toHaveAttribute('aria-label', expect.stringContaining('1200'))
    expect(display).toHaveAttribute('aria-label', expect.stringContaining('increased'))
  })

  it('should format Japanese yen correctly', () => {
    render(
      <PriceDisplay 
        price={1000000}
        currency="JPY"
        data-testid="price-display"
      />
    )

    const display = screen.getByTestId('price-display')
    expect(display).toHaveTextContent('¥1,000,000')
  })

  it('should be accessible with no axe violations', async () => {
    const { container } = render(
      <PriceDisplay 
        price={1234.56}
        previousPrice={1000}
        showTrend={true}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})