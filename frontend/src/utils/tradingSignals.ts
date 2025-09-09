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

export interface TradingEntry {
  condition: string
  price: number
  probability: number
  timeframe: string
}

export interface TradingExit {
  condition: string
  price: number
  type: 'profit' | 'loss'
  percentage: number
}

export interface TradingScenario {
  name: string
  probability: number
  description: string
  entries: TradingEntry[]
  exits: TradingExit[]
  timeframe: string
}

export interface PriceForecastPoint {
  date: string
  price: number
  scenario: string
  confidence?: number
}

export interface PriceForecast {
  historicalPrices: PriceForecastPoint[]
  bullishForecast: PriceForecastPoint[]
  bearishForecast: PriceForecastPoint[]
  neutralForecast: PriceForecastPoint[]
  entryPoints: { date: string; price: number; type: 'buy' | 'sell' }[]
  exitPoints: { date: string; price: number; type: 'profit' | 'loss' }[]
}

export interface TradingRecommendation {
  currentSignal: TradingSignal
  nextExpectedSignal?: TradingSignal
  riskLevel: 'low' | 'medium' | 'high'
  priceTarget?: number
  stopLoss?: number
  // 新しく追加
  entryConditions: TradingEntry[]
  exitConditions: TradingExit[]
  timingPrediction: {
    nextBuySignal: string
    nextSellSignal: string
    confidence: number
  }
  scenarios: TradingScenario[]
  priceForecast: PriceForecast
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

  // エントリー条件を生成
  const entryConditions = generateEntryConditions(finalSignal, currentPrice, indicators, prices)
  
  // エグジット条件を生成
  const exitConditions = generateExitConditions(finalSignal, currentPrice, indicators, priceTarget, stopLoss)
  
  // タイミング予測を生成
  const timingPrediction = generateTimingPrediction(indicators, prices, finalSignal)
  
  // シナリオ分析を生成
  const scenarios = generateTradingScenarios(finalSignal, currentPrice, indicators, prices)
  
  // 価格予測を生成
  const priceForecast = generatePriceForecast(
    prices,
    dates,
    currentPrice,
    finalSignal,
    indicators,
    entryConditions,
    exitConditions
  )

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
    stopLoss,
    entryConditions,
    exitConditions,
    timingPrediction,
    scenarios,
    priceForecast
  }
}

/**
 * エントリー条件を生成
 */
function generateEntryConditions(
  signal: 'buy' | 'sell' | 'hold',
  currentPrice: number,
  indicators: TechnicalIndicatorData,
  prices: number[]
): TradingEntry[] {
  const entries: TradingEntry[] = []
  
  if (signal === 'buy') {
    // 押し目買い条件
    const sma20 = indicators.sma20[indicators.sma20.length - 1]
    if (sma20) {
      entries.push({
        condition: `${Math.round(sma20)}円付近での押し目買い`,
        price: Math.round(sma20),
        probability: 75,
        timeframe: '3-7日以内'
      })
    }
    
    // RSI条件
    const currentRSI = indicators.rsi[indicators.rsi.length - 1]
    if (currentRSI && currentRSI > 40) {
      const buyPrice = Math.round(currentPrice * 0.97)
      entries.push({
        condition: `${buyPrice}円以下で買い`,
        price: buyPrice,
        probability: 60,
        timeframe: '1-5日以内'
      })
    }
    
    // ボリンジャーバンド条件
    const bbLower = indicators.bollingerLower[indicators.bollingerLower.length - 1]
    if (bbLower) {
      entries.push({
        condition: `ボリンジャーバンド下限${Math.round(bbLower)}円付近で買い`,
        price: Math.round(bbLower * 1.02),
        probability: 80,
        timeframe: '2-10日以内'
      })
    }
  } else if (signal === 'sell') {
    // 戻り売り条件
    const sma20 = indicators.sma20[indicators.sma20.length - 1]
    if (sma20) {
      entries.push({
        condition: `${Math.round(sma20)}円付近での戻り売り`,
        price: Math.round(sma20),
        probability: 75,
        timeframe: '3-7日以内'
      })
    }
    
    // 高値抜けでの売り条件
    const sellPrice = Math.round(currentPrice * 1.03)
    entries.push({
      condition: `${sellPrice}円を超えたら売り`,
      price: sellPrice,
      probability: 65,
      timeframe: '1-5日以内'
    })
  } else {
    // 様子見の場合のブレイクアウト条件
    const recentHigh = Math.max(...prices.slice(-10))
    const recentLow = Math.min(...prices.slice(-10))
    
    entries.push({
      condition: `${Math.round(recentHigh)}円上抜けで買い`,
      price: Math.round(recentHigh),
      probability: 50,
      timeframe: '1-2週間以内'
    })
    
    entries.push({
      condition: `${Math.round(recentLow)}円下抜けで売り`,
      price: Math.round(recentLow),
      probability: 50,
      timeframe: '1-2週間以内'
    })
  }
  
  return entries
}

