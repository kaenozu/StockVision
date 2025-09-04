import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAccessibility } from '../../contexts/AccessibilityContext'
import { useResponsive } from '../../contexts/ResponsiveContext'

export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type LoadingVariant = 'spinner' | 'dots' | 'skeleton' | 'pulse' | 'bars'
export type LoadingType = 'inline' | 'overlay' | 'fullscreen' | 'card'

export interface LoadingStateProps {
  loading?: boolean
  error?: string | null
  retry?: () => void
  size?: LoadingSize
  variant?: LoadingVariant
  type?: LoadingType
  message?: string
  children?: React.ReactNode
  className?: string
  'aria-label'?: string
  'data-testid'?: string
}

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  animate?: boolean
}

// Skeleton component for content placeholders
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  animate = true
}) => {
  const { reducedMotion } = useAccessibility()
  
  const animationClass = animate && !reducedMotion ? 'animate-pulse' : ''
  
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  }
  
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded ${animationClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

// Spinner component
const Spinner: React.FC<{ size: LoadingSize; className?: string }> = ({ size, className = '' }) => {
  const { reducedMotion } = useAccessibility()
  
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }
  
  const animationClass = !reducedMotion ? 'animate-spin' : 'animate-pulse'
  
  return (
    <div className={`${sizeClasses[size]} ${animationClass} ${className}`}>
      <svg
        className="w-full h-full text-blue-600 dark:text-blue-400"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}

// Dots component
const Dots: React.FC<{ size: LoadingSize; className?: string }> = ({ size, className = '' }) => {
  const { reducedMotion } = useAccessibility()
  
  const dotSizes = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4'
  }
  
  const animationClass = !reducedMotion ? 'animate-bounce' : 'animate-pulse'
  
  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`${dotSizes[size]} bg-blue-600 dark:bg-blue-400 rounded-full ${animationClass}`}
          style={{
            animationDelay: !reducedMotion ? `${index * 0.15}s` : '0s'
          }}
        />
      ))}
    </div>
  )
}

// Bars component
const Bars: React.FC<{ size: LoadingSize; className?: string }> = ({ size, className = '' }) => {
  const { reducedMotion } = useAccessibility()
  
  const barHeights = {
    xs: ['h-2', 'h-3', 'h-2', 'h-3', 'h-2'],
    sm: ['h-3', 'h-4', 'h-3', 'h-4', 'h-3'],
    md: ['h-4', 'h-6', 'h-4', 'h-6', 'h-4'],
    lg: ['h-6', 'h-8', 'h-6', 'h-8', 'h-6'],
    xl: ['h-8', 'h-12', 'h-8', 'h-12', 'h-8']
  }
  
  const barWidth = {
    xs: 'w-0.5',
    sm: 'w-1',
    md: 'w-1',
    lg: 'w-1.5',
    xl: 'w-2'
  }
  
  return (
    <div className={`flex items-end space-x-0.5 ${className}`}>
      {barHeights[size].map((height, index) => (
        <div
          key={index}
          className={`${barWidth[size]} ${height} bg-blue-600 dark:bg-blue-400 ${
            !reducedMotion ? 'animate-pulse' : ''
          }`}
          style={{
            animationDelay: !reducedMotion ? `${index * 0.1}s` : '0s'
          }}
        />
      ))}
    </div>
  )
}

// Card Skeleton component
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <div className="flex items-start space-x-3">
        <Skeleton width={48} height={48} className="rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={16} />
          <Skeleton width="80%" height={16} />
        </div>
      </div>
    </div>
  )
}

// List Skeleton component  
export const ListSkeleton: React.FC<{ items?: number; className?: string }> = ({ 
  items = 3, 
  className = '' 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3">
          <Skeleton width={40} height={40} className="rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={16} />
            <Skeleton width="50%" height={14} />
          </div>
          <Skeleton width={60} height={24} />
        </div>
      ))}
    </div>
  )
}

