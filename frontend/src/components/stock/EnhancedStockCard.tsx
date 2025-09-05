import React from 'react'
import { StockData, CurrentPriceResponse } from '../../types/stock'
import { useAccessibility, useFocusManagement } from '../../contexts/AccessibilityContext'
import { useResponsive } from '../../contexts/ResponsiveContext'
import { formatPrice } from '../../utils/formatters'
import { useWatchlistItem } from '../../hooks/useWatchlist'

// Import our new UI components
import VisualIndicator, { TrendDirection, PriceChangeIndicator, TrendIndicator } from '../UI/VisualIndicator'
import PriceDisplay, { PriceWithChange, CompactPriceDisplay } from '../UI/PriceDisplay'
import LoadingState, { CardSkeleton, OverlayLoader } from '../UI/LoadingState'
import Button from '../ui/Button'

export interface EnhancedStockCardProps {
  stockCode?: string
  name?: string
  price?: number
  previousPrice?: number
  priceChange?: number
  priceChangePercent?: number
  marketStatus?: string
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  onViewDetails?: () => void
  onClick?: () => void
  
  // Legacy support
  stockData?: StockData | null
  currentPrice?: CurrentPriceResponse | null
  
  // UI customization
  variant?: 'default' | 'compact' | 'detailed'
  showWatchlistControls?: boolean
  responsive?: boolean
  
  // Accessibility
  accessibility?: {
    ariaLabel?: string
    keyboardNavigation?: boolean
    announceChanges?: boolean
  }
  
  className?: string
  'data-testid'?: string
}