/**
 * エグジット条件を生成
 */
function generateExitConditions(
  signal: 'buy' | 'sell' | 'hold',
  currentPrice: number,
  indicators: TechnicalIndicatorData,
  priceTarget?: number,
  stopLoss?: number
): TradingExit[] {
  const exits: TradingExit[] = []
  
  if (signal === 'buy') {
    // 利確条件
    if (priceTarget) {
      exits.push({
        condition: `目標価格${Math.round(priceTarget)}円で利確`,
        price: Math.round(priceTarget),
        type: 'profit',
        percentage: ((priceTarget - currentPrice) / currentPrice) * 100
      })
    }
    
    // 段階的利確
    const profit5 = Math.round(currentPrice * 1.05)
    exits.push({
      condition: `+5%（${profit5}円）で部分利確`,
      price: profit5,
      type: 'profit',
      percentage: 5
    })
    
    const profit10 = Math.round(currentPrice * 1.10)
    exits.push({
      condition: `+10%（${profit10}円）で追加利確`,
      price: profit10,
      type: 'profit',
      percentage: 10
    })
    
    // 損切り条件
    if (stopLoss) {
      exits.push({
        condition: `ストップロス${Math.round(stopLoss)}円で損切り`,
        price: Math.round(stopLoss),
        type: 'loss',
        percentage: ((stopLoss - currentPrice) / currentPrice) * 100
      })
    }
    
  } else if (signal === 'sell') {
    // 利確条件（ショートの場合）
    if (priceTarget) {
      exits.push({
        condition: `目標価格${Math.round(priceTarget)}円で利確`,
        price: Math.round(priceTarget),
        type: 'profit',
        percentage: ((currentPrice - priceTarget) / currentPrice) * 100
      })
    }
    
    // 損切り条件
    if (stopLoss) {
      exits.push({
        condition: `ストップロス${Math.round(stopLoss)}円で損切り`,
        price: Math.round(stopLoss),
        type: 'loss',
        percentage: ((stopLoss - currentPrice) / currentPrice) * 100
      })
    }
  }
  
  return exits
}

/**
 * タイミング予測を生成
 */
function generateTimingPrediction(
  indicators: TechnicalIndicatorData,
  prices: number[],
  currentSignal: 'buy' | 'sell' | 'hold'
): { nextBuySignal: string; nextSellSignal: string; confidence: number } {
  const currentRSI = indicators.rsi[indicators.rsi.length - 1] || 50
  const recentVolatility = calculateVolatility(prices.slice(-10))
  
  let nextBuySignal = '不明'
  let nextSellSignal = '不明'
  let confidence = 30
  
  if (currentSignal === 'buy') {
    nextBuySignal = '現在が買い時'
    nextSellSignal = '1-2週間後（利確目標達成時）'
    confidence = 70
  } else if (currentSignal === 'sell') {
    nextBuySignal = '1-3週間後（下落後の反発時）'
    nextSellSignal = '現在が売り時'
    confidence = 70
  } else {
    // RSIベースの予測
    if (currentRSI > 60) {
      nextBuySignal = '5-10日後（調整後）'
      nextSellSignal = '2-7日以内（RSI過熱時）'
    } else if (currentRSI < 40) {
      nextBuySignal = '2-7日以内（RSI底値時）'
      nextSellSignal = '2-3週間後（反発後）'
    } else {
      nextBuySignal = '1-2週間後（トレンド明確化時）'
      nextSellSignal = '1-2週間後（トレンド明確化時）'
    }
    
    // ボラティリティ調整
    if (recentVolatility > 0.05) {
      confidence = Math.max(confidence - 20, 20)
      nextBuySignal += '（高ボラティリティのため不確実）'
      nextSellSignal += '（高ボラティリティのため不確実）'
    } else {
      confidence = Math.min(confidence + 10, 80)
    }
  }
  
  return { nextBuySignal, nextSellSignal, confidence }
}

