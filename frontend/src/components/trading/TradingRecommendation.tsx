import React, { useState, useEffect } from 'react'
import { TradingRecommendation, generateTradingSignal } from '../../utils/tradingSignals'
import { calculateAllIndicators } from '../../utils/technicalIndicators'
import { stockApi } from '../../services/stockApi'

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

  useEffect(() => {
    const fetchTradingSignal = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // 価格履歴データを取得（90日分）
        const historyResponse = await stockApi.getPriceHistory(stockCode, 90)
        
        if (!historyResponse.data || historyResponse.data.length === 0) {
          throw new Error('価格履歴データが取得できませんでした')
        }

        // 価格と日付を抽出
        const prices = historyResponse.data.map(item => item.close)
        const dates = historyResponse.data.map(item => item.date)

        // テクニカル指標を計算
        const indicators = calculateAllIndicators(prices)

        // 売買判定を生成
        const tradingRecommendation = generateTradingSignal(prices, indicators, currentPrice, dates)
        
        setRecommendation(tradingRecommendation)
      } catch (err) {
        console.error('Trading signal generation error:', err)
        setError(err instanceof Error ? err.message : '売買判定の生成に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    if (stockCode && currentPrice > 0) {
      fetchTradingSignal()
    }
  }, [stockCode, currentPrice])

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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        🎯 売買判定 ({stockCode})
      </h3>

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

      {/* 免責事項 */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        ⚠️ この判定は参考情報であり、投資の最終判断はご自身で行ってください。
        投資にはリスクが伴いますので、十分検討の上で実行してください。
      </div>
    </div>
  )
}

export default TradingRecommendationComponent