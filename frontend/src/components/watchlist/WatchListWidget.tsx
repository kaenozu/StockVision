import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { stockApi } from '../../services/stockApi'
import { useTheme } from '../../contexts/ThemeContext'
import { useDebounce } from '../../hooks/useDebounce'
import { useToastActions } from '../ui/Toast'
import { Skeleton } from '../ui/Skeleton'

interface WatchListItem {
  id: number
  stock_code: string
  notes: string
  created_at: string
}

interface StockPrice {
  current_price: number
  price_change: number
  price_change_pct: number
}

export function WatchListWidget() {
  const [watchList, setWatchList] = useState<WatchListItem[]>([])
  const [stockPrices, setStockPrices] = useState<Record<string, StockPrice>>({})
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()
  const navigate = useNavigate()
  const toast = useToastActions()

  // メモ化された価格色計算
  const getPriceColor = useCallback((change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }, [])

  const fetchStockPrice = useCallback(async (stockCode: string) => {
    try {
      const priceData = await stockApi.getCurrentPrice(stockCode, false)
      setStockPrices(prev => ({
        ...prev,
        [stockCode]: priceData
      }))
    } catch (err) {
      console.error(`Failed to fetch price for ${stockCode}:`, err)
    }
  }, [])

  const fetchWatchList = useCallback(async () => {
    setLoading(true)
    try {
      const items = await stockApi.getWatchlist()
      const watchListItems = items.slice(0, 5) // 最初の5件のみ表示
      setWatchList(watchListItems)
      
      // 並列で価格を取得してパフォーマンス向上
      const pricePromises = watchListItems.map(item => fetchStockPrice(item.stock_code))
      await Promise.allSettled(pricePromises)
    } catch (err) {
      console.error('Failed to fetch watchlist:', err)
      toast.error('エラー', 'ウォッチリストの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [fetchStockPrice, toast])

  useEffect(() => {
    fetchWatchList()
  }, [fetchWatchList])

  // 定期的な価格更新（5分ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      if (watchList.length > 0) {
        watchList.forEach(item => fetchStockPrice(item.stock_code))
      }
    }, 5 * 60 * 1000) // 5分間隔

    return () => clearInterval(interval)
  }, [watchList, fetchStockPrice])

  const handleStockClick = useCallback((stockCode: string) => {
    navigate(`/stock/${stockCode}`)
  }, [navigate])

  const handleViewAll = useCallback(() => {
    navigate('/watchlist')
  }, [navigate])

  return (
    <div className={`rounded-lg ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    } shadow-sm border ${
      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
    } p-4`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span role="img" aria-label="お気に入り">⭐</span>
          ウォッチリスト
        </h3>
        <button
          onClick={handleViewAll}
          className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-2 py-1"
          aria-label="ウォッチリスト全体を表示"
        >
          すべて見る →
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="p-3 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton width="60px" height="1rem" />
                  <Skeleton width="80px" height="0.75rem" />
                </div>
                <div className="text-right">
                  <Skeleton width="70px" height="1rem" />
                  <Skeleton width="50px" height="0.75rem" className="mt-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : watchList.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            ウォッチリストが空です
          </div>
          <button
            onClick={() => navigate('/watchlist')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            銘柄を追加
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {watchList.map((item) => {
            const price = stockPrices[item.stock_code]
            return (
              <button
                key={item.id}
                onClick={() => handleStockClick(item.stock_code)}
                className={`w-full p-3 rounded-md cursor-pointer transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-gray-50'
                }`}
                aria-label={`${item.stock_code}の詳細を表示${item.notes ? ` - ${item.notes}` : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{item.stock_code}</span>
                    {item.notes && (
                      <span className="text-xs text-gray-500">
                        {item.notes}
                      </span>
                    )}
                  </div>
                  {price && (
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        ¥{price.current_price.toLocaleString()}
                      </div>
                      <div className={`text-xs ${getPriceColor(price.price_change)}`}>
                        {price.price_change > 0 ? '+' : ''}
                        {price.price_change.toFixed(0)}
                        ({price.price_change_pct > 0 ? '+' : ''}
                        {price.price_change_pct.toFixed(2)}%)
                      </div>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}