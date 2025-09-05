import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '../test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'

import { LoadingState, Skeleton } from '../../src/components/UI/LoadingState'

expect.extend(toHaveNoViolations)

describe('LoadingState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render nothing when not loading and no error', () => {
    const { container } = render(<LoadingState loading={false} error={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('should render children when not loading and no error', () => {
    render(<LoadingState><div data-testid="child">Child Content</div></LoadingState>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('should render spinner variant by default', () => {
    render(<LoadingState loading={true} data-testid="loading-state" />)
    const loading = screen.getByTestId('loading-state')
    expect(loading).toBeInTheDocument()
    expect(loading.querySelector('svg')).toBeInTheDocument() // Spinner uses SVG
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should render skeleton variant', () => {
    render(<LoadingState loading={true} variant="skeleton" data-testid="loading-state" />)
    const loading = screen.getByTestId('loading-state')
    expect(loading).toBeInTheDocument()
    // Skeleton is just a div, so we check for its presence by role/aria attributes
    expect(screen.getByRole('status').querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('should render error state with message', () => {
    render(<LoadingState error="データの取得に失敗しました" data-testid="loading-state" />)
    const errorState = screen.getByTestId('loading-state')
    expect(errorState).toBeInTheDocument()
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
  })

  it('should render error state with retry button and handle click', () => {
    const retrySpy = vi.fn()
    render(<LoadingState error="ネットワークエラー" retry={retrySpy} />)
    const retryButton = screen.getByRole('button', { name: /再試行/i })
    expect(retryButton).toBeInTheDocument()
    fireEvent.click(retryButton)
    expect(retrySpy).toHaveBeenCalledTimes(1)
  })

  it('should handle different sizes', () => {
    const { rerender } = render(<LoadingState loading={true} size="sm" />)
    expect(screen.getByRole('status').firstChild).toHaveClass('w-4') // Spinner size

    rerender(<LoadingState loading={true} size="lg" />)
    expect(screen.getByRole('status').firstChild).toHaveClass('w-8')
  })

  it('should display a custom message', () => {
    render(<LoadingState loading={true} message="データを更新中..." />)
    expect(screen.getByText('データを更新中...')).toBeInTheDocument()
  })

  it('should apply proper ARIA attributes for loading', () => {
    render(<LoadingState loading={true} message="処理中" />)
    const loading = screen.getByRole('status')
    expect(loading).toHaveAttribute('aria-label', '処理中')
  })

  it('should be accessible with no axe violations in loading state', async () => {
    const { container } = render(<LoadingState loading={true} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should be accessible with no axe violations in error state', async () => {
    const { container } = render(<LoadingState error="An error occurred" retry={() => {}} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
});

describe('Skeleton', () => {
  it('should render with default props', () => {
    render(<Skeleton data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveStyle('width: 100%')
    expect(skeleton).toHaveStyle('height: 1rem')
    expect(skeleton).toHaveClass('animate-pulse')
  });

  it('should render with custom width and height', () => {
    render(<Skeleton width={100} height="50px" />)
    const skeleton = screen.getByRole('status', { hidden: true })
    expect(skeleton).toHaveStyle('width: 100px')
    expect(skeleton).toHaveStyle('height: 50px')
  });
});
