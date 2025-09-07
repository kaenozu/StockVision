/**
 * Stock Data Processing Web Worker
 * 
 * Handles heavy stock data processing tasks off the main thread
 * to maintain UI responsiveness.
 */

interface StockData {
  stock_code: string
  current_price: number
  price_change: number
  price_change_pct: number
  volume: number
  [key: string]: any
}

interface PriceHistoryItem {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ProcessingTask {
  id: string
  type: 'CALCULATE_TECHNICAL_INDICATORS' | 'PROCESS_BULK_DATA' | 'FILTER_SORT_DATA' | 'AGGREGATE_PORTFOLIO'
  data: any
  options?: any
}

interface ProcessingResult {
  id: string
  success: boolean
  result?: any
  error?: string
  processingTime: number
}

// Technical indicator calculations
class TechnicalIndicators {
  static calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = []
    
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      sma.push(sum / period)
    }
    
    return sma
  }

  static calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = []
    const multiplier = 2 / (period + 1)
    
    // First EMA is SMA
    const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
    ema.push(firstSMA)
    
    for (let i = period; i < prices.length; i++) {
      const currentEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
      ema.push(currentEMA)
    }
    
    return ema
  }

  static calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = []
    const gains: number[] = []
    const losses: number[] = []
    
    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }
    
    // Calculate RSI
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      
      if (avgLoss === 0) {
        rsi.push(100)
      } else {
        const rs = avgGain / avgLoss
        rsi.push(100 - (100 / (1 + rs)))
      }
    }
    
    return rsi
  }

  static calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
    upper: number[]
    middle: number[]
    lower: number[]
  } {
    const middle = this.calculateSMA(prices, period)
    const upper: number[] = []
    const lower: number[] = []
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1)
      const sma = slice.reduce((a, b) => a + b, 0) / period
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
      const standardDeviation = Math.sqrt(variance)
      
      upper.push(sma + (standardDeviation * stdDev))
      lower.push(sma - (standardDeviation * stdDev))
    }
    
    return { upper, middle, lower }
  }

  static calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {
    macd: number[]
    signal: number[]
    histogram: number[]
  } {
    const fastEMA = this.calculateEMA(prices, fastPeriod)
    const slowEMA = this.calculateEMA(prices, slowPeriod)
    
    // Calculate MACD line
    const macd: number[] = []
    const startIndex = slowPeriod - fastPeriod
    
    for (let i = 0; i < fastEMA.length - startIndex; i++) {
      macd.push(fastEMA[i + startIndex] - slowEMA[i])
    }
    
    // Calculate signal line
    const signal = this.calculateEMA(macd, signalPeriod)
    
    // Calculate histogram
    const histogram: number[] = []
    const signalStartIndex = signalPeriod - 1
    
    for (let i = 0; i < signal.length; i++) {
      histogram.push(macd[i + signalStartIndex] - signal[i])
    }
    
    return { macd, signal, histogram }
  }
}

// Data processing utilities
class DataProcessor {
  static processStockData(stocks: StockData[], options: any = {}): StockData[] {
    const {
      sortBy = 'stock_code',
      sortOrder = 'asc',
      filters = {},
      search = ''
    } = options

    let processed = [...stocks]

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      processed = processed.filter(stock =>
        stock.stock_code.toLowerCase().includes(searchLower) ||
        (stock.company_name && stock.company_name.toLowerCase().includes(searchLower))
      )
    }

    // Apply filters
    Object.keys(filters).forEach(filterKey => {
      const filterValue = filters[filterKey]
      if (filterValue === null || filterValue === undefined) return

      switch (filterKey) {
        case 'minPrice':
          processed = processed.filter(stock => stock.current_price >= filterValue)
          break
        case 'maxPrice':
          processed = processed.filter(stock => stock.current_price <= filterValue)
          break
        case 'gainersOnly':
          if (filterValue) {
            processed = processed.filter(stock => stock.price_change > 0)
          }
          break
        case 'losersOnly':
          if (filterValue) {
            processed = processed.filter(stock => stock.price_change < 0)
          }
          break
      }
    })

