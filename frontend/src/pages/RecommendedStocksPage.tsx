import React, { useState, useEffect } from 'react'
import { EnhancedStockCard } from '../components/stock/EnhancedStockCard'
import LoadingState from '../components/enhanced/LoadingState'
import { useTheme } from '../contexts/ThemeContext'
import { stockApi } from '../services/stockApi'

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

interface RecommendedStock {
  symbol: string
  name: string
  price: {
    current: number
    change: number
    changePercent: number
    volume?: number
  }
  recommendation: {
    signal: string
    confidence: number
    reasoning: string
  }
}

const RecommendedStocksPage: React.FC = () => {
  const { actualTheme } = useTheme()
  const [stocks, setStocks] = useState<StockData[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [recommendationSummary, setRecommendationSummary] = useState<{
    totalBuy: number;
    totalHold: number;
    totalSell: number;
    commonReasons: string[];
  }>({
    totalBuy: 0,
    totalHold: 0,
    totalSell: 0,
    commonReasons: []
  })

  useEffect(() => {
    const fetchRecommendedStocks = async () => {
      try {
        setLoading(true)
        const response = await stockApi.getRecommendedStocks(10)
        
        // Convert API response to StockData format
        const convertedStocks: StockData[] = response.map((item: any) => ({
          stock_code: item.symbol,
          company_name: item.name,
          current_price: item.price.current,
          previous_close: item.price.current - item.price.change,
          price_change: item.price.change,
          percentage_change: item.price.changePercent,
          volume: item.price.volume || 0,
          market_cap: 0, // Will be calculated from stock info if needed
          updated_at: new Date().toISOString()
        }))
        
        // Calculate recommendation summary
        const summary = {
          totalBuy: response.filter((item: any) => item.recommendation.signal === 'buy').length,
          totalHold: response.filter((item: any) => item.recommendation.signal === 'hold').length,
          totalSell: response.filter((item: any) => item.recommendation.signal === 'sell').length,
          commonReasons: [...new Set(response.map((item: any) => item.recommendation.reasoning))]
        }
        
        setStocks(convertedStocks)
        setRecommendationSummary(summary)
      } catch (error) {
        console.error('推奨銘柄の取得に失敗しました:', error)
        // Fall back to empty array
        setStocks([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendedStocks()

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
        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
          推奨サマリー
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {recommendationSummary.totalBuy}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200">買い推奨</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {recommendationSummary.totalHold}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200">様子見</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {recommendationSummary.totalSell}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200">売り推奨</div>
          </div>
        </div>
        {recommendationSummary.commonReasons.length > 0 && (
          <>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              主な分析結果
            </h3>
            <ul className="space-y-2 text-blue-800 dark:text-blue-200">
              {recommendationSummary.commonReasons.slice(0, 4).map((reason, index) => (
                <li key={index}>• {reason}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default RecommendedStocksPage