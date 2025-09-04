import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAccessibility } from '../../contexts/AccessibilityContext'
import { useResponsive } from '../../contexts/ResponsiveContext'

export type TrendDirection = 'up' | 'down' | 'neutral'
export type IndicatorSize = 'sm' | 'md' | 'lg'
export type IndicatorVariant = 'default' | 'subtle' | 'bold'

export interface VisualIndicatorProps {
  trend: TrendDirection
  value?: number
  previousValue?: number
  percentage?: number
  size?: IndicatorSize
  variant?: IndicatorVariant
  showArrow?: boolean
  showPercentage?: boolean
  colorBlindFriendly?: boolean
  animate?: boolean
  className?: string
  'aria-label'?: string
  'data-testid'?: string
}

export const VisualIndicator: React.FC<VisualIndicatorProps> = ({
  trend,
  value,
  previousValue,
  percentage,
  size = 'md',
  variant = 'default',
  showArrow = true,
  showPercentage = false,
  colorBlindFriendly = true,
  animate = true,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}) => {
  const { isDark } = useTheme()
  const { reducedMotion, highContrast, announce } = useAccessibility()
  const { isMobile } = useResponsive()

  // Calculate percentage if not provided
  const calculatedPercentage = React.useMemo(() => {
    if (percentage !== undefined) return percentage
    if (value !== undefined && previousValue !== undefined && previousValue !== 0) {
      return ((value - previousValue) / Math.abs(previousValue)) * 100
    }
    return 0
  }, [percentage, value, previousValue])

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'text-xs gap-1',
      arrow: 'w-3 h-3',
      text: 'text-xs',
      icon: 'w-2 h-2'
    },
    md: {
      container: 'text-sm gap-1.5',
      arrow: 'w-4 h-4',
      text: 'text-sm',
      icon: 'w-3 h-3'
    },
    lg: {
      container: 'text-base gap-2',
      arrow: 'w-5 h-5',
      text: 'text-base',
      icon: 'w-4 h-4'
    }
  }

  // Color configurations
  const getColorClasses = () => {
    const baseColors = {
      up: colorBlindFriendly 
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-green-600 dark:text-green-400',
      down: colorBlindFriendly 
        ? 'text-orange-600 dark:text-orange-400' 
        : 'text-red-600 dark:text-red-400',
      neutral: 'text-gray-600 dark:text-gray-400'
    }

    const backgroundColors = {
      up: colorBlindFriendly 
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      down: colorBlindFriendly 
        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      neutral: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    }

    if (variant === 'subtle') {
      return `${baseColors[trend]} ${backgroundColors[trend]}`
    } else if (variant === 'bold') {
      return `${baseColors[trend]} font-semibold`
    }
    return baseColors[trend]
  }

  // High contrast adjustments
  const highContrastClasses = highContrast ? 'font-bold border-2' : ''

  // Animation classes
  const animationClasses = animate && !reducedMotion 
    ? 'transition-all duration-200 ease-in-out hover:scale-105' 
    : ''

  // Arrow icons
  const ArrowIcon = ({ direction }: { direction: TrendDirection }) => {
    if (!showArrow) return null

    const iconClasses = `${sizeConfig[size].arrow} ${animationClasses}`

    switch (direction) {
      case 'up':
        return (
          <svg 
            className={iconClasses} 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        )
      case 'down':
        return (
          <svg 
            className={iconClasses} 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )
      case 'neutral':
        return (
          <svg 
            className={iconClasses} 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  // Pattern indicators for color-blind users
  const PatternIndicator = ({ direction }: { direction: TrendDirection }) => {
    if (!colorBlindFriendly) return null

    const patterns = {
      up: '▲',
      down: '▼',
      neutral: '●'
    }

    return (
      <span className={`${sizeConfig[size].icon} inline-block`} aria-hidden="true">
        {patterns[direction]}
      </span>
    )
  }

  // Generate accessibility label
  const getAccessibilityLabel = () => {
    if (ariaLabel) return ariaLabel

    const trendText = {
      up: '上昇',
      down: '下落',
      neutral: '変化なし'
    }

    const percentageText = showPercentage && Math.abs(calculatedPercentage) > 0 
      ? ` ${Math.abs(calculatedPercentage).toFixed(2)}パーセント`
      : ''

    return `価格トレンド: ${trendText[trend]}${percentageText}`
  }

  // Announce trend changes
  React.useEffect(() => {
    if (value !== undefined && previousValue !== undefined) {
      const trendText = {
        up: '価格が上昇しました',
        down: '価格が下落しました',
        neutral: '価格に変化はありません'
      }
      announce(trendText[trend], 'polite')
    }
  }, [trend, value, previousValue, announce])

  const containerClasses = [
    'inline-flex items-center justify-center',
    sizeConfig[size].container,
    getColorClasses(),
    highContrastClasses,
    animationClasses,
    variant === 'subtle' ? 'px-2 py-1 rounded-md border' : '',
    isMobile ? 'touch-manipulation' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <div 
      className={containerClasses}
      aria-label={getAccessibilityLabel()}
      data-testid={testId}
      role="img"
      {...props}
    >
      <ArrowIcon direction={trend} />
      {colorBlindFriendly && <PatternIndicator direction={trend} />}
      {showPercentage && Math.abs(calculatedPercentage) > 0 && (
        <span className={sizeConfig[size].text}>
          {calculatedPercentage > 0 ? '+' : ''}
          {calculatedPercentage.toFixed(2)}%
        </span>
      )}
    </div>
  )
}

// Preset components for common use cases
export const PriceChangeIndicator: React.FC<{
  currentPrice: number
  previousPrice: number
  showPercentage?: boolean
  size?: IndicatorSize
}> = ({ currentPrice, previousPrice, showPercentage = true, size = 'md' }) => {
  const trend: TrendDirection = 
    currentPrice > previousPrice ? 'up' :
    currentPrice < previousPrice ? 'down' : 'neutral'

  return (
    <VisualIndicator
      trend={trend}
      value={currentPrice}
      previousValue={previousPrice}
      showPercentage={showPercentage}
      size={size}
      aria-label={`価格変化: ${currentPrice}円 (前回: ${previousPrice}円)`}
    />
  )
}

export const TrendIndicator: React.FC<{
  trend: TrendDirection
  label?: string
  size?: IndicatorSize
}> = ({ trend, label, size = 'sm' }) => {
  return (
    <VisualIndicator
      trend={trend}
      size={size}
      variant="subtle"
      showPercentage={false}
      aria-label={label || `トレンド: ${trend}`}
    />
  )
}

export default VisualIndicator