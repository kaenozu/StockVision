import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Target, Calendar, BarChart3 } from 'lucide-react'
import { TradingRecommendation, generateTradingSignal } from '../../utils/tradingSignals'
import { calculateAllIndicators } from '../../utils/technicalIndicators'
import { stockApi } from '../../services/stockApi'
import PriceForecastChart from '../stock/PriceForecastChart'

interface TradingRecommendationProps {
  stockCode: string
  currentPrice: number
}

const TradingRecommendationComponent: React.FC<TradingRecommendationProps> = ({
  stockCode,
  currentPrice
}) => {
  const [recommendation, setRecommendation] = useState<TradingRecommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  console.log(`[TradingRecommendation] Component rendered for ${stockCode}, currentPrice: ${currentPrice}`)

  // スマート更新関数（スクロール位置保持）
  const fetchTradingSignal = React.useCallback(async (isManualRefresh = false) => {
    try {
      // 手動更新の場合は既存データを保持してスクロール位置を記録
      const currentScrollY = window.scrollY
      const containerScrollTop = containerRef.current?.scrollTop || 0
      
      if (isManualRefresh) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
        
        console.log(`[TradingRecommendation] Fetching 90-day history for ${stockCode}`)
        
        // 価格履歴データを取得（90日分）
        const historyResponse = await stockApi.getPriceHistory(stockCode, 90)
        
        console.log(`[TradingRecommendation] Received ${historyResponse.length} days of data for ${stockCode}`)
        
        if (!historyResponse || historyResponse.length === 0) {
          throw new Error('価格履歴データが取得できませんでした')
        }

        // データが不足している場合は簡易判定を使用
        if (historyResponse.length < 20) {
          // 短期間データでの簡易判定
          const latestPrice = historyResponse[historyResponse.length - 1].close
          const oldestPrice = historyResponse[0].close
          const priceChange = ((latestPrice - oldestPrice) / oldestPrice) * 100
          
          const simpleTradingSignal = {
            type: priceChange > 2 ? 'buy' as const : priceChange < -2 ? 'sell' as const : 'hold' as const,
            strength: Math.abs(priceChange) > 5 ? 'strong' as const : 
                     Math.abs(priceChange) > 2 ? 'moderate' as const : 'weak' as const,
            price: latestPrice,
            date: historyResponse[historyResponse.length - 1].date,
            reasons: [
              `短期トレンド分析（${historyResponse.length}日間）`,
              `価格変動: ${priceChange.toFixed(2)}%`,
              'データ不足のため簡易判定を使用'
            ],
            confidence: Math.min(historyResponse.length * 2, 50) // データ量に応じた信頼度
          }
          
          const simpleRecommendation = {
            currentSignal: simpleTradingSignal,
            riskLevel: 'high' as const,
            priceTarget: latestPrice * (priceChange > 0 ? 1.05 : 0.95),
            stopLoss: latestPrice * (priceChange > 0 ? 0.95 : 1.05)
          }
          
          setRecommendation(simpleRecommendation)
          return
        }

        // 価格と日付を抽出
        const prices = historyResponse.map(item => item.close)
        const dates = historyResponse.map(item => item.date)

        // テクニカル指標を計算
        console.log(`[TradingRecommendation] Calculating technical indicators for ${prices.length} price points`)
        const indicators = calculateAllIndicators(prices)
        console.log(`[TradingRecommendation] Technical indicators calculated`, indicators)

        // 売買判定を生成
        console.log(`[TradingRecommendation] Generating trading signal...`)
        
        // 実際のテクニカル分析による売買判定を生成
        const tradingRecommendation = generateTradingSignal(prices, indicators, currentPrice, dates)
        console.log(`[TradingRecommendation] Technical analysis trading recommendation generated:`, tradingRecommendation)
        
        setRecommendation(tradingRecommendation)
        setLastUpdated(new Date())
        console.log(`[TradingRecommendation] Recommendation set successfully`)
        
        // スクロール位置を復元（手動更新の場合のみ）
        if (isManualRefresh) {
          setTimeout(() => {
            window.scrollTo(0, currentScrollY)
            if (containerRef.current) {
              containerRef.current.scrollTop = containerScrollTop
            }
          }, 100)
        }
      } catch (err) {
        console.error('[TradingRecommendation] Trading signal generation error:', err)
        console.error('[TradingRecommendation] Error stack:', err instanceof Error ? err.stack : 'No stack trace')
        const errorMessage = err instanceof Error ? err.message : '売買判定の生成に失敗しました'
        console.error('[TradingRecommendation] Error message:', errorMessage)
        setError(errorMessage)
      } finally {
        console.log('[TradingRecommendation] Setting loading to false')
        setLoading(false)
        setIsRefreshing(false)
      }
    }, [stockCode, currentPrice])

  // 初回データ読み込み
  useEffect(() => {
    if (stockCode && currentPrice > 0) {
      fetchTradingSignal()
    }
  }, [stockCode, currentPrice, fetchTradingSignal])

  // 自動更新は削除済み - 手動更新のみ対応

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">売買判定</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">分析中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">売買判定</h3>
        <div className="text-red-600 text-center py-4">
          <p>⚠️ {error}</p>
        </div>
      </div>
    )
  }

  if (!recommendation) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">売買判定</h3>
        <p className="text-gray-600 text-center py-4">データが不足しています</p>
      </div>
    )
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'buy': return 'text-green-600 bg-green-50 border-green-200'
      case 'sell': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    }
  }

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'buy': return '📈'
      case 'sell': return '📉'
      default: return '➖'
    }
  }

  const getSignalText = (signal: string) => {
    switch (signal) {
      case 'buy': return '買い推奨'
      case 'sell': return '売り推奨'
      default: return '様子見'
    }
  }

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'strong': return '強い'
      case 'moderate': return '中程度'
      default: return '弱い'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      default: return 'text-red-600'
    }
  }

  const getRiskText = (risk: string) => {
    switch (risk) {
      case 'low': return '低リスク'
      case 'medium': return '中リスク'
      default: return '高リスク'
    }
  }

  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          🎯 売買判定 ({stockCode})
        </h3>
        
        {/* スマート更新コントロール */}
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              更新: {lastUpdated.toLocaleTimeString('ja-JP')}
            </span>
          )}
          
          <button
            onClick={() => fetchTradingSignal(true)}
            disabled={isRefreshing}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              isRefreshing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRefreshing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                更新中
              </span>
            ) : (
              '🔄 更新'
            )}
          </button>
        </div>
      </div>

      {/* メイン判定 */}
      <div className={`border-2 rounded-lg p-4 mb-4 ${getSignalColor(recommendation.currentSignal.type)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <span className="text-2xl mr-2">{getSignalIcon(recommendation.currentSignal.type)}</span>
            <span className="text-xl font-bold">
              {getSignalText(recommendation.currentSignal.type)}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-75">信頼度</div>
            <div className="text-lg font-semibold">{recommendation.currentSignal.confidence}%</div>
          </div>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span>強度: {getStrengthText(recommendation.currentSignal.strength)}</span>
          <span className={getRiskColor(recommendation.riskLevel)}>
            {getRiskText(recommendation.riskLevel)}
          </span>
        </div>
      </div>

      {/* 価格ターゲット */}
      {(recommendation.priceTarget || recommendation.stopLoss) && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {recommendation.priceTarget && (
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-600 mb-1">目標価格</div>
              <div className="text-lg font-semibold text-blue-600">
                ¥{recommendation.priceTarget.toLocaleString()}
              </div>
            </div>
          )}
          {recommendation.stopLoss && (
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-600 mb-1">ストップロス</div>
              <div className="text-lg font-semibold text-red-600">
                ¥{recommendation.stopLoss.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 判定理由 */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-gray-700 mb-2">📋 判定根拠</h4>
        <ul className="space-y-1">
          {recommendation.currentSignal.reasons.map((reason, index) => (
            <li key={index} className="text-sm text-gray-600 flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* エントリー条件 */}
      {recommendation.entryConditions && recommendation.entryConditions.length > 0 && (
        <div className="border-t pt-4 mb-4">
          <h4 className="font-semibold text-gray-700 mb-3">🎯 いつ買う/売るべきか</h4>
          <div className="space-y-2">
            {recommendation.entryConditions.map((entry, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-blue-800">{entry.condition}</span>
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                    成功率 {entry.probability}%
                  </span>
                </div>
                <div className="text-xs text-blue-600">
                  タイミング: {entry.timeframe} | 価格: ¥{entry.price.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* エグジット条件 */}
      {recommendation.exitConditions && recommendation.exitConditions.length > 0 && (
        <div className="border-t pt-4 mb-4">
          <h4 className="font-semibold text-gray-700 mb-3">🏃‍♂️ いつ利確/損切りするか</h4>
          <div className="space-y-2">
            {recommendation.exitConditions.map((exit, index) => (
              <div key={index} className={`border rounded p-3 ${
                exit.type === 'profit' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-medium ${
                    exit.type === 'profit' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {exit.condition}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    exit.type === 'profit' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-red-600 text-white'
                  }`}>
                    {exit.percentage > 0 ? '+' : ''}{exit.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className={`text-xs ${
                  exit.type === 'profit' ? 'text-green-600' : 'text-red-600'
                }`}>
                  価格: ¥{exit.price.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* タイミング予測 */}
      {recommendation.timingPrediction && (
        <div className="border-t pt-4 mb-4">
          <h4 className="font-semibold text-gray-700 mb-3">⏰ 次のシグナル予測</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="text-xs text-green-600 font-medium mb-1">次の買いタイミング</div>
              <div className="text-sm text-green-800">{recommendation.timingPrediction.nextBuySignal}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="text-xs text-red-600 font-medium mb-1">次の売りタイミング</div>
              <div className="text-sm text-red-800">{recommendation.timingPrediction.nextSellSignal}</div>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded">
              予測信頼度: {recommendation.timingPrediction.confidence}%
            </span>
          </div>
        </div>
      )}

      {/* シナリオ分析 */}
      {recommendation.scenarios && recommendation.scenarios.length > 0 && (
        <div className="border-t pt-4 mb-4">
          <h4 className="font-semibold text-gray-700 mb-3">🎭 シナリオ分析</h4>
          <div className="space-y-3">
            {recommendation.scenarios.map((scenario, index) => (
              <div key={index} className="border rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-800">{scenario.name}</span>
                    <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded">
                      {scenario.probability}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{scenario.timeframe}</span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                
                {/* エントリー・エグジット条件の簡易表示 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="font-medium text-blue-600 mb-1">エントリー</div>
                    {scenario.entries.slice(0, 1).map((entry, i) => (
                      <div key={i} className="text-gray-600">{entry.condition}</div>
                    ))}
                  </div>
                  <div>
                    <div className="font-medium text-green-600 mb-1">エグジット</div>
                    {scenario.exits.slice(0, 1).map((exit, i) => (
                      <div key={i} className="text-gray-600">{exit.condition}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 価格予想チャート */}
      {recommendation.priceForecast && (
        <div className="border-t pt-4 mb-4">
          <PriceForecastChart 
            forecast={recommendation.priceForecast}
            currentPrice={currentPrice}
            stockCode={stockCode}
          />
        </div>
      )}

      {/* 免責事項 */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        ⚠️ この判定は参考情報であり、投資の最終判断はご自身で行ってください。
        投資にはリスクが伴いますので、十分検討の上で実行してください。
      </div>
    </div>
  )
}

export default TradingRecommendationComponent