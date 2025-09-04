/**
 * Home Page Component
 * 
 * Main landing page with search functionality, featured stocks,
 * and quick access to key features.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StockSearch from '../components/stock/StockSearch'
import { CompactStockCard } from '../components/stock/StockCard'
import { MiniPriceChart } from '../components/stock/PriceChart'
import { useStockData, useCurrentPrice, usePriceHistory } from '../hooks/useStock'
import { useWatchlist } from '../hooks/useWatchlist'
import { WatchListWidget } from '../components/watchlist/WatchListWidget'
import { RecentlyViewed } from '../components/stock/RecentlyViewed'
import Button from '../components/ui/Button'
import LoadingSpinner, { LoadingSkeleton } from '../components/ui/LoadingSpinner'
import { EmptyStateMessage } from '../components/ui/ErrorMessage'

export function HomePage() {
  const navigate = useNavigate()
  const [searchLoading, setSearchLoading] = useState(false)
  const watchlist = useWatchlist()

  // Featured stocks for quick access
  const featuredStocks = ['7203', '6758', '9984', '6861'] // Toyota, Sony, SoftBank, Keyence

  const handleSearch = async (stockCode: string, useRealData: boolean) => {
    setSearchLoading(true)
    try {
      // Navigate to stock details page
      const params = new URLSearchParams()
      if (useRealData) params.set('real', 'true')
      
      const url = `/stock/${stockCode}${params.toString() ? `?${params.toString()}` : ''}`
      navigate(url)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleViewAllWatchlist = () => {
    navigate('/watchlist')
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            📈 株価チェッカー
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            リアルタイムの株価情報とチャート分析で、賢い投資判断をサポートします
          </p>
        </div>

        {/* Main Search */}
        <div className="max-w-2xl mx-auto">
          <StockSearch 
            onSearch={handleSearch} 
            loading={searchLoading}
            placeholder="銘柄コードを入力してください (例: 7203)"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">10,000+</div>
            <div className="text-sm text-gray-600">利用可能銘柄数</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">
              {watchlist.items.length}
            </div>
            <div className="text-sm text-gray-600">ウォッチリスト登録数</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-purple-600">リアルタイム</div>
            <div className="text-sm text-gray-600">価格更新</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Featured Stocks and Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Featured Stocks - Takes 2 columns */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">注目銘柄</h2>
            <Button
              variant="outline"
              onClick={() => navigate('/markets')}
            >
              市場情報を見る
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredStocks.map((stockCode) => (
              <FeaturedStockCard 
                key={stockCode} 
                stockCode={stockCode}
                onClick={() => navigate(`/stock/${stockCode}`)}
              />
            ))}
          </div>
        </section>

        {/* Widgets - Takes 1 column */}
        <section className="space-y-6">
          <WatchListWidget />
          <RecentlyViewed />
        </section>
      </div>

      {/* Watchlist Preview */}
      {watchlist.items.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              マイウォッチリスト
            </h2>
            <Button
              variant="outline"
              onClick={handleViewAllWatchlist}
            >
              すべて見る ({watchlist.items.length})
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {watchlist.items.slice(0, 6).map((item) => (
              <WatchlistStockCard
                key={item.stock_code}
                stockCode={item.stock_code}
                onClick={() => navigate(`/stock/${item.stock_code}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Getting Started */}
      {watchlist.items.length === 0 && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center space-y-6">
            <div className="text-4xl">🚀</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                株価チェッカーを始めましょう
              </h2>
              <p className="text-gray-600">
                気になる銘柄を検索して、ウォッチリストに追加しましょう
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="space-y-2">
                <div className="text-2xl">🔍</div>
                <h3 className="font-semibold">1. 銘柄を検索</h3>
                <p className="text-sm text-gray-600">
                  4桁の銘柄コードで株価情報を検索できます
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">⭐</div>
                <h3 className="font-semibold">2. ウォッチリストに追加</h3>
                <p className="text-sm text-gray-600">
                  気になる銘柄をウォッチリストで管理しましょう
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">📊</div>
                <h3 className="font-semibold">3. チャートで分析</h3>
                <p className="text-sm text-gray-600">
                  価格チャートで値動きの傾向を確認できます
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/help')}
              >
                使い方を詳しく見る
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Market News (Placeholder) */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">市場ニュース</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">📰</div>
            <p>市場ニュース機能は準備中です</p>
            <p className="text-sm mt-2">近日中に最新の株式市場ニュースを提供予定です</p>
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * Featured Stock Card Component
 */
function FeaturedStockCard({ 
  stockCode, 
  onClick 
}: { 
  stockCode: string
  onClick: () => void 
}) {
  const stockData = useStockData(stockCode, false, true)
  const priceHistory = usePriceHistory(stockCode, 7, false)

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {stockData.isLoading ? (
        <LoadingSkeleton lines={3} />
      ) : stockData.isError ? (
        <div className="text-center text-red-500 text-sm py-4">
          読み込みエラー
        </div>
      ) : stockData.data ? (
        <div className="space-y-3">
          <div>
            <div className="font-bold text-lg">{stockData.data.stock_code}</div>
            <div className="text-sm text-gray-600 truncate">
              {stockData.data.company_name}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-bold">
              ¥{stockData.data.current_price.toLocaleString()}
            </div>
            <div className={`text-sm ${
              stockData.data.price_change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stockData.data.price_change >= 0 ? '+' : ''}
              {stockData.data.price_change.toFixed(2)} ({stockData.data.price_change_pct.toFixed(2)}%)
            </div>
          </div>

          {priceHistory.data && priceHistory.data.length > 0 && (
            <div className="h-16">
              <MiniPriceChart data={priceHistory.data} height={64} />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-4">
          データなし
        </div>
      )}
    </div>
  )
}

/**
 * Watchlist Stock Card Component
 */
function WatchlistStockCard({ 
  stockCode, 
  onClick 
}: { 
  stockCode: string
  onClick: () => void 
}) {
  const currentPrice = useCurrentPrice(stockCode, false)
  
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {currentPrice.isLoading ? (
        <div className="flex items-center justify-center py-6">
          <LoadingSpinner size="sm" />
        </div>
      ) : currentPrice.data ? (
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">{currentPrice.data.stock_code}</div>
            <div className="text-sm text-gray-500">
              ¥{currentPrice.data.current_price.toLocaleString()}
            </div>
          </div>
          <div className={`text-sm font-medium ${
            currentPrice.data.price_change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {currentPrice.data.price_change >= 0 ? '+' : ''}
            {currentPrice.data.price_change_pct.toFixed(2)}%
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-4">
          エラー
        </div>
      )}
    </div>
  )
}

export default HomePage