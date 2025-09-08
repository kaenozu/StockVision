/**
 * Trading Signals Generator
 * 売買タイミングの判定ロジック
 */

import { TechnicalIndicatorData } from './technicalIndicators'

export interface TradingSignal {
  type: 'buy' | 'sell' | 'hold'
  strength: 'weak' | 'moderate' | 'strong'
  price: number
  date: string
  reasons: string[]
  confidence: number // 0-100%
}

export interface TradingRecommendation {
  currentSignal: TradingSignal
  nextExpectedSignal?: TradingSignal
  riskLevel: 'low' | 'medium' | 'high'
  priceTarget?: number
  stopLoss?: number
}

/**
 * ゴールデンクロス/デッドクロスの判定
 */
function detectMovingAverageCrossover(
  shortMA: (number | null)[],
  longMA: (number | null)[],
  prices: number[]
): { signal: 'buy' | 'sell' | 'hold', strength: number } {
  const lastIndex = shortMA.length - 1
  const prevIndex = lastIndex - 1

  if (lastIndex < 1 || !shortMA[lastIndex] || !longMA[lastIndex] || 
      !shortMA[prevIndex] || !longMA[prevIndex]) {
    return { signal: 'hold', strength: 0 }
  }

  const currentShort = shortMA[lastIndex]!
  const currentLong = longMA[lastIndex]!
  const prevShort = shortMA[prevIndex]!
  const prevLong = longMA[prevIndex]!

  // ゴールデンクロス（買いシグナル）
  if (prevShort <= prevLong && currentShort > currentLong) {
    const crossStrength = ((currentShort - currentLong) / currentLong) * 100
    return { signal: 'buy', strength: Math.min(crossStrength * 10, 100) }
  }

  // デッドクロス（売りシグナル）
  if (prevShort >= prevLong && currentShort < currentLong) {
    const crossStrength = ((currentLong - currentShort) / currentLong) * 100
    return { signal: 'sell', strength: Math.min(crossStrength * 10, 100) }
  }

  return { signal: 'hold', strength: 0 }
}

/**
 * RSIによる売買判定
 */
function analyzeRSI(rsi: (number | null)[]): { signal: 'buy' | 'sell' | 'hold', strength: number } {
  const currentRSI = rsi[rsi.length - 1]
  
  if (!currentRSI) return { signal: 'hold', strength: 0 }

  // 過熱圏（売りシグナル）
  if (currentRSI >= 70) {
    const strength = Math.min((currentRSI - 70) * 3, 100)
    return { signal: 'sell', strength }
  }

  // 売られすぎ圏（買いシグナル）
  if (currentRSI <= 30) {
    const strength = Math.min((30 - currentRSI) * 3, 100)
    return { signal: 'buy', strength }
  }

  return { signal: 'hold', strength: 0 }
}

/**
 * MACDによる売買判定
 */
function analyzeMACD(
  macd: (number | null)[],
  signal: (number | null)[],
  histogram: (number | null)[]
): { signal: 'buy' | 'sell' | 'hold', strength: number } {
  const lastIndex = macd.length - 1
  const prevIndex = lastIndex - 1

  if (lastIndex < 1 || !macd[lastIndex] || !signal[lastIndex] || 
      !macd[prevIndex] || !signal[prevIndex]) {
    return { signal: 'hold', strength: 0 }
  }

  const currentMACD = macd[lastIndex]!
  const currentSignal = signal[lastIndex]!
  const prevMACD = macd[prevIndex]!
  const prevSignal = signal[prevIndex]!

  // MACDがシグナルラインを上抜け（買いシグナル）
  if (prevMACD <= prevSignal && currentMACD > currentSignal) {
    const strength = Math.abs(currentMACD - currentSignal) * 100
    return { signal: 'buy', strength: Math.min(strength, 100) }
  }

  // MACDがシグナルラインを下抜け（売りシグナル）
  if (prevMACD >= prevSignal && currentMACD < currentSignal) {
    const strength = Math.abs(currentMACD - currentSignal) * 100
    return { signal: 'sell', strength: Math.min(strength, 100) }
  }

  return { signal: 'hold', strength: 0 }
}

/**
 * ボリンジャーバンドによる売買判定
 */
function analyzeBollingerBands(
  prices: number[],
  upper: (number | null)[],
  lower: (number | null)[]
): { signal: 'buy' | 'sell' | 'hold', strength: number } {
  const lastIndex = prices.length - 1
  const currentPrice = prices[lastIndex]
  const currentUpper = upper[lastIndex]
  const currentLower = lower[lastIndex]

  if (!currentUpper || !currentLower) {
    return { signal: 'hold', strength: 0 }
  }

  // 価格が上部バンドを超えた（売りシグナル）
  if (currentPrice >= currentUpper) {
    const strength = ((currentPrice - currentUpper) / currentUpper) * 1000
    return { signal: 'sell', strength: Math.min(strength, 100) }
  }

  // 価格が下部バンドを下回った（買いシグナル）
  if (currentPrice <= currentLower) {
    const strength = ((currentLower - currentPrice) / currentLower) * 1000
    return { signal: 'buy', strength: Math.min(strength, 100) }
  }

  return { signal: 'hold', strength: 0 }
}

/**
 * 総合的な売買判定
 */
