import React, { useState, useEffect } from 'react'
import { EnhancedStockCard } from '../components/stock/EnhancedStockCard'
import LoadingState from '../components/enhanced/LoadingState'
import { useTheme } from '../contexts/ThemeContext'

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

const RecommendedStocksPage: React.FC = () => {
  const { actualTheme } = useTheme()
  const [stocks, setStocks] = useState<StockData[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Simulate loading recommended stocks
    setTimeout(() => {
      const recommendedStocks: StockData[] = [
        {
          stock_code: '7203',
          company_name: 'トヨタ自動車',
          current_price: 2500,
          previous_close: 2450,
          price_change: 50,
          percentage_change: 2.04,
          volume: 15000000,
          market_cap: 32000000000000,
          updated_at: '2025-01-15T09:30:00Z'
        },
        {
          stock_code: '6758',
          company_name: 'ソニーグループ',
          current_price: 12000,
          previous_close: 11800,
          price_change: 200,
          percentage_change: 1.69,
          volume: 8000000,
          market_cap: 15000000000000,
          updated_at: '2025-01-15T09:30:00Z'
        },
        {
          stock_code: '9984',
          company_name: 'ソフトバンクグループ',
          current_price: 5400,
          previous_close: 5350,
          price_change: 50,
          percentage_change: 0.93,
          volume: 12000000,
          market_cap: 12000000000000,
          updated_at: '2025-01-15T09:30:00Z'
        }
      ]
      setStocks(recommendedStocks)
      setLoading(false)
    }, 1500)

    // Load favorites
    const savedFavorites = localStorage.getItem('favorites')
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)))
    }
  }, [])

  const handleToggleFavorite = (stockCode: string, isFavorite: boolean) => {
    const newFavorites = new Set(favorites)
    if (isFavorite) {
      newFavorites.add(stockCode)
    } else {
      newFavorites.delete(stockCode)
    }
    setFavorites(newFavorites)
    localStorage.setItem('favorites', JSON.stringify(Array.from(newFavorites)))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          おすすめ銘柄
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          AIが分析したおすすめの投資銘柄をご紹介します
        </p>
      </div>

      {loading ? (
        <LoadingState 
          type="skeleton" 
          variant="stock-list" 
          count={6}
          message="おすすめ銘柄を分析中..."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stocks.map((stock) => (
            <EnhancedStockCard
              key={stock.stock_code}
              stock={stock}
              isFavorite={favorites.has(stock.stock_code)}
              onToggleFavorite={handleToggleFavorite}
              accessibility={{
                keyboardNavigation: true
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
          推奨理由
        </h2>
        <ul className="space-y-2 text-blue-800 dark:text-blue-200">
          <li>• 過去3ヶ月の成長率が安定している</li>
          <li>• 業界内での競争力が高い</li>
          <li>• 財務指標が良好</li>
          <li>• 市場トレンドに適合している</li>
        </ul>
      </div>
    </div>
  )
}

export default RecommendedStocksPage