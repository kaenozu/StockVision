import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import the component that doesn't exist yet - this MUST fail
import { LoadingState } from '../../src/components/UI/LoadingState'

expect.extend(toHaveNoViolations)

describe('LoadingState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state with skeleton', () => {
    render(
      <LoadingState 
        isLoading={true}
        skeleton={true}
        data-testid="loading-state"
      />
    )

    const loading = screen.getByTestId('loading-state')
    expect(loading).toBeInTheDocument()
    expect(loading).toHaveClass('animate-pulse')
    expect(screen.getByTestId('skeleton-content')).toBeInTheDocument()
  })

  it('should render loading state without skeleton', () => {
    render(
      <LoadingState 
        isLoading={true}
        skeleton={false}
        data-testid="loading-state"
      />
    )

    const loading = screen.getByTestId('loading-state')
    expect(loading).toBeInTheDocument()
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    expect(screen.queryByTestId('skeleton-content')).not.toBeInTheDocument()
  })

  it('should render error state with message', () => {
    render(
      <LoadingState 
        isLoading={false}
        error="データの取得に失敗しました"
        data-testid="loading-state"
      />
    )

    const loading = screen.getByTestId('loading-state')
    expect(loading).toBeInTheDocument()
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
  })

  it('should render error state with retry button', () => {
    const retrySpy = vi.fn()

    render(
      <LoadingState 
        isLoading={false}
        error="ネットワークエラーが発生しました"
        retry={retrySpy}
        data-testid="loading-state"
      />
    )

    const retryButton = screen.getByRole('button', { name: /再試行/i })
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)
    expect(retrySpy).toHaveBeenCalledOnce()
  })

  it('should handle different size variants for loading', () => {
    const { rerender } = render(
      <LoadingState 
        isLoading={true}
        size="sm"
        data-testid="loading-state"
      />
    )

    expect(screen.getByTestId('loading-state')).toHaveClass('text-sm')

    rerender(
      <LoadingState 
        isLoading={true}
        size="md"
        data-testid="loading-state"
      />
    )

    expect(screen.getByTestId('loading-state')).toHaveClass('text-base')

    rerender(
      <LoadingState 
        isLoading={true}
        size="lg"
        data-testid="loading-state"
      />
    )

    expect(screen.getByTestId('loading-state')).toHaveClass('text-lg')
  })

  it('should not render when not loading and no error', () => {
    render(
      <LoadingState 
        isLoading={false}
        error={null}
        data-testid="loading-state"
      />
    )

    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument()
  })

  it('should render spinner animation', () => {
    render(
      <LoadingState 
        isLoading={true}
        skeleton={false}
        data-testid="loading-state"
      />
    )

    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin')
  })

  it('should render skeleton with correct structure', () => {
    render(
      <LoadingState 
        isLoading={true}
        skeleton={true}
        data-testid="loading-state"
      />
    )

    const skeleton = screen.getByTestId('skeleton-content')
    expect(skeleton).toBeInTheDocument()
    
    // Check skeleton elements
    expect(screen.getByTestId('skeleton-title')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-text')).toBeInTheDocument()
    expect(screen.getAllByTestId(/skeleton-line/)).toHaveLength(3)
  })

  it('should apply proper ARIA attributes for loading', () => {
    render(
      <LoadingState 
        isLoading={true}
        data-testid="loading-state"
      />
    )

    const loading = screen.getByTestId('loading-state')
    expect(loading).toHaveAttribute('role', 'status')
    expect(loading).toHaveAttribute('aria-live', 'polite')
    expect(loading).toHaveAttribute('aria-label', '読み込み中')
  })

  it('should apply proper ARIA attributes for errors', () => {
    render(
      <LoadingState 
        isLoading={false}
        error="エラーが発生しました"
        data-testid="loading-state"
      />
    )

    const loading = screen.getByTestId('loading-state')
    expect(loading).toHaveAttribute('role', 'alert')
    expect(loading).toHaveAttribute('aria-live', 'assertive')
  })

  it('should support keyboard navigation for retry button', () => {
    const retrySpy = vi.fn()

    render(
      <LoadingState 
        isLoading={false}
        error="エラーが発生しました"
        retry={retrySpy}
        data-testid="loading-state"
      />
    )

    const retryButton = screen.getByRole('button', { name: /再試行/i })
    
    // Test Tab navigation
    fireEvent.keyDown(retryButton, { key: 'Tab' })
    expect(retryButton).toHaveFocus()

    // Test Enter activation
    fireEvent.keyDown(retryButton, { key: 'Enter' })
    expect(retrySpy).toHaveBeenCalledOnce()

    // Test Space activation
    fireEvent.keyDown(retryButton, { key: ' ', code: 'Space' })
    expect(retrySpy).toHaveBeenCalledTimes(2)
  })

  it('should handle reduced motion preference', () => {
    // Mock reduced motion preference
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
      <LoadingState 
        isLoading={true}
        skeleton={true}
        data-testid="loading-state"
      />
    )

    const loading = screen.getByTestId('loading-state')
    expect(loading).toHaveClass('motion-reduce:animate-none')
  })

  it('should display custom loading message', () => {
    render(
      <LoadingState 
        isLoading={true}
        skeleton={false}
        loadingMessage="株価データを取得しています..."
        data-testid="loading-state"
      />
    )

    expect(screen.getByText('株価データを取得しています...')).toBeInTheDocument()
  })

  it('should handle timeout scenarios', () => {
    render(
      <LoadingState 
        isLoading={false}
        error="タイムアウトしました"
        retry={vi.fn()}
        data-testid="loading-state"
      />
    )

    expect(screen.getByText('タイムアウトしました')).toBeInTheDocument()
    expect(screen.getByTestId('timeout-icon')).toBeInTheDocument()
  })

  it('should support high contrast mode', () => {
    render(
      <LoadingState 
        isLoading={true}
        skeleton={true}
        highContrast={true}
        data-testid="loading-state"
      />
    )

    const loading = screen.getByTestId('loading-state')
    expect(loading).toHaveClass('high-contrast')
  })

  it('should be accessible with no axe violations in loading state', async () => {
    const { container } = render(
      <LoadingState 
        isLoading={true}
        skeleton={true}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should be accessible with no axe violations in error state', async () => {
    const { container } = render(
      <LoadingState 
        isLoading={false}
        error="エラーが発生しました"
        retry={vi.fn()}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should handle multiple error types with appropriate icons', () => {
    const { rerender } = render(
      <LoadingState 
        isLoading={false}
        error="ネットワークエラー"
        errorType="network"
        data-testid="loading-state"
      />
    )

    expect(screen.getByTestId('network-error-icon')).toBeInTheDocument()

    rerender(
      <LoadingState 
        isLoading={false}
        error="サーバーエラー"
        errorType="server"
        data-testid="loading-state"
      />
    )

    expect(screen.getByTestId('server-error-icon')).toBeInTheDocument()
  })
})