    // Apply sorting
    processed.sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]

      // Handle different data types
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return processed
  }

  static calculatePortfolioMetrics(stocks: StockData[], holdings: { [stockCode: string]: number }): {
    totalValue: number
    totalGain: number
    totalGainPct: number
    topGainers: StockData[]
    topLosers: StockData[]
  } {
    let totalValue = 0
    let totalGain = 0
    let totalCost = 0

    const stocksWithHoldings = stocks.filter(stock => holdings[stock.stock_code] > 0)

    stocksWithHoldings.forEach(stock => {
      const shares = holdings[stock.stock_code]
      const currentValue = stock.current_price * shares
      const previousValue = (stock.current_price - stock.price_change) * shares
      
      totalValue += currentValue
      totalCost += previousValue
    })

    totalGain = totalValue - totalCost
    const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

    // Sort stocks by performance
    const sortedStocks = [...stocksWithHoldings].sort((a, b) => 
      b.price_change_pct - a.price_change_pct
    )

    const topGainers = sortedStocks.filter(s => s.price_change_pct > 0).slice(0, 5)
    const topLosers = sortedStocks.filter(s => s.price_change_pct < 0).slice(-5).reverse()

    return {
      totalValue,
      totalGain,
      totalGainPct,
      topGainers,
      topLosers
    }
  }

  static processHistoricalData(history: PriceHistoryItem[], indicators: string[] = []): {
    processedData: PriceHistoryItem[]
    technicalIndicators: { [key: string]: number[] }
  } {
    const processedData = [...history]
    const closePrices = history.map(item => item.close)
    const technicalIndicators: { [key: string]: number[] } = {}

    indicators.forEach(indicator => {
      switch (indicator.toUpperCase()) {
        case 'SMA_20':
          technicalIndicators.sma20 = TechnicalIndicators.calculateSMA(closePrices, 20)
          break
        case 'SMA_50':
          technicalIndicators.sma50 = TechnicalIndicators.calculateSMA(closePrices, 50)
          break
        case 'EMA_12':
          technicalIndicators.ema12 = TechnicalIndicators.calculateEMA(closePrices, 12)
          break
        case 'EMA_26':
          technicalIndicators.ema26 = TechnicalIndicators.calculateEMA(closePrices, 26)
          break
        case 'RSI':
          technicalIndicators.rsi = TechnicalIndicators.calculateRSI(closePrices)
          break
        case 'BOLLINGER':
          const bb = TechnicalIndicators.calculateBollingerBands(closePrices)
          technicalIndicators.bbUpper = bb.upper
          technicalIndicators.bbMiddle = bb.middle
          technicalIndicators.bbLower = bb.lower
          break
        case 'MACD':
          const macd = TechnicalIndicators.calculateMACD(closePrices)
          technicalIndicators.macd = macd.macd
          technicalIndicators.macdSignal = macd.signal
          technicalIndicators.macdHistogram = macd.histogram
          break
      }
    })

    return {
      processedData,
      technicalIndicators
    }
  }
}

// Worker message handler
self.onmessage = function(event: MessageEvent<ProcessingTask>) {
  const { id, type, data, options } = event.data
  const startTime = performance.now()
  
  try {
    let result: any

    switch (type) {
      case 'CALCULATE_TECHNICAL_INDICATORS':
        result = DataProcessor.processHistoricalData(data, options.indicators || [])
        break

      case 'PROCESS_BULK_DATA':
        result = DataProcessor.processStockData(data, options)
        break

      case 'FILTER_SORT_DATA':
        result = DataProcessor.processStockData(data, options)
        break

      case 'AGGREGATE_PORTFOLIO':
        result = DataProcessor.calculatePortfolioMetrics(data, options.holdings || {})
        break

      default:
        throw new Error(`Unknown task type: ${type}`)
    }

    const processingTime = performance.now() - startTime

    const response: ProcessingResult = {
      id,
      success: true,
      result,
      processingTime
    }

    self.postMessage(response)

  } catch (error) {
    const processingTime = performance.now() - startTime

    const response: ProcessingResult = {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    }

    self.postMessage(response)
  }
}

// Export types for TypeScript support
export type { ProcessingTask, ProcessingResult, StockData, PriceHistoryItem }