export function generateTradingSignal(
  prices: number[],
  indicators: TechnicalIndicatorData,
  currentPrice: number,
  dates: string[]
): TradingRecommendation {
  const reasons: string[] = []
  let buyScore = 0
  let sellScore = 0

  // 移動平均クロスオーバー分析
  const sma5vs20 = detectMovingAverageCrossover(indicators.sma5, indicators.sma20, prices)
  const sma20vs50 = detectMovingAverageCrossover(indicators.sma20, indicators.sma50, prices)
  
  if (sma5vs20.signal === 'buy') {
    buyScore += sma5vs20.strength * 0.3
    reasons.push(`短期移動平均が中期を上抜け（ゴールデンクロス）`)
  } else if (sma5vs20.signal === 'sell') {
    sellScore += sma5vs20.strength * 0.3
    reasons.push(`短期移動平均が中期を下抜け（デッドクロス）`)
  }

  if (sma20vs50.signal === 'buy') {
    buyScore += sma20vs50.strength * 0.4
    reasons.push(`中期移動平均が長期を上抜け（強いゴールデンクロス）`)
  } else if (sma20vs50.signal === 'sell') {
    sellScore += sma20vs50.strength * 0.4
    reasons.push(`中期移動平均が長期を下抜け（強いデッドクロス）`)
  }

  // RSI分析
  const rsiAnalysis = analyzeRSI(indicators.rsi)
  if (rsiAnalysis.signal === 'buy') {
    buyScore += rsiAnalysis.strength * 0.25
    reasons.push(`RSI ${indicators.rsi[indicators.rsi.length - 1]?.toFixed(1)} - 売られすぎ圏`)
  } else if (rsiAnalysis.signal === 'sell') {
    sellScore += rsiAnalysis.strength * 0.25
    reasons.push(`RSI ${indicators.rsi[indicators.rsi.length - 1]?.toFixed(1)} - 買われすぎ圏`)
  }

  // MACD分析
  const macdAnalysis = analyzeMACD(indicators.macd, indicators.macdSignal, indicators.macdHistogram)
  if (macdAnalysis.signal === 'buy') {
    buyScore += macdAnalysis.strength * 0.3
    reasons.push(`MACD買いシグナル発生`)
  } else if (macdAnalysis.signal === 'sell') {
    sellScore += macdAnalysis.strength * 0.3
    reasons.push(`MACD売りシグナル発生`)
  }

  // ボリンジャーバンド分析
  const bbAnalysis = analyzeBollingerBands(prices, indicators.bollingerUpper, indicators.bollingerLower)
  if (bbAnalysis.signal === 'buy') {
    buyScore += bbAnalysis.strength * 0.2
    reasons.push(`価格がボリンジャーバンド下限付近`)
  } else if (bbAnalysis.signal === 'sell') {
    sellScore += bbAnalysis.strength * 0.2
    reasons.push(`価格がボリンジャーバンド上限付近`)
  }

  // 最終判定
  let finalSignal: 'buy' | 'sell' | 'hold'
  let strength: 'weak' | 'moderate' | 'strong'
  let confidence: number

  const scoreDiff = buyScore - sellScore
  const maxScore = Math.max(buyScore, sellScore)

  if (maxScore < 20) {
    finalSignal = 'hold'
    strength = 'weak'
    confidence = 20
    reasons.push('明確なシグナルなし')
  } else if (scoreDiff > 15) {
    finalSignal = 'buy'
    confidence = Math.min(buyScore, 95)
    strength = buyScore > 60 ? 'strong' : buyScore > 30 ? 'moderate' : 'weak'
  } else if (scoreDiff < -15) {
    finalSignal = 'sell'
    confidence = Math.min(sellScore, 95)
    strength = sellScore > 60 ? 'strong' : sellScore > 30 ? 'moderate' : 'weak'
  } else {
    finalSignal = 'hold'
    strength = 'weak'
    confidence = 30
    reasons.push('売買シグナル拮抗中')
  }

  // リスクレベル計算
  const currentRSI = indicators.rsi[indicators.rsi.length - 1] || 50
  const volatility = calculateVolatility(prices.slice(-20)) // 直近20日のボラティリティ
  
  let riskLevel: 'low' | 'medium' | 'high'
  if (volatility < 0.02 && currentRSI > 25 && currentRSI < 75) {
    riskLevel = 'low'
  } else if (volatility > 0.05 || currentRSI < 20 || currentRSI > 80) {
    riskLevel = 'high'
  } else {
    riskLevel = 'medium'
  }

  // 価格ターゲットとストップロス計算
  let priceTarget: number | undefined
  let stopLoss: number | undefined

  if (finalSignal === 'buy') {
    const resistance = indicators.bollingerUpper[indicators.bollingerUpper.length - 1]
    priceTarget = resistance ? Math.min(resistance * 0.95, currentPrice * 1.1) : currentPrice * 1.08
    stopLoss = currentPrice * 0.95
  } else if (finalSignal === 'sell') {
    const support = indicators.bollingerLower[indicators.bollingerLower.length - 1]
    priceTarget = support ? Math.max(support * 1.05, currentPrice * 0.9) : currentPrice * 0.92
    stopLoss = currentPrice * 1.05
  }

  return {
    currentSignal: {
      type: finalSignal,
      strength,
      price: currentPrice,
      date: dates[dates.length - 1] || new Date().toISOString().split('T')[0],
      reasons,
      confidence
    },
    riskLevel,
    priceTarget,
    stopLoss
  }
}

/**
 * ボラティリティ計算
 */
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0

  const returns = []
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
  }

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length
  
  return Math.sqrt(variance * 252) // 年率ボラティリティ
}