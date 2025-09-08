import React, { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import LoadingState from '../components/enhanced/LoadingState'

interface TradingRecommendation {
  id: string
  stockCode: string
  companyName: string
  action: 'buy' | 'sell' | 'hold'
  currentPrice: number
  targetPrice: number
  confidence: number
  reasoning: string[]
  timeframe: string
}

const TradingRecommendationsPage: React.FC = () => {
  const { } = useTheme() // actualTheme unused - to be implemented
  const [recommendations, setRecommendations] = useState<TradingRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading trading recommendations
    setTimeout(() => {
      const mockRecommendations: TradingRecommendation[] = [
        {
          id: '1',
          stockCode: '7203',
          companyName: 'トヨタ自動車',
          action: 'buy',
          currentPrice: 2500,
          targetPrice: 2800,
          confidence: 85,
          reasoning: [
            'EV市場への積極的な投資',
            '四半期決算が市場予想を上回る',
            '自動運転技術の進歩'
          ],
          timeframe: '3ヶ月'
        },
        {
          id: '2',
          stockCode: '6758',
          companyName: 'ソニーグループ',
          action: 'hold',
          currentPrice: 12000,
          targetPrice: 12500,
          confidence: 70,
          reasoning: [
            'ゲーム事業の安定した成長',
            '半導体市場の不透明感',
            '円安による輸出メリット'
          ],
          timeframe: '6ヶ月'
        },
        {
          id: '3',
          stockCode: '9984',
          companyName: 'ソフトバンクグループ',
          action: 'sell',
          currentPrice: 5400,
          targetPrice: 4800,
          confidence: 75,
          reasoning: [
            '投資先の業績不安',
            '金利上昇による借入コスト増',
            '市場センチメントの悪化'
          ],
          timeframe: '1ヶ月'
        }
      ]
      setRecommendations(mockRecommendations)
      setLoading(false)
    }, 2000)
  }, [])

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20'
      case 'sell': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'
      case 'hold': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getActionText = (action: string) => {
    switch (action) {
      case 'buy': return '買い推奨'
      case 'sell': return '売り推奨'
      case 'hold': return '保有推奨'
      default: return action
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          投資判断
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          AIアナリストによる投資判断とその根拠をご確認ください
        </p>
      </div>

      {loading ? (
        <LoadingState 
          type="skeleton" 
          variant="table" 
          rows={5}
          message="投資判断を分析中..."
        />
      ) : (
        <div className="space-y-6">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {rec.companyName}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    ({rec.stockCode})
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(rec.action)}`}>
                    {getActionText(rec.action)}
                  </span>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    信頼度: {rec.confidence}%
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  <div className="text-sm text-gray-600 dark:text-gray-400">現在価格</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    ¥{rec.currentPrice.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  <div className="text-sm text-gray-600 dark:text-gray-400">目標価格</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    ¥{rec.targetPrice.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  <div className="text-sm text-gray-600 dark:text-gray-400">期間</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {rec.timeframe}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">判断根拠:</h4>
                <ul className="space-y-1">
                  {rec.reasoning.map((reason, index) => (
                    <li key={index} className="text-gray-600 dark:text-gray-400 flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>リスク警告:</strong> この判断は過去のデータに基づく予測であり、
                  実際の投資結果を保証するものではありません。投資は自己責任で行ってください。
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TradingRecommendationsPage