// Error component
const ErrorDisplay: React.FC<{
  error: string
  retry?: () => void
  size: LoadingSize
  className?: string
}> = ({ error, retry, size, className = '' }) => {
  const { announce } = useAccessibility()
  const { isMobile } = useResponsive()
  
  const iconSizes = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  }
  
  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }
  
  React.useEffect(() => {
    announce(`エラーが発生しました: ${error}`, 'assertive')
  }, [error, announce])
  
  return (
    <div className={`flex flex-col items-center space-y-2 text-red-600 dark:text-red-400 ${className}`}>
      <svg
        className={iconSizes[size]}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className={`${textSizes[size]} text-center max-w-sm`}>{error}</p>
      {retry && (
        <button
          onClick={retry}
          className={`
            px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${textSizes[size]}
            ${isMobile ? 'touch-manipulation' : ''}
            transition-colors duration-200
          `}
          aria-label="再試行"
        >
          再試行
        </button>
      )}
    </div>
  )
}

// Main LoadingState component
export const LoadingState: React.FC<LoadingStateProps> = ({
  loading = false,
  error = null,
  retry,
  size = 'md',
  variant = 'spinner',
  type = 'inline',
  message = '読み込み中...',
  children,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}) => {
  const { isDark } = useTheme()
  const { announce } = useAccessibility()
  const { isMobile } = useResponsive()
  
  // Announce loading state changes
  React.useEffect(() => {
    if (loading) {
      announce(message, 'polite')
    } else if (error) {
      announce(`エラー: ${error}`, 'assertive')
    }
  }, [loading, error, message, announce])
  
  // Type-specific container classes
  const getContainerClasses = () => {
    const base = 'flex items-center justify-center'
    
    switch (type) {
      case 'overlay':
        return `${base} absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-10`
      case 'fullscreen':
        return `${base} fixed inset-0 bg-white dark:bg-gray-900 z-50`
      case 'card':
        return `${base} p-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800`
      default:
        return base
    }
  }
  
  const containerClasses = `${getContainerClasses()} ${className}`
  
  // Render loading indicator based on variant
  const renderLoadingIndicator = () => {
    const commonProps = { size, className: 'mr-2' }
    
    switch (variant) {
      case 'dots':
        return <Dots {...commonProps} />
      case 'bars':
        return <Bars {...commonProps} />
      case 'skeleton':
        return <Skeleton width={200} height={20} />
      case 'pulse':
        return (
          <div className="w-4 h-4 bg-blue-600 dark:bg-blue-400 rounded animate-pulse mr-2" />
        )
      default:
        return <Spinner {...commonProps} />
    }
  }
  
  // Show error state
  if (error) {
    return (
      <div className={containerClasses} data-testid={testId} {...props}>
        <ErrorDisplay error={error} retry={retry} size={size} />
      </div>
    )
  }
  
  // Show loading state
  if (loading) {
    return (
      <div 
        className={containerClasses}
        role="status"
        aria-label={ariaLabel || message}
        data-testid={testId}
        {...props}
      >
        {variant !== 'skeleton' && (
          <div className="flex items-center">
            {renderLoadingIndicator()}
            {message && (
              <span className="text-gray-600 dark:text-gray-400">
                {message}
              </span>
            )}
          </div>
        )}
        {variant === 'skeleton' && renderLoadingIndicator()}
      </div>
    )
  }
  
  // Show children when not loading and no error
  return <>{children}</>
}

// Preset loading components
export const InlineLoader: React.FC<{
  message?: string
  size?: LoadingSize
}> = ({ message = '読み込み中...', size = 'sm' }) => {
  return (
    <LoadingState
      loading={true}
      size={size}
      variant="spinner"
      type="inline"
      message={message}
    />
  )
}

export const OverlayLoader: React.FC<{
  loading: boolean
  message?: string
  children: React.ReactNode
}> = ({ loading, message = '読み込み中...', children }) => {
  return (
    <div className="relative">
      {children}
      {loading && (
        <LoadingState
          loading={true}
          type="overlay"
          message={message}
        />
      )}
    </div>
  )
}

export const PageLoader: React.FC<{
  loading: boolean
  error?: string | null
  retry?: () => void
  children: React.ReactNode
}> = ({ loading, error, retry, children }) => {
  if (loading) {
    return (
      <LoadingState
        loading={true}
        type="fullscreen"
        size="lg"
        message="ページを読み込んでいます..."
      />
    )
  }
  
  if (error) {
    return (
      <LoadingState
        error={error}
        retry={retry}
        type="fullscreen"
        size="lg"
      />
    )
  }
  
  return <>{children}</>
}

export default LoadingState