export const EnhancedStockCard: React.FC<EnhancedStockCardProps> = ({
  stockCode: propStockCode,
  name: propName,
  price: propPrice,
  previousPrice: propPreviousPrice,
  priceChange: propPriceChange,
  priceChangePercent: propPriceChangePercent,
  marketStatus: propMarketStatus,
  loading = false,
  error = null,
  onRefresh,
  onViewDetails,
  onClick,
  
  // Legacy support
  stockData,
  currentPrice,
  
  // UI customization
  variant = 'default',
  showWatchlistControls = true,
  responsive = true,
  
  // Accessibility
  accessibility = {},
  
  className = '',
  'data-testid': testId,
  ...props
}) => {
  const { announce, reducedMotion } = useAccessibility()
  const { breakpoint, isMobile } = useResponsive()
  const { keyboardNavigation } = useFocusManagement()

  // Data resolution - prefer props over legacy data
  const displayData = React.useMemo(() => {
    // Use props first, then currentPrice, then stockData
    const resolvedStockCode = propStockCode || currentPrice?.stock_code || stockData?.stock_code || ''
    const resolvedName = propName || stockData?.company_name || ''
    const resolvedPrice = propPrice ?? currentPrice?.current_price ?? stockData?.current_price ?? 0
    const resolvedPreviousPrice = propPreviousPrice ?? currentPrice?.previous_close ?? stockData?.previous_close
    const resolvedPriceChange = propPriceChange ?? currentPrice?.price_change ?? stockData?.price_change
    const resolvedPriceChangePercent = propPriceChangePercent ?? currentPrice?.price_change_pct ?? stockData?.price_change_pct
    const resolvedMarketStatus = propMarketStatus || currentPrice?.market_status

    return {
      stockCode: resolvedStockCode,
      name: resolvedName,
      price: resolvedPrice,
      previousPrice: resolvedPreviousPrice,
      priceChange: resolvedPriceChange,
      priceChangePercent: resolvedPriceChangePercent,
      marketStatus: resolvedMarketStatus
    }
  }, [propStockCode, propName, propPrice, propPreviousPrice, propPriceChange, propPriceChangePercent, propMarketStatus, currentPrice, stockData])

  const watchlistItem = useWatchlistItem(displayData.stockCode)

  // Calculate trend for visual indicator
  const trend: TrendDirection = React.useMemo(() => {
    if (displayData.priceChange === undefined || displayData.priceChange === null) return 'neutral'
    if (displayData.priceChange > 0) return 'up'
    if (displayData.priceChange < 0) return 'down'
    return 'neutral'
  }, [displayData.priceChange])

  // Responsive size adjustments
  const getResponsiveProps = () => {
    if (!responsive) return {}
    
    switch (breakpoint) {
      case 'xs':
      case 'sm':
        return {
          priceSize: 'md' as const,
          indicatorSize: 'sm' as const,
          showDetails: false,
          compactLayout: true
        }
      case 'md':
        return {
          priceSize: 'lg' as const,
          indicatorSize: 'md' as const,
          showDetails: variant !== 'compact',
          compactLayout: false
        }
      default:
        return {
          priceSize: 'lg' as const,
          indicatorSize: 'md' as const,
          showDetails: true,
          compactLayout: false
        }
    }
  }

  const responsiveProps = getResponsiveProps()

  // Accessibility label generation
  const getAccessibilityLabel = () => {
    if (accessibility.ariaLabel) return accessibility.ariaLabel
    
    const changeText = trend === 'up' ? '上昇' : trend === 'down' ? '下落' : '変化なし'
    const priceText = displayData.price ? `${displayData.price}円` : ''
    const changeAmount = displayData.priceChange ? `${Math.abs(displayData.priceChange)}円` : ''
    const changePercent = displayData.priceChangePercent ? `${Math.abs(displayData.priceChangePercent).toFixed(2)}パーセント` : ''
    
    return `${displayData.name} ${displayData.stockCode} 現在価格${priceText} ${changeText}${changeAmount ? ` ${changeAmount}` : ''}${changePercent ? ` ${changePercent}` : ''}`
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!accessibility.keyboardNavigation) return
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (onClick) {
        onClick()
      } else if (onViewDetails) {
        onViewDetails()
      }
    }
    
    if (e.key === 'r' && e.ctrlKey && onRefresh) {
      e.preventDefault()
      onRefresh()
    }
  }

  // Announce price changes
  React.useEffect(() => {
    if (accessibility.announceChanges && displayData.priceChange !== undefined && displayData.priceChange !== 0) {
      const changeText = trend === 'up' ? '上昇' : '下落'
      announce(`${displayData.name}の価格が${changeText}しました`, 'polite')
    }
  }, [displayData.priceChange, trend, displayData.name, accessibility.announceChanges, announce])

  // Container classes
  const containerClasses = [
    'enhanced-stock-card',
    'bg-white dark:bg-gray-800',
    'border border-gray-200 dark:border-gray-700',
    'rounded-lg shadow-sm hover:shadow-md',
    'transition-all duration-200 ease-in-out',
    onClick ? 'cursor-pointer' : '',
    keyboardNavigation ? 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' : '',
    !reducedMotion ? 'hover:scale-[1.02]' : '',
    responsive && isMobile ? 'mx-2' : '',
    variant === 'compact' ? 'p-3' : responsiveProps.compactLayout ? 'p-4' : 'p-6',
    className
  ].filter(Boolean).join(' ')

  // Loading state
  if (loading) {
    return (
      <div className={containerClasses} data-testid={testId}>
        <CardSkeleton />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={containerClasses} data-testid={testId}>
        <LoadingState
          error={error}
          retry={onRefresh}
          size="md"
          className="py-8"
        />
      </div>
    )
  }

  // No data state
  if (!displayData.stockCode) {
    return (
      <div className={containerClasses} data-testid={testId}>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>株式データがありません</p>
        </div>
      </div>
    )
  }

  const handleWatchlistToggle = async () => {
    try {
      await watchlistItem.toggleWatchlist()
    } catch (error) {
      console.error('Failed to toggle watchlist:', error)
    }
  }

  return (
    <div
      className={containerClasses}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={accessibility.keyboardNavigation ? 0 : undefined}
      role={onClick ? 'button' : 'article'}
      aria-label={getAccessibilityLabel()}
      data-testid={testId}
      {...props}
    >
      <OverlayLoader loading={watchlistItem.isAdding || watchlistItem.isRemoving}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-bold text-gray-900 dark:text-gray-100 ${
                variant === 'compact' || responsiveProps.compactLayout ? 'text-lg' : 'text-xl'
              }`}>
                {displayData.stockCode}
              </h3>
              
              {/* Market Status */}
              {displayData.marketStatus && (
                <TrendIndicator
                  trend={displayData.marketStatus === 'open' ? 'up' : 'neutral'}
                  label={`市場状態: ${displayData.marketStatus}`}
                  size="sm"
                />
              )}
              
              {/* Main Trend Indicator */}
              <VisualIndicator
                trend={trend}
                value={displayData.price}
                previousValue={displayData.previousPrice}
                size={responsiveProps.indicatorSize}
                variant="subtle"
                showPercentage={false}
                animate={!reducedMotion}
              />
            </div>
            
            <p className={`text-gray-600 dark:text-gray-400 truncate ${
              variant === 'compact' || responsiveProps.compactLayout ? 'text-sm' : 'text-base'
            }`}>
              {displayData.name}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="データを更新"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            
            {showWatchlistControls && (
              <button
                onClick={(e) => { e.stopPropagation(); handleWatchlistToggle(); }}
                className={`p-2 rounded-md transition-colors ${
                  watchlistItem.isInWatchlist
                    ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label={watchlistItem.isInWatchlist ? 'ウォッチリストから削除' : 'ウォッチリストに追加'}
              >
                <svg className="w-4 h-4" fill={watchlistItem.isInWatchlist ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Price Display */}
        <div className="space-y-3">
          {displayData.previousPrice !== undefined ? (
            <PriceWithChange
              price={displayData.price}
              previousPrice={displayData.previousPrice}
              currency="JPY"
              size={responsiveProps.priceSize}
              showPercent={true}
            />
          ) : (
            <PriceDisplay
              price={displayData.price}
              currency="JPY"
              size={responsiveProps.priceSize}
            />
          )}

          {/* Price Change Indicator */}
          {displayData.previousPrice !== undefined && (
            <div className="flex items-center gap-3">
              <PriceChangeIndicator
                currentPrice={displayData.price}
                previousPrice={displayData.previousPrice}
                showPercentage={true}
                size={responsiveProps.indicatorSize}
              />
              
              {!responsiveProps.compactLayout && displayData.previousPrice && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  前日終値: {formatPrice(displayData.previousPrice)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Watchlist Information */}
        {showWatchlistControls && watchlistItem.isInWatchlist && watchlistItem.item && responsiveProps.showDetails && (
          <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {watchlistItem.item.alert_price && (
                <div className="flex justify-between items-center">
                  <span>アラート価格:</span>
                  <CompactPriceDisplay
                    price={watchlistItem.item.alert_price}
                    currency="JPY"
                  />
                </div>
              )}
              {watchlistItem.item.notes && (
                <div>
                  <span className="text-gray-500 dark:text-gray-500">メモ: </span>
                  <span>{watchlistItem.item.notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {watchlistItem.hasError && (
          <div className="pt-3 mt-3 border-t border-red-200 dark:border-red-800">
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
              <span>ウォッチリストの操作に失敗しました</span>
              <button 
                onClick={(e) => { e.stopPropagation(); watchlistItem.clearError(); }}
                className="text-red-500 hover:text-red-700 underline hover:no-underline"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!responsiveProps.compactLayout && onViewDetails && (
          <div className="mt-6">
            <Button
              variant="outline"
              fullWidth
              onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
              className="text-sm"
            >
              詳細を見る
            </Button>
          </div>
        )}
      </OverlayLoader>
    </div>
  )
}

// Preset components
export const CompactEnhancedStockCard: React.FC<Omit<EnhancedStockCardProps, 'variant'>> = (props) => {
  return <EnhancedStockCard {...props} variant="compact" />
}

export const DetailedEnhancedStockCard: React.FC<Omit<EnhancedStockCardProps, 'variant'>> = (props) => {
  return <EnhancedStockCard {...props} variant="detailed" />
}

export default EnhancedStockCard