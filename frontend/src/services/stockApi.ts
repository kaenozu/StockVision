/**
 * Stock API Client Service - Mock Implementation
 * 
 * Simple mock implementation to provide basic API functionality
 * without complex caching and error handling for now.
 */

import {
  StockData,
  CurrentPriceResponse,
  PriceHistoryItem,
  WatchlistItemAPI,
  AddWatchlistRequest,
  APIError
} from '../types/stock'

/**
 * Mock Stock API Implementation
 */
export const stockApi = {
  /**
   * Get current price for a stock
   */
  async getCurrentPrice(stockCode: string): Promise<CurrentPriceResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))
    
    // Return mock data
    const basePrice = 1000 + Math.random() * 10000
    const change = (Math.random() - 0.5) * 200
    
    return {
      current_price: Math.round(basePrice),
      previous_close: Math.round(basePrice - change),
      price_change: Math.round(change),
      price_change_pct: Number(((change / (basePrice - change)) * 100).toFixed(2)),
      timestamp: new Date().toISOString()
    }
  },

  /**
   * Get stock data by code
   */
  async getStockData(stockCode: string): Promise<StockData> {
    const priceData = await this.getCurrentPrice(stockCode)
    
    const companyNames: Record<string, string> = {
      '7203': 'トヨタ自動車',
      '6758': 'ソニーグループ',  
      '9984': 'ソフトバンクグループ',
      '6861': 'キーエンス',
      '7974': '任天堂',
      '9983': 'ファーストリテイリング',
      '4755': '楽天グループ',
      '6902': 'デンソー'
    }
    
    return {
      stock_code: stockCode,
      company_name: companyNames[stockCode] || `株式会社 ${stockCode}`,
      current_price: priceData.current_price,
      previous_close: priceData.previous_close,
      price_change: priceData.price_change,
      percentage_change: priceData.price_change_pct,
      volume: Math.floor(Math.random() * 10000000),
      market_cap: priceData.current_price * 1000000000,
      updated_at: priceData.timestamp
    }
  },

  /**
   * Get price history for a stock
   */
  async getPriceHistory(stockCode: string, days: number = 30): Promise<PriceHistoryItem[]> {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const history: PriceHistoryItem[] = []
    const basePrice = 1000 + Math.random() * 10000
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const price = basePrice + (Math.random() - 0.5) * 500
      
      history.push({
        date: date.toISOString().split('T')[0],
        open_price: Math.round(price * 0.99),
        close_price: Math.round(price),
        high_price: Math.round(price * 1.02),
        low_price: Math.round(price * 0.98),
        volume: Math.floor(Math.random() * 1000000)
      })
    }
    
    return history
  },

  /**
   * Get watchlist items
   */
  async getWatchlist(): Promise<WatchlistItemAPI[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Return mock watchlist
    return [
      {
        id: 1,
        stock_code: '7203',
        user_notes: 'トヨタ自動車 - EV投資に注目'
      },
      {
        id: 2, 
        stock_code: '6758',
        user_notes: 'ソニーグループ - エンタメ事業好調'
      }
    ]
  },

  /**
   * Add to watchlist
   */
  async addToWatchlist(request: AddWatchlistRequest): Promise<WatchlistItemAPI> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    return {
      id: Math.floor(Math.random() * 1000),
      stock_code: request.stock_code,
      user_notes: request.user_notes || ''
    }
  },

  /**
   * Remove from watchlist
   */
  async removeFromWatchlist(itemId: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300))
    // Mock implementation - just wait
  },

  /**
   * Clear all caches (mock implementation)
   */
  clearCache(): void {
    console.log('Mock: Cache cleared')
  },

  /**
   * Get cache statistics (mock implementation)
   */
  getCacheStats(): any {
    return {
      stockData: { size: 0, hitRate: 0 },
      priceHistory: { size: 0, hitRate: 0 },
      recommendations: { size: 0, hitRate: 0 }
    }
  }
}

export default stockApi