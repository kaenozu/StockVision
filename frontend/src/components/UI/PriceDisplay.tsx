import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAccessibility } from '../../contexts/AccessibilityContext'
import { useResponsive } from '../../contexts/ResponsiveContext'

export type PriceSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type PriceCurrency = 'JPY' | 'USD' | 'EUR'
export type PriceVariant = 'default' | 'compact' | 'detailed'

export interface PriceDisplayProps {
  price: number
  previousPrice?: number
  currency?: PriceCurrency
  size?: PriceSize
  variant?: PriceVariant
  showCurrency?: boolean
  showChange?: boolean
  showChangePercent?: boolean
  animate?: boolean
  highlight?: boolean
  className?: string
  'aria-label'?: string
  'data-testid'?: string
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  previousPrice,
  currency = 'JPY',
  size = 'md',
  variant = 'default',
  showCurrency = true,
  showChange = false,
  showChangePercent = false,
  animate = true,
  highlight = false,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}) => {
  const { isDark } = useTheme()
  const { reducedMotion, highContrast, announce } = useAccessibility()
  const { isMobile } = useResponsive()

  // Currency formatting configurations
  const currencyConfig = {
    JPY: {
      symbol: '¥',
      locale: 'ja-JP',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    },
    USD: {
      symbol: '$',
      locale: 'en-US',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    },
    EUR: {
      symbol: '€',
      locale: 'de-DE',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  }

  // Size configurations
  const sizeConfig = {
    xs: {
      price: 'text-xs',
      change: 'text-xs',
      symbol: 'text-xs'
    },
    sm: {
      price: 'text-sm',
      change: 'text-xs',
      symbol: 'text-sm'
    },
    md: {
      price: 'text-base',
      change: 'text-sm',
      symbol: 'text-base'
    },
    lg: {
      price: 'text-lg md:text-xl',
      change: 'text-base',
      symbol: 'text-lg'
    },
    xl: {
      price: 'text-xl md:text-2xl',
      change: 'text-lg',
      symbol: 'text-xl'
    }
  }

  // Format price with currency
  const formatPrice = (value: number) => {
    const config = currencyConfig[currency]
    
    try {
      const formatter = new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.currency,
        minimumFractionDigits: config.minimumFractionDigits,
        maximumFractionDigits: config.maximumFractionDigits
      })
      return formatter.format(value)
    } catch {
      // Fallback formatting
      const formattedValue = value.toFixed(config.maximumFractionDigits)
      return showCurrency ? `${config.symbol}${formattedValue}` : formattedValue
    }
  }

  // Calculate price change
  const priceChange = React.useMemo(() => {
    if (previousPrice === undefined) return null
    
    const change = price - previousPrice
    const changePercent = previousPrice !== 0 ? (change / Math.abs(previousPrice)) * 100 : 0
    
    return {
      absolute: change,
      percent: changePercent,
      isPositive: change > 0,
      isNegative: change < 0,
      isNeutral: change === 0
    }
  }, [price, previousPrice])

  // Get trend color classes
  const getTrendColorClasses = () => {
    if (!priceChange) return 'text-gray-900 dark:text-gray-100'
    
    if (priceChange.isPositive) {
      return 'text-green-600 dark:text-green-400'
    } else if (priceChange.isNegative) {
      return 'text-red-600 dark:text-red-400'
    }
    return 'text-gray-600 dark:text-gray-400'
  }

  // Animation classes
  const animationClasses = animate && !reducedMotion
    ? 'transition-all duration-300 ease-in-out'
    : ''

  // Highlight classes
  const highlightClasses = highlight
    ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md px-2 py-1'
    : ''

  // High contrast adjustments
  const highContrastClasses = highContrast ? 'font-bold' : ''

  // Generate accessibility label
  const getAccessibilityLabel = () => {
    if (ariaLabel) return ariaLabel

    const formattedPrice = formatPrice(price)
    let label = `価格: ${formattedPrice}`

    if (priceChange && showChange) {
      const changeText = priceChange.isPositive ? '上昇' : priceChange.isNegative ? '下落' : '変化なし'
      const changeAmount = formatPrice(Math.abs(priceChange.absolute))
      label += `, ${changeText} ${changeAmount}`
      
      if (showChangePercent) {
        label += ` (${Math.abs(priceChange.percent).toFixed(2)}パーセント)`
      }
    }

    return label
  }

  // Announce price changes
  React.useEffect(() => {
    if (priceChange && (showChange || showChangePercent)) {
      const changeText = priceChange.isPositive ? '上昇' : priceChange.isNegative ? '下落' : '変化なし'
      announce(`価格が${changeText}しました: ${formatPrice(price)}`, 'polite')
    }
  }, [price, priceChange, showChange, showChangePercent, announce])

  const containerClasses = [
    'inline-flex items-center gap-1',
    animationClasses,
    highlightClasses,
    highContrastClasses,
    isMobile ? 'touch-manipulation' : '',
    className
  ].filter(Boolean).join(' ')

  const priceClasses = [
    'font-medium tabular-nums',
    sizeConfig[size].price,
    variant === 'compact' ? 'font-normal' : '',
    variant === 'detailed' ? 'font-semibold' : '',
    showChange && priceChange ? getTrendColorClasses() : 'text-gray-900 dark:text-gray-100'
  ].filter(Boolean).join(' ')

  const changeClasses = [
    'tabular-nums',
    sizeConfig[size].change,
    getTrendColorClasses()
  ].filter(Boolean).join(' ')

  return (
    <div 
      className={containerClasses}
      aria-label={getAccessibilityLabel()}
      data-testid={testId}
      {...props}
    >
      {/* Main price display */}
      <span className={priceClasses}>
        {showCurrency ? formatPrice(price) : price.toLocaleString()}
      </span>

      {/* Price change display */}
      {showChange && priceChange && !priceChange.isNeutral && (
        <span className={changeClasses}>
          ({priceChange.isPositive ? '+' : ''}
          {showCurrency ? formatPrice(priceChange.absolute) : priceChange.absolute.toLocaleString()}
          {showChangePercent && (
            <span className="ml-1">
              {priceChange.percent > 0 ? '+' : ''}
              {priceChange.percent.toFixed(2)}%
            </span>
          )}
          )
        </span>
      )}

      {/* Percentage only display */}
      {showChangePercent && !showChange && priceChange && !priceChange.isNeutral && (
        <span className={changeClasses}>
          ({priceChange.percent > 0 ? '+' : ''}
          {priceChange.percent.toFixed(2)}%)
        </span>
      )}
    </div>
  )
}

