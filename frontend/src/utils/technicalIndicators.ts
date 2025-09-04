/**
 * Technical Indicators Utility Functions
 * Calculations for various technical analysis indicators
 */

export interface TechnicalIndicatorData {
  sma5: (number | null)[]
  sma20: (number | null)[]
  sma50: (number | null)[]
  ema12: (number | null)[]
  ema26: (number | null)[]
  macd: (number | null)[]
  macdSignal: (number | null)[]
  macdHistogram: (number | null)[]
  rsi: (number | null)[]
  bollingerUpper: (number | null)[]
  bollingerMiddle: (number | null)[]
  bollingerLower: (number | null)[]
  volume?: number[]
}

/**
 * Simple Moving Average
 */
export function calculateSMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      const slice = prices.slice(i - period + 1, i + 1)
      const sum = slice.reduce((acc, val) => acc + val, 0)
      result.push(sum / period)
    }
  }
  
  return result
}

/**
 * Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const multiplier = 2 / (period + 1)
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      result.push(prices[0])
    } else if (result[i - 1] === null) {
      result.push(null)
    } else {
      const ema = (prices[i] - result[i - 1]!) * multiplier + result[i - 1]!
      result.push(ema)
    }
  }
  
  return result
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const ema12 = calculateEMA(prices, fastPeriod)
  const ema26 = calculateEMA(prices, slowPeriod)
  
  const macd: (number | null)[] = []
  for (let i = 0; i < prices.length; i++) {
    if (ema12[i] === null || ema26[i] === null) {
      macd.push(null)
    } else {
      macd.push(ema12[i]! - ema26[i]!)
    }
  }
  
  const macdValues = macd.filter(v => v !== null) as number[]
  const macdSignal = calculateEMA(macdValues, signalPeriod)
  
  // Pad signal with nulls to match original length
  const paddedSignal: (number | null)[] = []
  let signalIndex = 0
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] === null) {
      paddedSignal.push(null)
    } else {
      paddedSignal.push(macdSignal[signalIndex] || null)
      signalIndex++
    }
  }
  
  const macdHistogram: (number | null)[] = []
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] === null || paddedSignal[i] === null) {
      macdHistogram.push(null)
    } else {
      macdHistogram.push(macd[i]! - paddedSignal[i]!)
    }
  }
  
  return {
    macd,
    macdSignal: paddedSignal,
    macdHistogram,
    ema12,
    ema26
  }
}

/**
 * RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = []
  const gains: number[] = []
  const losses: number[] = []
  
  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  result.push(null) // First value is null
  
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      
      if (avgLoss === 0) {
        result.push(100)
      } else {
        const rs = avgGain / avgLoss
        const rsi = 100 - (100 / (1 + rs))
        result.push(rsi)
      }
    }
  }
  
  return result
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
  const sma = calculateSMA(prices, period)
  const bollingerUpper: (number | null)[] = []
  const bollingerLower: (number | null)[] = []
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      bollingerUpper.push(null)
      bollingerLower.push(null)
    } else {
      const slice = prices.slice(i - period + 1, i + 1)
      const mean = sma[i]!
      const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period
      const standardDeviation = Math.sqrt(variance)
      
      bollingerUpper.push(mean + (standardDeviation * stdDev))
      bollingerLower.push(mean - (standardDeviation * stdDev))
    }
  }
  
  return {
    bollingerUpper,
    bollingerMiddle: sma,
    bollingerLower
  }
}

/**
 * Calculate all technical indicators for a given price series
 */
export function calculateAllIndicators(prices: number[], volume?: number[]): TechnicalIndicatorData {
  const sma5 = calculateSMA(prices, 5)
  const sma20 = calculateSMA(prices, 20)
  const sma50 = calculateSMA(prices, 50)
  
  const macdResult = calculateMACD(prices)
  const rsi = calculateRSI(prices)
  const bollingerResult = calculateBollingerBands(prices)
  
  return {
    sma5,
    sma20,
    sma50,
    ema12: macdResult.ema12,
    ema26: macdResult.ema26,
    macd: macdResult.macd,
    macdSignal: macdResult.macdSignal,
    macdHistogram: macdResult.macdHistogram,
    rsi,
    bollingerUpper: bollingerResult.bollingerUpper,
    bollingerMiddle: bollingerResult.bollingerMiddle,
    bollingerLower: bollingerResult.bollingerLower,
    volume
  }
}