/**
 * Stock Detail Page Component
 * 
 * Comprehensive stock information page with current price, historical data,
 * interactive charts, and watchlist management.
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useStockInfo } from '../hooks/useStock'
import { useWatchlistItem } from '../hooks/useWatchlist'
import StockCard from '../components/stock/StockCard'
import PriceChart from '../components/stock/PriceChart'
import Button, { IconButton } from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { ChartConfig, ChartTimeframe } from '../types/stock'
import { formatPrice, formatTimestamp } from '../utils/formatters'

export function StockDetailPage() {
  const { stockCode } = useParams<{ stockCode: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const useRealData = searchParams.get('real') === 'true'
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    timeframe: '30d',
    chart_type: 'line',
    show_volume: false,
    theme: 'light'
  })

  // Get days from timeframe
  const getDaysFromTimeframe = (timeframe: ChartTimeframe): number => {
    switch (timeframe) {
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      case '1y': return 365
      default: return 30
    }
  }

  const historyDays = getDaysFromTimeframe(chartConfig.timeframe)

  // Fetch stock data
  const stockInfo = useStockInfo(
    stockCode,
    historyDays,
    useRealData,
    true // Auto-refresh current price
  )

  const watchlistItem = useWatchlistItem(stockCode || '')

  // Handle chart configuration changes
  const handleChartConfigChange = (newConfig: ChartConfig) => {
    setChartConfig(newConfig)
  }

  // Handle real data toggle
  const handleRealDataToggle = () => {
    const newSearchParams = new URLSearchParams(searchParams)
    if (useRealData) {
      newSearchParams.delete('real')
    } else {
      newSearchParams.set('real', 'true')
    }
    setSearchParams(newSearchParams)
  }

  // Add to watchlist with modal (simplified for now)
  const handleAddToWatchlist = async () => {
    try {
      await watchlistItem.addToWatchlist()
    } catch (error) {
      console.error('Failed to add to watchlist:', error)
    }
  }

  // Remove from watchlist
  const handleRemoveFromWatchlist = async () => {
    try {
      await watchlistItem.removeFromWatchlist()
    } catch (error) {
      console.error('Failed to remove from watchlist:', error)
    }
  }

  // Loading state
  if (!stockCode) {
    return (
      <div className="text-center py-12">
        <ErrorMessage error="銘柄コードが指定されていません" />
        <Button
          variant="primary"
          onClick={() => navigate('/')}
          className="mt-4"
        >
          ホームに戻る
        </Button>
      </div>
    )
  }

  if (stockInfo.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            icon="←"
          >
            戻る
          </Button>
          <LoadingSpinner size="lg" showMessage message="株式データを取得中..." />
        </div>
      </div>
    )
  }

  if (stockInfo.isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            icon="←"
          >
            戻る
          </Button>
        </div>
        <ErrorMessage 
          error={stockInfo.error} 
          onRetry={stockInfo.refresh}
          retryText="再読み込み"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          icon="←"
        >
          戻る
        </Button>
        
        <div className="flex items-center gap-3">
          {/* Real Data Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useRealData}
                onChange={handleRealDataToggle}
                className="sr-only"
              />
              <div className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${useRealData ? 'bg-blue-600' : 'bg-gray-200'}
              `}>
                <span className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${useRealData ? 'translate-x-6' : 'translate-x-1'}
                `} />
              </div>
            </label>
            <span className="text-sm text-gray-600">
              リアルデータ {useRealData && '(遅延あり)'}
            </span>
          </div>

          {/* Refresh Button */}
          <IconButton
            variant="ghost"
            onClick={stockInfo.refresh}
            tooltip="データを更新"
            loading={stockInfo.isLoading}
          >
            🔄
          </IconButton>
        </div>
      </div>

      {/* Stock Information Card */}
      {stockInfo.isReady && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Stock Card */}
          <div className="lg:col-span-1">
            <StockCard
              stockData={stockInfo.stockData}
              currentPrice={stockInfo.currentPrice}
              onRefresh={stockInfo.individual.currentPrice.refresh}
              showWatchlistControls={true}
            />

            {/* Additional Info */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">詳細情報</h3>
              
              <div className="space-y-3 text-sm">
                {stockInfo.currentPrice && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">市場ステータス:</span>
                      <span className="font-medium">
                        {stockInfo.currentPrice.market_status === 'open' ? '取引中' :
                         stockInfo.currentPrice.market_status === 'closed' ? '取引終了' :
                         stockInfo.currentPrice.market_status === 'pre_market' ? '取引前' :
                         stockInfo.currentPrice.market_status === 'after_hours' ? '時間外' :
                         '不明'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">最終更新:</span>
                      <span className="font-medium">
                        {formatTimestamp(stockInfo.currentPrice.timestamp)}
                      </span>
                    </div>
                  </>
                )}
                
                {stockInfo.priceHistory && stockInfo.priceHistory.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">データ期間:</span>
                    <span className="font-medium">
                      {stockInfo.priceHistory.length}日間
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">データ形式:</span>
                  <span className="font-medium">
                    {useRealData ? 'リアルタイム' : 'サンプル'}
                  </span>
                </div>
              </div>

              {/* Watchlist Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">ウォッチリスト</h4>
                
                {watchlistItem.isInWatchlist ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-green-600 text-sm">
                      ⭐ ウォッチリストに登録済み
                    </div>
                    
                    {watchlistItem.item && (
                      <div className="text-sm text-gray-600">
                        {watchlistItem.item.alert_price && (
                          <div>
                            アラート価格: {formatPrice(watchlistItem.item.alert_price)}
                          </div>
                        )}
                        {watchlistItem.item.notes && (
                          <div className="mt-1">
                            メモ: {watchlistItem.item.notes}
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={handleRemoveFromWatchlist}
                      loading={watchlistItem.isRemoving}
                    >
                      ウォッチリストから削除
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={handleAddToWatchlist}
                    loading={watchlistItem.isAdding}
                  >
                    ウォッチリストに追加
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Price Chart */}
          <div className="lg:col-span-2">
            <PriceChart
              data={stockInfo.priceHistory || []}
              loading={stockInfo.individual.priceHistory.isLoading}
              error={stockInfo.individual.priceHistory.error}
              config={chartConfig}
              onConfigChange={handleChartConfigChange}
              onRefresh={stockInfo.individual.priceHistory.refresh}
              stockCode={stockCode}
              height={500}
            />
          </div>
        </div>
      )}

      {/* Price History Table (if needed) */}
      {stockInfo.priceHistory && stockInfo.priceHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">価格履歴</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日付
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    始値
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    高値
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    安値
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    終値
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    出来高
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockInfo.priceHistory.slice(0, 10).map((item) => (
                  <tr key={item.date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(item.open)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(item.high)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(item.low)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(item.close)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.volume.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {stockInfo.priceHistory.length > 10 && (
            <div className="px-6 py-3 bg-gray-50 text-center">
              <span className="text-sm text-gray-500">
                最新10日分を表示 (全{stockInfo.priceHistory.length}日間)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default StockDetailPage