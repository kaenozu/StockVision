/**
 * Stock Card Component
 * 
 * Displays stock information in a card format with price changes,
 * market status, and action buttons. Supports loading and error states.
 */

import React from 'react'
import { StockData, CurrentPriceResponse } from '../../types/stock'
import { formatPrice, formatPriceChange, formatPercentageChange, formatMarketStatus } from '../../utils/formatters'
import { useWatchlistItem } from '../../hooks/useWatchlist'
import Button, { IconButton } from '../UI/Button'
import LoadingSpinner from '../UI/LoadingSpinner'
import ErrorMessage from '../UI/ErrorMessage'

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

export function StockCard({
  stockData,
  currentPrice,
  loading = false,
  error = null,
  onRefresh,
  onViewDetails,
  showWatchlistControls = true,
  compact = false,
  className = ''
}: StockCardProps) {
  const stockCode = stockData?.stock_code || currentPrice?.stock_code || ''
  const watchlistItem = useWatchlistItem(stockCode)

  // Use current price data if available, otherwise fall back to stock data
  const displayData = currentPrice || stockData
  const marketStatus = currentPrice?.market_status

  if (loading) {
    return (
      <div className={`stock-card ${className}`}>
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" showMessage message="株式データを取得中..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`stock-card ${className}`}>
        <ErrorMessage 
          error={error} 
          onRetry={onRefresh}
          retryText="再読み込み"
        />
      </div>
    )
  }

  if (!displayData) {
    return (
      <div className={`stock-card ${className}`}>
        <div className="text-center py-8 text-gray-500">
          株式データがありません
        </div>
      </div>
    )
  }

  const priceChange = formatPriceChange(displayData.price_change)
  const percentChange = formatPercentageChange(displayData.price_change_pct)
  const marketStatusInfo = marketStatus ? formatMarketStatus(marketStatus) : null

  const handleWatchlistToggle = async () => {
    try {
      await watchlistItem.toggleWatchlist()
    } catch (error) {
      console.error('Failed to toggle watchlist:', error)
    }
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
            {marketStatusInfo && (
              <div className="flex items-center gap-1">
                <span className="text-sm">{marketStatusInfo.icon}</span>
                <span className={`text-xs font-medium ${marketStatusInfo.colorClass}`}>
                  {marketStatusInfo.text}
                </span>
              </div>
            )}
          </div>
          <p className={`text-gray-600 truncate ${compact ? 'text-sm' : 'text-base'}`}>
            {displayData.company_name}
          </p>
        </div>

        {/* Action Buttons */}
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
              onClick={handleWatchlistToggle}
              tooltip={watchlistItem.isInWatchlist ? 'ウォッチリストから削除' : 'ウォッチリストに追加'}
            >
              {watchlistItem.isInWatchlist ? '⭐' : '☆'}
            </IconButton>
          )}
        </div>
      </div>

      {/* Price Information */}
      <div className="space-y-3">
        {/* Current Price */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className={`font-bold ${compact ? 'text-2xl' : 'text-3xl'} text-gray-900`}>
              {formatPrice(displayData.current_price)}
            </span>
          </div>
        </div>

        {/* Price Change */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${priceChange.colorClass}`}>
              {priceChange.formatted}
            </span>
            <span className={`font-medium ${percentChange.colorClass}`}>
              ({percentChange.formatted})
            </span>
          </div>
          
          {!compact && (
            <div className="text-sm text-gray-500">
              前日比: {formatPrice(displayData.previous_close)}
            </div>
          )}
        </div>

        {/* Watchlist Information */}
        {showWatchlistControls && watchlistItem.isInWatchlist && watchlistItem.item && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {(watchlistItem.item.alert_price_high !== null || watchlistItem.item.alert_price_low !== null) && (
                <div className="flex justify-between">
                  <span>アラート価格:</span>
                  <span className="font-medium">
                    {watchlistItem.item.alert_price_high !== null && (
                      <span className="text-green-600">⬆️ {formatPrice(watchlistItem.item.alert_price_high)} </span>
                    )}
                    {watchlistItem.item.alert_price_low !== null && (
                      <span className="text-red-600">⬇️ {formatPrice(watchlistItem.item.alert_price_low)}</span>
                    )}
                  </span>
                </div>
              )}
              {watchlistItem.item.notes && (
                <div className="mt-1">
                  <span className="text-gray-500">メモ: </span>
                  <span>{watchlistItem.item.notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {watchlistItem.hasError && (
          <div className="pt-2">
            <div className="text-sm text-red-600">
              ウォッチリストの操作に失敗しました
              <button 
                onClick={watchlistItem.clearError}
                className="ml-2 text-red-500 underline hover:no-underline"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!compact && onViewDetails && (
        <div className="mt-6">
          <Button
            variant="outline"
            fullWidth
            onClick={onViewDetails}
          >
            詳細を見る
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Compact Stock Card for lists
 */
export function CompactStockCard({
  stockData,
  currentPrice,
  loading = false,
  error = null,
  onClick,
  className = ''
}: Omit<StockCardProps, 'compact' | 'onViewDetails'> & {
  onClick?: () => void
}) {
  return (
    <div 
      className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={onClick}
    >
      <StockCard
        stockData={stockData}
        currentPrice={currentPrice}
        loading={loading}
        error={error}
        compact={true}
        showWatchlistControls={false}
      />
    </div>
  )
}

/**
 * Stock Card Skeleton (for loading states)
 */
export function StockCardSkeleton({
  compact = false,
  className = ''
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <div className={`stock-card ${compact ? 'p-4' : 'p-6'} ${className}`}>
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
    </div>
  )
}

export default StockCard
