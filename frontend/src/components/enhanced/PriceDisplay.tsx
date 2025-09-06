import React, { useEffect, useState, useMemo } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useResponsive } from '../../contexts/ResponsiveContext'
import { useAccessibility } from '../../contexts/AccessibilityContext'
import VisualIndicator, { IndicatorType } from './VisualIndicator'

export type PriceDisplaySize = 'sm' | 'md' | 'lg' | 'xl'
export type PriceDisplayLayout = 'horizontal' | 'vertical' | 'compact'

interface PriceDisplayProps {
  currentPrice: number
  previousPrice?: number
  currency?: string
  size?: PriceDisplaySize
  layout?: PriceDisplayLayout
  showPercentage?: boolean
  showIndicator?: boolean
  showCurrency?: boolean
  animated?: boolean
  precision?: number
  className?: string
  'data-testid'?: string
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  currentPrice,
  previousPrice,
  currency = 'JPY',
  size = 'md',
  layout = 'horizontal',
  showPercentage = true,
  showIndicator = true,
  showCurrency = true,
  animated = true,
  precision = 2,
  className = '',
  'data-testid': testId = 'price-display'
}) => {
  const { actualTheme } = useTheme()
  const { isMobile, isTablet } = useResponsive()
  const { reducedMotion, highContrast, fontSize } = useAccessibility()
  
  const [isAnimating, setIsAnimating] = useState(false)
  const [previousCurrentPrice, setPreviousCurrentPrice] = useState(currentPrice)

  // Calculate price change
  const priceChange = useMemo(() => {
    if (previousPrice === undefined) return 0
    return currentPrice - previousPrice
  }, [currentPrice, previousPrice])

  // Calculate percentage change
  const percentageChange = useMemo(() => {
    if (previousPrice === undefined || previousPrice === 0) return 0
    return ((currentPrice - previousPrice) / previousPrice) * 100
  }, [currentPrice, previousPrice])

  // Determine indicator type
  const indicatorType: IndicatorType = useMemo(() => {
    if (priceChange > 0) return 'gain'
    if (priceChange < 0) return 'loss'
    if (priceChange === 0) return 'neutral'
    return 'unknown'
  }, [priceChange])

  // Handle price animation
  useEffect(() => {
    if (currentPrice !== previousCurrentPrice && animated && !reducedMotion) {
      setIsAnimating(true)
      setPreviousCurrentPrice(currentPrice)
      
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [currentPrice, previousCurrentPrice, animated, reducedMotion])

  // Size classes mapping
  const sizeClasses = {
    sm: {
      price: 'text-lg font-semibold',
      change: 'text-sm',
      percentage: 'text-xs',
      container: 'gap-1'
    },
    md: {
      price: 'text-2xl font-semibold',
      change: 'text-base',
      percentage: 'text-sm',
      container: 'gap-2'
    },
    lg: {
      price: 'text-3xl font-bold',
      change: 'text-lg',
      percentage: 'text-base',
      container: 'gap-3'
    },
    xl: {
      price: 'text-4xl font-bold',
      change: 'text-xl',
      percentage: 'text-lg',
      container: 'gap-4'
    }
  }

  // Responsive size adjustments
  const responsiveSize = useMemo(() => {
    if (isMobile && size === 'xl') return 'lg'
    if (isMobile && size === 'lg') return 'md'
    if (isTablet && size === 'xl') return 'lg'
    return size
  }, [size, isMobile, isTablet])

  // Layout classes
  const layoutClasses = {
    horizontal: 'flex-row items-center',
    vertical: 'flex-col items-start',
    compact: 'flex-row items-center flex-wrap'
  }

  // Responsive layout adjustments
  const responsiveLayout = useMemo(() => {
    if (isMobile && layout === 'horizontal') return 'vertical'
    return layout
  }, [layout, isMobile])

  // Color classes for price changes
  const getChangeColorClasses = () => {
    if (highContrast) {
      return {
        gain: 'text-green-900 dark:text-green-100',
        loss: 'text-red-900 dark:text-red-100',
        neutral: 'text-gray-900 dark:text-gray-100'
      }
    }
    
    return {
      gain: 'text-gain-600 dark:text-gain-400',
      loss: 'text-loss-600 dark:text-loss-400',
      neutral: 'text-secondary-600 dark:text-secondary-400'
    }
  }

  const changeColors = getChangeColorClasses()
  const changeColorClass = priceChange > 0 ? changeColors.gain :
                          priceChange < 0 ? changeColors.loss :
                          changeColors.neutral

  // Animation classes
  const animationClasses = animated && !reducedMotion
    ? 'transition-all duration-300 ease-in-out'
    : reducedMotion
      ? 'motion-reduce:transition-none'
      : ''

  // Format currency
  const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('ja-JP', {
      style: showCurrency ? 'currency' : 'decimal',
      currency: currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    })
    return formatter.format(value)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Generate ARIA label
  const getAriaLabel = () => {
    const priceText = `Current price ${formatCurrency(currentPrice)}`
    
    if (previousPrice === undefined) {
      return priceText
    }
    
    const changeText = priceChange > 0 ? 'increased' : 
                      priceChange < 0 ? 'decreased' : 
                      'unchanged'
    
    const changeAmount = `by ${formatCurrency(Math.abs(priceChange))}`
    const percentText = showPercentage ? ` (${formatPercentage(Math.abs(percentageChange))})` : ''
    
    return `${priceText}, ${changeText} ${changeAmount}${percentText}`
  }

  return (
    <div
      className={`flex ${layoutClasses[responsiveLayout]} ${sizeClasses[responsiveSize].container} ${className}`}
      data-testid={`${testId}-container`}
      aria-label={getAriaLabel()}
    >
      {/* Current Price */}
      <div 
        className={`${sizeClasses[responsiveSize].price} ${animationClasses} ${
          isAnimating ? 'animate-pulse' : ''
        } ${actualTheme === 'dark' ? 'text-white' : 'text-secondary-900'}`}
        data-testid="current-price"
      >
        {formatCurrency(currentPrice)}
      </div>

      {/* Price Change and Indicator */}
      {previousPrice !== undefined && (
        <div 
          className={`flex items-center gap-1 ${
            responsiveLayout === 'vertical' ? 'mt-1' : ''
          }`}
          data-testid="price-change-container"
        >
          {/* Visual Indicator */}
          {showIndicator && (
            <VisualIndicator
              type={indicatorType}
              size={responsiveSize === 'xl' ? 'lg' : responsiveSize === 'lg' ? 'md' : 'sm'}
              variant="arrow"
              animated={animated}
              data-testid="price-change-indicator"
            />
          )}

          {/* Price Change Value */}
          <span
            className={`${sizeClasses[responsiveSize].change} ${changeColorClass} ${animationClasses} font-medium`}
            data-testid="price-change-value"
          >
            {priceChange >= 0 ? '+' : ''}{formatCurrency(priceChange)}
          </span>

          {/* Percentage Change */}
          {showPercentage && (
            <span
              className={`${sizeClasses[responsiveSize].percentage} ${changeColorClass} ${animationClasses} opacity-80`}
              data-testid="percentage-change"
            >
              ({formatPercentage(percentageChange)})
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default PriceDisplay