/**
 * シナリオ分析を生成
 */
function generateTradingScenarios(
  signal: 'buy' | 'sell' | 'hold',
  currentPrice: number,
  indicators: TechnicalIndicatorData,
  prices: number[]
): TradingScenario[] {
  const scenarios: TradingScenario[] = []
  
  // 上昇シナリオ
  const bullishEntries: TradingEntry[] = [
    {
      condition: `${Math.round(currentPrice * 0.98)}円での押し目買い`,
      price: Math.round(currentPrice * 0.98),
      probability: 70,
      timeframe: '3-7日以内'
    }
  ]
  
  const bullishExits: TradingExit[] = [
    {
      condition: `+8%（${Math.round(currentPrice * 1.08)}円）で利確`,
      price: Math.round(currentPrice * 1.08),
      type: 'profit',
      percentage: 8
    },
    {
      condition: `-3%（${Math.round(currentPrice * 0.97)}円）で損切り`,
      price: Math.round(currentPrice * 0.97),
      type: 'loss',
      percentage: -3
    }
  ]
  
  scenarios.push({
    name: '上昇シナリオ',
    probability: signal === 'buy' ? 75 : signal === 'sell' ? 25 : 50,
    description: 'テクニカル指標が好転し、上昇トレンドに転換',
    entries: bullishEntries,
    exits: bullishExits,
    timeframe: '2-4週間'
  })
  
  // 下落シナリオ
  const bearishEntries: TradingEntry[] = [
    {
      condition: `${Math.round(currentPrice * 1.02)}円での戻り売り`,
      price: Math.round(currentPrice * 1.02),
      probability: 65,
      timeframe: '3-7日以内'
    }
  ]
  
  const bearishExits: TradingExit[] = [
    {
      condition: `-8%（${Math.round(currentPrice * 0.92)}円）で利確`,
      price: Math.round(currentPrice * 0.92),
      type: 'profit',
      percentage: 8
    },
    {
      condition: `+3%（${Math.round(currentPrice * 1.03)}円）で損切り`,
      price: Math.round(currentPrice * 1.03),
      type: 'loss',
      percentage: -3
    }
  ]
  
  scenarios.push({
    name: '下落シナリオ',
    probability: signal === 'sell' ? 75 : signal === 'buy' ? 25 : 50,
    description: 'テクニカル指標が悪化し、下落トレンドが継続',
    entries: bearishEntries,
    exits: bearishExits,
    timeframe: '2-4週間'
  })
  
  // レンジシナリオ
  const rangeHigh = Math.round(currentPrice * 1.05)
  const rangeLow = Math.round(currentPrice * 0.95)
  
  scenarios.push({
    name: 'レンジ相場シナリオ',
    probability: signal === 'hold' ? 60 : 30,
    description: `${rangeLow}円-${rangeHigh}円のレンジ内での推移`,
    entries: [
      {
        condition: `${rangeLow}円付近で買い`,
        price: rangeLow,
        probability: 80,
        timeframe: '1-2週間以内'
      }
    ],
    exits: [
      {
        condition: `${rangeHigh}円付近で売り`,
        price: rangeHigh,
        type: 'profit',
        percentage: 5
      }
    ],
    timeframe: '1-3ヶ月'
  })
  
  return scenarios
}

/**
 * 価格予測を生成
 */
