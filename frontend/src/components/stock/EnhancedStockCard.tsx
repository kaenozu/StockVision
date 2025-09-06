import React, { useState, useCallback, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useResponsive } from '../../contexts/ResponsiveContext'
import { useAccessibility } from '../../contexts/AccessibilityContext'
import PriceDisplay from '../enhanced/PriceDisplay'
import VisualIndicator from '../enhanced/VisualIndicator'
import LoadingState from '../enhanced/LoadingState'

interface StockData {
  stock_code: string
  company_name: string
  current_price: number
  previous_close?: number
  price_change?: number
  percentage_change?: number
  volume?: number
  market_cap?: number
  updated_at?: string
}

interface EnhancedStockCardProps {
  stock?: StockData | null
  loading?: boolean
  error?: string
  size?: 'compact' | 'normal' | 'expanded'
  onToggleFavorite?: (stockCode: string, isFavorite: boolean) => void
  isFavorite?: boolean
  onClick?: (stock: StockData) => void
  onRetry?: () => void
  className?: string
  dateFormatter?: (date: string) => string
  accessibility?: {
    ariaLabel?: string
    keyboardNavigation?: boolean
  }
  'data-testid'?: string
}

export const EnhancedStockCard: React.FC<EnhancedStockCardProps> = ({
  stock,
  loading = false,
  error,
  size = 'normal',
  onToggleFavorite,
  isFavorite = false,
  onClick,
  onRetry,
  className = '',
  dateFormatter,
  accessibility,
  'data-testid': testId = 'stock-card'
}) => {
  const { actualTheme } = useTheme()
  const { isMobile, isTablet, isDesktop } = useResponsive()
  const { 
    focusMode, 
    reducedMotion, 
    highContrast,
    keyboardNavigation,
    announce
  } = useAccessibility()

  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [localFavorite, setLocalFavorite] = useState(isFavorite)

  useEffect(() => {
    setLocalFavorite(isFavorite)
  }, [isFavorite])

  // Determine responsive layout
  const layout = isMobile ? 'vertical' : 'horizontal'
  const cardSize = isMobile ? 'compact' : size

  // Size-based classes
  const sizeClasses = {
    compact: 'p-3 text-sm',
    normal: isDesktop ? 'p-6' : isTablet ? 'p-4' : 'p-3',
    expanded: 'p-8'
  }

  // Theme classes
  const themeClasses = actualTheme === 'dark'
    ? 'dark:bg-secondary-800 dark:text-white dark:border-secondary-700'
    : 'bg-white text-secondary-900 border-secondary-200'

  // High contrast classes
  const contrastClasses = highContrast
    ? 'high-contrast border-2'
    : 'border'

  // Focus classes
  const focusClasses = focusMode || keyboardNavigation
    ? 'focus-mode focus:outline-focus focus:ring-2'
    : ''

  // Animation classes
  const animationClasses = !reducedMotion
    ? 'transition-all duration-300 hover:shadow-medium hover:scale-102'
    : 'motion-reduce:transition-none motion-reduce:transform-none'

  // Handle keyboard interaction
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!accessibility?.keyboardNavigation) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (onClick && stock) {
          onClick(stock)
          announce(`Selected ${stock.company_name}`)
        }
        break
      case 'f':
      case 'F':
        e.preventDefault()
        if (onToggleFavorite && stock) {
          const newFavoriteState = !localFavorite
          setLocalFavorite(newFavoriteState)
          onToggleFavorite(stock.stock_code, newFavoriteState)
          announce(newFavoriteState ? 'Added to favorites' : 'Removed from favorites')
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        // Navigate to next card
        const nextElement = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement
        if (nextElement) nextElement.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        // Navigate to previous card
        const prevElement = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement
        if (prevElement) prevElement.focus()
        break
      case 'Home':
        e.preventDefault()
        // Navigate to first card
        const parent = (e.currentTarget as HTMLElement).parentElement
        const firstChild = parent?.firstElementChild as HTMLElement
        if (firstChild) firstChild.focus()
        break
      case 'End':
        e.preventDefault()
        // Navigate to last card
        const parentEnd = (e.currentTarget as HTMLElement).parentElement
        const lastChild = parentEnd?.lastElementChild as HTMLElement
        if (lastChild) lastChild.focus()
        break
    }
  }, [stock, onClick, onToggleFavorite, localFavorite, announce, accessibility])

  // Format market cap
  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `¥${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `¥${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `¥${(value / 1e6).toFixed(1)}M`
    return `¥${value.toLocaleString()}`
  }

  // Format volume
  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
    return value.toLocaleString()
  }

  // Format date
  const formatDate = (date: string) => {
    if (dateFormatter) return dateFormatter(date)
    
    const dateObj = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    
    return dateObj.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Generate ARIA label
  const getAriaLabel = () => {
    if (accessibility?.ariaLabel) return accessibility.ariaLabel
    if (!stock) return 'Stock card'
    
    const priceChange = stock.price_change
    const changeText = priceChange && priceChange > 0 ? 'up' :
                      priceChange && priceChange < 0 ? 'down' :
                      'unchanged'
    
    return `${stock.company_name}, stock code ${stock.stock_code}, current price ${stock.current_price} yen, ${changeText} ${Math.abs(priceChange || 0)} yen`
  }

  // Loading state
  if (loading) {
    return (
      <div className={`rounded-lg ${sizeClasses[cardSize]} ${themeClasses} ${className}`}>
        <LoadingState type="skeleton" variant="stock-card" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div 
        className={`rounded-lg ${sizeClasses[cardSize]} ${themeClasses} ${className}`}
        data-testid="error-state"
      >
        <div className="text-loss-600 dark:text-loss-400">{error}</div>
        {onRetry && (
          <button
            className="mt-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            onClick={onRetry}
            data-testid="retry-button"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  // No data state
  if (!stock) {
    return (
      <div 
        className={`rounded-lg ${sizeClasses[cardSize]} ${themeClasses} ${className}`}
        data-testid={testId}
      >
        <div className="text-secondary-500">No data available</div>
      </div>
    )
  }

  const indicatorType = stock.price_change && stock.price_change > 0 ? 'gain' :
                       stock.price_change && stock.price_change < 0 ? 'loss' :
                       'neutral'

  return (
    <article
      className={`
        rounded-lg shadow-sm cursor-pointer
        ${layout === 'vertical' ? 'flex-col' : 'flex-row'} flex
        ${sizeClasses[cardSize]}
        ${themeClasses}
        ${contrastClasses}
        ${focusClasses}
        ${animationClasses}
        ${isHovered ? 'shadow-medium scale-102' : ''}
        ${isFocused ? 'ring-2 ring-primary-500' : ''}
        ${className}
      `}
      data-testid={testId}
      role="article"
      aria-label={getAriaLabel()}
      tabIndex={accessibility?.keyboardNavigation || focusMode ? 0 : -1}
      onClick={() => onClick && onClick(stock)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {/* Header */}
      <div className={`flex-1 ${layout === 'vertical' ? 'mb-3' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {stock.company_name}
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400 text-sm">
              {stock.stock_code}
            </p>
          </div>
          
          {/* Favorite button */}
          {onToggleFavorite && (
            <button
              className={`
                ${isMobile ? 'h-12 w-12' : 'h-8 w-8'}
                flex items-center justify-center
                rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700
                transition-colors
                ${localFavorite ? 'text-yellow-500' : 'text-secondary-400'}
              `}
              onClick={(e) => {
                e.stopPropagation()
                const newState = !localFavorite
                setLocalFavorite(newState)
                onToggleFavorite(stock.stock_code, newState)
              }}
              aria-label={localFavorite ? 'Remove from favorites' : 'Add to favorites'}
              data-testid="favorite-button"
            >
              {localFavorite ? '★' : '☆'}
            </button>
          )}
        </div>
      </div>

      {/* Price Display */}
      <div className={`${layout === 'vertical' ? 'mb-3' : 'ml-auto'}`}>
        <PriceDisplay
          currentPrice={stock.current_price}
          previousPrice={stock.previous_close}
          currency="JPY"
          size={isMobile ? 'sm' : 'md'}
          layout={layout}
          showPercentage={!isMobile || cardSize !== 'compact'}
        />
      </div>

      {/* Additional Info */}
      {isDesktop && cardSize !== 'compact' && (
        <div 
          className="flex items-center gap-4 text-sm text-secondary-600 dark:text-secondary-400 mt-3"
          data-testid="stock-additional-info"
        >
          {stock.volume !== undefined && (
            <div className="flex items-center gap-1" data-testid="volume-indicator">
              <span className="font-medium">Vol:</span>
              <span>{formatVolume(stock.volume)}</span>
            </div>
          )}
          
          {stock.market_cap !== undefined && (
            <div className="flex items-center gap-1" data-testid="market-cap">
              <span className="font-medium">Cap:</span>
              <span>{formatMarketCap(stock.market_cap)}</span>
            </div>
          )}
          
          {stock.updated_at && (
            <div 
              className="ml-auto text-xs"
              aria-label={`Updated ${formatDate(stock.updated_at)}`}
              data-testid="updated-time"
            >
              {formatDate(stock.updated_at)}
            </div>
          )}
        </div>
      )}

      {/* Mobile volume indicator */}
      {isMobile && stock.volume !== undefined && (
        <div 
          className="text-xs text-secondary-500 dark:text-secondary-400 mt-2"
          data-testid="volume-indicator"
        >
          Vol: {formatVolume(stock.volume)}
        </div>
      )}

      {/* Visual indicator for price change */}
      {cardSize === 'compact' && (
        <VisualIndicator
          type={indicatorType}
          size="sm"
          variant="arrow"
          data-testid="visual-indicator"
        />
      )}
    </article>
  )
}

// Also export as StockCard for compatibility
export const StockCard = EnhancedStockCard

// Export compact and detailed versions for DemoPage
export const CompactEnhancedStockCard: React.FC<EnhancedStockCardProps> = (props) => {
  return <EnhancedStockCard {...props} size="compact" />
}

export const DetailedEnhancedStockCard: React.FC<EnhancedStockCardProps> = (props) => {
  return <EnhancedStockCard {...props} size="expanded" />
}

export default EnhancedStockCard