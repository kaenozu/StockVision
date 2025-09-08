/**
 * Optimized Stock Card Component
 * 
 * Performance-optimized version with React.memo, useMemo, and useCallback
 * to minimize unnecessary re-renders and improve performance.
 */

import React, { memo, useMemo, useCallback } from 'react'
import { StockData, CurrentPriceResponse } from '../../types/stock'
import { formatPrice, formatPriceChange, formatPercentageChange, formatMarketStatus } from '../../utils/formatters'
import { useWatchlistItem } from '../../hooks/useWatchlist'
import Button, { IconButton } from '../UI/Button'
import LoadingSpinner from '../UI/LoadingSpinner'
import ErrorMessage from '../UI/ErrorMessage'
import { getErrorMessage } from '../../utils/apiErrorHandler'

interface StockCardProps {
  stockData?: StockData | null
  currentPrice?: CurrentPriceResponse | null
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  onViewDetails?: () => void
  showWatchlistControls?: boolean
  compact?: boolean
  className?: string
}

export const OptimizedStockCard = memo<StockCardProps>(function OptimizedStockCard({
  stockData,
  currentPrice,
  loading = false,
  error = null,
  onRefresh,
  onViewDetails,
  showWatchlistControls = true,
  compact = false,
  className = ''
}) {
  const stockCode = stockData?.stock_code || currentPrice?.stock_code || ''
  const watchlistItem = useWatchlistItem(stockCode)

  // Memoize computed values to prevent unnecessary recalculations
  const displayData = useMemo(() => currentPrice || stockData, [currentPrice, stockData])
  const companyName = useMemo(() => stockData?.company_name || '', [stockData?.company_name])
  const marketStatus = useMemo(() => currentPrice?.market_status, [currentPrice?.market_status])

  // Memoize expensive formatting operations
  const formattedData = useMemo(() => {
    if (!displayData) return null
    
    return {
      priceChange: formatPriceChange(displayData.price_change),
      percentChange: formatPercentageChange(displayData.price_change_pct),
      marketStatusInfo: marketStatus ? formatMarketStatus(marketStatus) : null,
      currentPrice: formatPrice(displayData.current_price),
      previousClose: typeof displayData.previous_close === 'number' ? formatPrice(displayData.previous_close) : null
    }
  }, [displayData, marketStatus])

  // Memoize event handlers to prevent unnecessary re-renders
  const handleWatchlistToggle = useCallback(async () => {
    try {
      await watchlistItem.toggleWatchlist()
    } catch (error) {
      console.error('Failed to toggle watchlist:', error)
    }
  }, [watchlistItem.toggleWatchlist])

  const handleRefresh = useCallback(() => {
    onRefresh?.()
  }, [onRefresh])

  const handleViewDetails = useCallback(() => {
    onViewDetails?.()
  }, [onViewDetails])

  const handleClearError = useCallback(() => {
    watchlistItem.clearError()
  }, [watchlistItem.clearError])

  // Early returns for loading and error states
  if (loading) {
    return <StockCardSkeleton compact={compact} className={className} />
  }

  if (error) {
    return (
      <div className={`stock-card ${className}`}>
        <ErrorMessage 
          error={getErrorMessage(error)} 
          onRetry={handleRefresh}
          retryText="再読み込み"
        />
      </div>
    )
  }

  if (!displayData || !formattedData) {
    return (
      <div className={`stock-card ${className}`}>
        <div className="text-center py-8 text-gray-500">
          株式データがありません
        </div>
      </div>
    )
  }

  return (
    <div className={`stock-card ${compact ? 'p-4' : 'p-6'} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>
              {displayData.stock_code}
            </h3>
            {formattedData.marketStatusInfo && (
              <div className="flex items-center gap-1">
                <span className="text-sm">{formattedData.marketStatusInfo.icon}</span>
                <span className={`text-xs font-medium ${formattedData.marketStatusInfo.colorClass}`}>
                  {formattedData.marketStatusInfo.text}
                </span>
              </div>
            )}
          </div>
          <p className={`text-gray-600 truncate ${compact ? 'text-sm' : 'text-base'}`}>
            {companyName}
          </p>
        </div>

        {/* Action Buttons */}
        <ActionButtons
          onRefresh={onRefresh ? handleRefresh : undefined}
          showWatchlistControls={showWatchlistControls}
          watchlistItem={watchlistItem}
          onWatchlistToggle={handleWatchlistToggle}
        />
      </div>

      {/* Price Information */}
      <PriceInformation
        formattedData={formattedData}
        displayData={displayData}
        compact={compact}
      />

      {/* Watchlist Information */}
      {showWatchlistControls && watchlistItem.isInWatchlist && watchlistItem.item && (
        <WatchlistInfo item={watchlistItem.item} />
      )}

      {/* Error State */}
      {watchlistItem.hasError && (
        <div className="pt-2">
          <div className="text-sm text-red-600">
            {getErrorMessage(watchlistItem.hasError)}
            <button 
              onClick={handleClearError}
              className="ml-2 text-red-500 underline hover:no-underline"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!compact && onViewDetails && (
        <div className="mt-6">
          <Button
            variant="outline"
            fullWidth
            onClick={handleViewDetails}
          >
            詳細を見る
          </Button>
        </div>
      )}
    </div>
  )
})

// Memoized sub-components to further optimize rendering
const ActionButtons = memo<{
  onRefresh?: () => void
  showWatchlistControls: boolean
  watchlistItem: ReturnType<typeof useWatchlistItem>
  onWatchlistToggle: () => void
}>(function ActionButtons({ onRefresh, showWatchlistControls, watchlistItem, onWatchlistToggle }) {
  return (
    <div className="flex items-center gap-2">
      {onRefresh && (
        <IconButton
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          tooltip="更新"
        >
          🔄
        </IconButton>
      )}
      
      {showWatchlistControls && (
        <IconButton
          variant={watchlistItem.isInWatchlist ? 'primary' : 'ghost'}
          size="sm"
          loading={watchlistItem.isAdding || watchlistItem.isRemoving}
          onClick={onWatchlistToggle}
          tooltip={watchlistItem.isInWatchlist ? 'ウォッチリストから削除' : 'ウォッチリストに追加'}
        >
          {watchlistItem.isInWatchlist ? '⭐' : '☆'}
        </IconButton>
      )}
    </div>
  )
})

const PriceInformation = memo<{
  formattedData: NonNullable<ReturnType<typeof useMemo>>
  displayData: StockData | CurrentPriceResponse
  compact: boolean
}>(function PriceInformation({ formattedData, displayData, compact }) {
  return (
    <div className="space-y-3">
      {/* Current Price */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className={`font-bold ${compact ? 'text-2xl' : 'text-3xl'} text-gray-900`}>
            {formattedData.currentPrice}
          </span>
        </div>
      </div>

      {/* Price Change */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${formattedData.priceChange.colorClass}`}>
            {formattedData.priceChange.formatted}
          </span>
          <span className={`font-medium ${formattedData.percentChange.colorClass}`}>
            ({formattedData.percentChange.formatted})
          </span>
        </div>
        
        {!compact && formattedData.previousClose && (
          <div className="text-sm text-gray-500">
            前日比: {formattedData.previousClose}
          </div>
        )}
      </div>
    </div>
  )
})