function generatePriceForecast(
  prices: number[],
  dates: string[],
  currentPrice: number,
  signal: 'buy' | 'sell' | 'hold',
  indicators: TechnicalIndicatorData,
  entryConditions: TradingEntry[],
  exitConditions: TradingExit[]
): PriceForecast {
  const forecastDays = 30 // 30日間の予測
  const volatility = calculateVolatility(prices.slice(-20)) || 0.02
  
  // 過去のデータポイント（45日分、または利用可能な全データ）
  // チャートの視認性を向上させるため、より多くの履歴データを表示
  const historicalCount = Math.min(45, prices.length)
  const historicalPrices: PriceForecastPoint[] = prices.slice(-historicalCount).map((price, index) => ({
    date: dates[dates.length - historicalCount + index] || dates[dates.length - 1] || new Date().toISOString().split('T')[0],
    price,
    scenario: 'historical'
  }))
  
  // 現在日付（今日）を基準にして、予想は明日から開始
  const today = new Date()
  const baseDate = new Date(today)
  
  // 今日の価格データポイントを追加（実際のデータがなければ推定）
  const todayPrice = currentPrice
  const todayPoint: PriceForecastPoint = {
    date: today.toISOString().split('T')[0],
    price: todayPrice,
    scenario: 'current'
  }
  
  // 上昇シナリオ予測
  const bullishForecast: PriceForecastPoint[] = []
  let bullishPrice = currentPrice
  const bullishTrend = signal === 'buy' ? 0.02 : signal === 'sell' ? -0.005 : 0.01 // 日次リターン
  
  for (let i = 1; i <= forecastDays; i++) {
    // トレンドとランダム変動を組み合わせ
    const dailyReturn = bullishTrend + (Math.random() - 0.5) * volatility * 0.5
    bullishPrice *= (1 + dailyReturn)
    
    bullishForecast.push({
      date: addDays(baseDate, i).toISOString().split('T')[0],
      price: Math.max(bullishPrice, currentPrice * 0.7), // 最小価格制限
      scenario: 'bullish',
      confidence: Math.max(90 - i * 2, 30) // 時間が経つほど信頼度低下
    })
  }
  
  // 下落シナリオ予測
  const bearishForecast: PriceForecastPoint[] = []
  let bearishPrice = currentPrice
  const bearishTrend = signal === 'sell' ? -0.02 : signal === 'buy' ? 0.005 : -0.01
  
  for (let i = 1; i <= forecastDays; i++) {
    const dailyReturn = bearishTrend + (Math.random() - 0.5) * volatility * 0.5
    bearishPrice *= (1 + dailyReturn)
    
    bearishForecast.push({
      date: addDays(baseDate, i).toISOString().split('T')[0],
      price: Math.min(bearishPrice, currentPrice * 1.3), // 最大価格制限
      scenario: 'bearish',
      confidence: Math.max(90 - i * 2, 30)
    })
  }
  
  // 中立シナリオ予測（レンジ相場）
  const neutralForecast: PriceForecastPoint[] = []
  let neutralPrice = currentPrice
  const rangeCenter = currentPrice
  const rangeWidth = currentPrice * 0.1 // ±10%のレンジ
  
  for (let i = 1; i <= forecastDays; i++) {
    // レンジ内でのランダムウォーク
    const randomWalk = (Math.random() - 0.5) * volatility * 0.3
    const pullToCenter = (rangeCenter - neutralPrice) * 0.1 // 中心への引力
    
    neutralPrice *= (1 + randomWalk + pullToCenter / currentPrice)
    
    // レンジ内に制限
    neutralPrice = Math.max(rangeCenter - rangeWidth, Math.min(rangeCenter + rangeWidth, neutralPrice))
    
    neutralForecast.push({
      date: addDays(baseDate, i).toISOString().split('T')[0],
      price: neutralPrice,
      scenario: 'neutral',
      confidence: Math.max(80 - i * 1.5, 40)
    })
  }
  
  // エントリーポイント生成
  const entryPoints: { date: string; price: number; type: 'buy' | 'sell' }[] = []
  entryConditions.forEach((entry, index) => {
    const entryDate = addDays(baseDate, Math.floor(Math.random() * 14) + 1) // 1-14日後
    entryPoints.push({
      date: entryDate.toISOString().split('T')[0],
      price: entry.price,
      type: signal === 'buy' || signal === 'hold' ? 'buy' : 'sell'
    })
  })
  
  // エグジットポイント生成
  const exitPoints: { date: string; price: number; type: 'profit' | 'loss' }[] = []
  exitConditions.forEach((exit, index) => {
    const exitDate = addDays(baseDate, Math.floor(Math.random() * 21) + 7) // 7-28日後
    exitPoints.push({
      date: exitDate.toISOString().split('T')[0],
      price: exit.price,
      type: exit.type
    })
  })
  
  return {
    historicalPrices: [...historicalPrices, todayPoint], // 今日のデータポイントを追加
    bullishForecast,
    bearishForecast,
    neutralForecast,
    entryPoints,
    exitPoints
  }
}

/**
 * 日付に日数を追加するヘルパー関数
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
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