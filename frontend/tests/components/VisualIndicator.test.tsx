import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import the component that doesn't exist yet - this MUST fail
import { VisualIndicator } from '../../src/components/enhanced/VisualIndicator'
import { VisualIndicatorProps } from '../../src/contexts/ResponsiveContext'

expect.extend(toHaveNoViolations)

describe('VisualIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with basic props', () => {
    render(
      <VisualIndicator 
        value={100} 
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveTextContent('100')
  })

  it('should show upward trend for increased value', () => {
    render(
      <VisualIndicator 
        value={120} 
        previousValue={100}
        showTrend={true}
        showIcon={true}
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    expect(indicator).toHaveClass('text-gain-600') // Green for upward trend
    expect(indicator).toHaveTextContent('↑') // Upward arrow
    expect(indicator).toHaveTextContent('+') // Plus sign
  })

  it('should show downward trend for decreased value', () => {
    render(
      <VisualIndicator 
        value={80} 
        previousValue={100}
        showTrend={true}
        showIcon={true}
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    expect(indicator).toHaveClass('text-loss-600') // Red for downward trend
    expect(indicator).toHaveTextContent('↓') // Downward arrow
    expect(indicator).toHaveTextContent('-') // Minus sign
  })

  it('should show neutral state for no change', () => {
    render(
      <VisualIndicator 
        value={100} 
        previousValue={100}
        showTrend={true}
        showIcon={true}
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    expect(indicator).toHaveClass('text-gray-500') // Gray for neutral
    expect(indicator).toHaveTextContent('→') // Right arrow for no change
  })

  it('should handle different size variants', () => {
    const { rerender } = render(
      <VisualIndicator 
        value={100} 
        size="sm"
        data-testid="visual-indicator"
      />
    )

    expect(screen.getByTestId('visual-indicator')).toHaveClass('text-sm')

    rerender(
      <VisualIndicator 
        value={100} 
        size="md"
        data-testid="visual-indicator"
      />
    )

    expect(screen.getByTestId('visual-indicator')).toHaveClass('text-base')

    rerender(
      <VisualIndicator 
        value={100} 
        size="lg"
        data-testid="visual-indicator"
      />
    )

    expect(screen.getByTestId('visual-indicator')).toHaveClass('text-lg')
  })

  it('should apply custom className', () => {
    render(
      <VisualIndicator 
        value={100} 
        className="custom-class font-bold"
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    expect(indicator).toHaveClass('custom-class')
    expect(indicator).toHaveClass('font-bold')
  })

  it('should work without trend display', () => {
    render(
      <VisualIndicator 
        value={120} 
        previousValue={100}
        showTrend={false}
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    expect(indicator).toHaveTextContent('120')
    expect(indicator).not.toHaveTextContent('↑')
    expect(indicator).not.toHaveTextContent('+')
  })

  it('should work without icon display', () => {
    render(
      <VisualIndicator 
        value={120} 
        previousValue={100}
        showTrend={true}
        showIcon={false}
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    expect(indicator).toHaveClass('text-gain-600')
    expect(indicator).not.toHaveTextContent('↑')
    expect(indicator).toHaveTextContent('+') // Should still show +/- signs
  })

  it('should handle edge case with zero previous value', () => {
    render(
      <VisualIndicator 
        value={100} 
        previousValue={0}
        showTrend={true}
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    expect(indicator).toHaveClass('text-gain-600')
  })

  it('should handle edge case with zero current value', () => {
    render(
      <VisualIndicator 
        value={0} 
        previousValue={100}
        showTrend={true}
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    expect(indicator).toHaveClass('text-loss-600')
  })

  it('should format numbers appropriately', () => {
    render(
      <VisualIndicator 
        value={1234.56} 
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    // Should format numbers with appropriate precision
    expect(indicator).toHaveTextContent('1,234.56')
  })

  it('should handle very large numbers', () => {
    render(
      <VisualIndicator 
        value={1000000} 
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    // Should handle large numbers gracefully
    expect(indicator).toHaveTextContent('1,000,000')
  })

  it('should provide proper accessibility attributes', () => {
    render(
      <VisualIndicator 
        value={120} 
        previousValue={100}
        showTrend={true}
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    expect(indicator).toHaveAttribute('role', 'status')
    expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('120'))
    expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('increased'))
  })

  it('should support color-blind friendly indicators', () => {
    render(
      <VisualIndicator 
        value={120} 
        previousValue={100}
        showTrend={true}
        showIcon={true}
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    // Should have both color AND non-color indicators (icons, symbols)
    expect(indicator).toHaveTextContent('↑')
    expect(indicator).toHaveTextContent('+')
    expect(indicator).toHaveClass('text-gain-600')
  })

  it('should be accessible with no axe violations', async () => {
    const { container } = render(
      <VisualIndicator 
        value={120} 
        previousValue={100}
        showTrend={true}
        showIcon={true}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should work with high contrast mode', () => {
    // Mock high contrast detection
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
      <VisualIndicator 
        value={120} 
        previousValue={100}
        showTrend={true}
        data-testid="visual-indicator"
      />
    )

    const indicator = screen.getByTestId('visual-indicator')
    expect(indicator).toHaveClass('high-contrast')
  })
})