const WatchlistInfo = memo<{
  item: NonNullable<ReturnType<typeof useWatchlistItem>['item']>
}>(function WatchlistInfo({ item }) {
  const hasAlerts = item.alert_price_high !== null || item.alert_price_low !== null

  return (
    <div className="pt-2 border-t border-gray-200">
      <div className="text-sm text-gray-600">
        {hasAlerts && (
          <div className="flex justify-between">
            <span>アラート価格:</span>
            <span className="font-medium">
              {item.alert_price_high !== null && (
                <span className="text-green-600">⬆️ {formatPrice(item.alert_price_high as number)} </span>
              )}
              {item.alert_price_low !== null && (
                <span className="text-red-600">⬇️ {formatPrice(item.alert_price_low as number)}</span>
              )}
            </span>
          </div>
        )}
        {item.notes && (
          <div className="mt-1">
            <span className="text-gray-500">メモ: </span>
            <span>{item.notes}</span>
          </div>
        )}
      </div>
    </div>
  )
})

/**
 * Optimized Compact Stock Card for lists
 */
export const OptimizedCompactStockCard = memo<
  Omit<StockCardProps, 'compact' | 'onViewDetails'> & {
    onClick?: () => void
  }
>(function OptimizedCompactStockCard({
  stockData,
  currentPrice,
  loading = false,
  error = null,
  onClick,
  className = '',
  ...otherProps
}) {
  const handleClick = useCallback(() => {
    onClick?.()
  }, [onClick])

  return (
    <div 
      className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={handleClick}
    >
      <OptimizedStockCard
        stockData={stockData}
        currentPrice={currentPrice}
        loading={loading}
        error={error}
        compact={true}
        showWatchlistControls={false}
        {...otherProps}
      />
    </div>
  )
})

/**
 * Optimized Stock Card Skeleton (for loading states)
 */
export const StockCardSkeleton = memo<{
  compact?: boolean
  className?: string
}>(function StockCardSkeleton({
  compact = false,
  className = ''
}) {
  // Memoize the skeleton structure since it's static
  const skeletonContent = useMemo(() => (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-gray-300 rounded w-20 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-gray-300 rounded"></div>
          <div className="h-8 w-8 bg-gray-300 rounded"></div>
        </div>
      </div>

      {/* Price */}
      <div className="space-y-3">
        <div className="h-8 bg-gray-300 rounded w-32"></div>
        <div className="flex gap-4">
          <div className="h-5 bg-gray-300 rounded w-20"></div>
          <div className="h-5 bg-gray-300 rounded w-16"></div>
        </div>
      </div>

      {/* Action Button */}
      {!compact && (
        <div className="mt-6">
          <div className="h-10 bg-gray-300 rounded"></div>
        </div>
      )}
    </div>
  ), [compact])

  return (
    <div className={`stock-card ${compact ? 'p-4' : 'p-6'} ${className}`}>
      {skeletonContent}
    </div>
  )
})

export default OptimizedStockCard