// Preset components for common use cases
export const SimplePriceDisplay: React.FC<{
  price: number
  currency?: PriceCurrency
  size?: PriceSize
}> = ({ price, currency = 'JPY', size = 'md' }) => {
  return (
    <PriceDisplay
      price={price}
      currency={currency}
      size={size}
      variant="compact"
    />
  )
}

export const PriceWithChange: React.FC<{
  price: number
  previousPrice: number
  currency?: PriceCurrency
  size?: PriceSize
  showPercent?: boolean
}> = ({ price, previousPrice, currency = 'JPY', size = 'md', showPercent = true }) => {
  return (
    <PriceDisplay
      price={price}
      previousPrice={previousPrice}
      currency={currency}
      size={size}
      showChange={true}
      showChangePercent={showPercent}
      variant="detailed"
      animate={true}
    />
  )
}

export const CompactPriceDisplay: React.FC<{
  price: number
  previousPrice?: number
  currency?: PriceCurrency
}> = ({ price, previousPrice, currency = 'JPY' }) => {
  return (
    <PriceDisplay
      price={price}
      previousPrice={previousPrice}
      currency={currency}
      size="sm"
      variant="compact"
      showChange={!!previousPrice}
      showChangePercent={false}
      showCurrency={false}
    />
  )
}

export const HighlightedPrice: React.FC<{
  price: number
  previousPrice?: number
  currency?: PriceCurrency
  size?: PriceSize
}> = ({ price, previousPrice, currency = 'JPY', size = 'lg' }) => {
  return (
    <PriceDisplay
      price={price}
      previousPrice={previousPrice}
      currency={currency}
      size={size}
      showChange={!!previousPrice}
      showChangePercent={!!previousPrice}
      highlight={true}
      animate={true}
    />
  )
}

export default PriceDisplay