import React, { useEffect, useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useResponsive } from '../../contexts/ResponsiveContext'
import { useAccessibility } from '../../contexts/AccessibilityContext'

export type LoadingType = 'spinner' | 'skeleton' | 'shimmer' | 'dots' | 'progress'
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl'
export type SkeletonVariant = 'stock-card' | 'stock-list' | 'chart' | 'table'

interface LoadingStateProps {
  type?: LoadingType
  size?: LoadingSize
  variant?: SkeletonVariant
  message?: string
  progress?: number
  showPercentage?: boolean
  animated?: boolean
  overlay?: boolean
  overlayOpacity?: number
  cancellable?: boolean
  onCancel?: () => void
  error?: boolean
  errorMessage?: string
  onRetry?: () => void
  timeout?: number
  onTimeout?: () => void
  count?: number
  rows?: number
  color?: 'primary' | 'success' | 'danger' | 'neutral'
  className?: string
  containerClassName?: string
  spinnerClassName?: string
  'data-testid'?: string
}

const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner',
  size = 'md',
  variant = 'stock-card',
  message,
  progress = 0,
  showPercentage = false,
  animated = true,
  overlay = false,
  overlayOpacity = 0.8,
  cancellable = false,
  onCancel,
  error = false,
  errorMessage,
  onRetry,
  timeout,
  onTimeout,
  count = 1,
  rows = 3,
  color = 'primary',
  className = '',
  containerClassName = '',
  spinnerClassName = '',
  'data-testid': testId = 'loading-state'
}) => {
  const { actualTheme } = useTheme()
  const { isMobile } = useResponsive()
  const { reducedMotion } = useAccessibility()

  const [hasTimedOut, setHasTimedOut] = useState(false)

  // Handle timeout
  useEffect(() => {
    if (timeout && onTimeout && !error) {
      const timer = setTimeout(() => {
        setHasTimedOut(true)
        onTimeout()
      }, timeout)
      
      return () => clearTimeout(timer)
    }
  }, [timeout, onTimeout, error])

  // Size classes
  const sizeClasses = {
    sm: { spinner: 'w-4 h-4', skeleton: 'p-2', dots: 'w-2 h-2', text: 'text-xs' },
    md: { spinner: 'w-8 h-8', skeleton: 'p-4', dots: 'w-3 h-3', text: 'text-sm' },
    lg: { spinner: 'w-12 h-12', skeleton: 'p-6', dots: 'w-4 h-4', text: 'text-base' },
    xl: { spinner: 'w-16 h-16', skeleton: 'p-8', dots: 'w-5 h-5', text: 'text-lg' }
  }

  // Color classes
  const colorClasses = {
    primary: 'border-primary-500 text-primary-500',
    success: 'border-gain-500 text-gain-500',
    danger: 'border-loss-500 text-loss-500',
    neutral: 'border-secondary-500 text-secondary-500'
  }

  // Animation classes
  const animationClass = animated && !reducedMotion ? {
    spinner: 'animate-spin',
    skeleton: 'animate-pulse',
    shimmer: 'animate-shimmer',
    dots: 'animate-bounce',
    progress: 'transition-all duration-300'
  } : {
    spinner: reducedMotion ? 'motion-reduce:animate-none' : '',
    skeleton: reducedMotion ? 'motion-reduce:animate-none' : '',
    shimmer: reducedMotion ? 'motion-reduce:animate-none' : '',
    dots: reducedMotion ? 'motion-reduce:animate-none' : '',
    progress: reducedMotion ? 'motion-reduce:transition-none' : ''
  }

  // Error state
  if (error || hasTimedOut) {
    return (
      <div 
        className={`flex flex-col items-center justify-center gap-4 p-6 ${containerClassName}`}
        data-testid="loading-error"
      >
        <div className="text-loss-600 dark:text-loss-400">
          {errorMessage || 'Failed to load data'}
        </div>
        {onRetry && (
          <button
            className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
            onClick={onRetry}
            data-testid="loading-retry-button"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  // Render spinner
  const renderSpinner = () => (
    <div
      className={`${sizeClasses[size].spinner} ${animationClass.spinner} ${colorClasses[color]} ${spinnerClassName} border-2 border-t-transparent rounded-full`}
      data-testid="loading-spinner"
      aria-hidden="true"
    />
  )

  // Render skeleton
  const renderSkeleton = () => {
    switch (variant) {
      case 'stock-card':
        return (
          <div 
            className={`bg-secondary-200 dark:bg-secondary-700 rounded-lg ${sizeClasses[isMobile ? 'sm' : size].skeleton} ${isMobile ? 'h-24' : 'h-32'} ${animationClass.skeleton}`}
            data-testid="skeleton-stock-card"
          >
            <div className="space-y-3">
              <div className="h-6 bg-secondary-300 dark:bg-secondary-600 rounded w-3/4" data-testid="skeleton-title" />
              <div className="h-8 bg-secondary-300 dark:bg-secondary-600 rounded w-1/2" data-testid="skeleton-price" />
            </div>
          </div>
        )
      
      case 'stock-list':
        return (
          <div className="space-y-3" data-testid="skeleton-stock-list">
            {Array.from({ length: count }).map((_, i) => (
              <div 
                key={i}
                className={`bg-secondary-200 dark:bg-secondary-700 rounded-lg p-4 h-20 ${animationClass.skeleton}`}
                data-testid="skeleton-list-item"
              />
            ))}
          </div>
        )
      
      case 'chart':
        return (
          <div 
            className={`bg-secondary-200 dark:bg-secondary-700 rounded-lg h-64 ${animationClass.skeleton}`}
            data-testid="skeleton-chart"
          />
        )
      
      case 'table':
        return (
          <div className="space-y-2" data-testid="skeleton-table">
            {Array.from({ length: rows }).map((_, i) => (
              <div 
                key={i}
                className={`bg-secondary-200 dark:bg-secondary-700 rounded h-12 ${animationClass.skeleton}`}
                data-testid="skeleton-table-row"
              />
            ))}
          </div>
        )
      
      default:
        return (
          <div 
            className={`bg-secondary-200 dark:bg-secondary-700 rounded ${animationClass.skeleton} h-32 w-full`}
            data-testid="loading-skeleton"
          />
        )
    }
  }

  // Render shimmer
  const renderShimmer = () => (
    <div
      className={`relative overflow-hidden bg-secondary-200 dark:bg-secondary-700 rounded-lg h-32 w-full`}
      data-testid="loading-shimmer"
    >
      <div 
        className={`absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent ${animationClass.shimmer} will-change-transform`}
      />
    </div>
  )

  // Render dots
  const renderDots = () => (
    <div className="flex gap-1" data-testid="loading-dots">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`${sizeClasses[size].dots} ${colorClasses[color]} rounded-full ${animationClass.dots}`}
          style={{ 
            animationDelay: `${i * 150}ms`,
            backgroundColor: 'currentColor'
          }}
          data-testid="loading-dot"
        />
      ))}
    </div>
  )

  // Render progress
  const renderProgress = () => {
    const clampedProgress = Math.max(0, Math.min(100, progress))
    
    return (
      <div className="w-full" data-testid="loading-progress">
        <div className="bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden h-2">
          <div 
            className={`h-full bg-primary-500 ${animationClass.progress}`}
            style={{ width: `${clampedProgress}%` }}
            data-testid="progress-bar"
          />
        </div>
        {showPercentage && (
          <div 
            className={`mt-2 text-center ${sizeClasses[size].text} text-secondary-600 dark:text-secondary-400`}
            data-testid="progress-percentage"
          >
            {clampedProgress}%
          </div>
        )}
      </div>
    )
  }

  // Main content
  const content = (
    <>
      {type === 'spinner' && renderSpinner()}
      {type === 'skeleton' && renderSkeleton()}
      {type === 'shimmer' && renderShimmer()}
      {type === 'dots' && renderDots()}
      {type === 'progress' && renderProgress()}
      
      {message && (
        <div 
          className={`${sizeClasses[size].text} text-secondary-600 dark:text-secondary-400 mt-2`}
          data-testid="loading-message"
        >
          {message}
        </div>
      )}
      
      {cancellable && onCancel && (
        <button
          className="mt-4 px-3 py-1 text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-200 transition-colors"
          onClick={onCancel}
          data-testid="loading-cancel-button"
        >
          Cancel
        </button>
      )}
    </>
  )

  // Container classes
  const containerClasses = overlay
    ? `absolute inset-0 flex flex-col items-center justify-center z-50 bg-white/${overlayOpacity * 100} dark:bg-secondary-900/${overlayOpacity * 100}`
    : 'flex flex-col items-center justify-center'

  return (
    <div
      className={`${containerClasses} ${actualTheme === 'dark' ? 'dark:text-white' : 'text-secondary-600'} ${className} ${containerClassName}`}
      data-testid={overlay ? 'loading-overlay' : testId}
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading'}
    >
      {content}
    </div>
  )
}

export default LoadingState