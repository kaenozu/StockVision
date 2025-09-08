import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Brain, Target, Calendar, BarChart3 } from 'lucide-react'

// Types based on backend API contract
interface MLPrediction {
  stock_code: string
  prediction_date: string
  target_date: string
  predictions: Record<string, any>
  ensemble_prediction: {
    predicted_price: number
    predicted_return: number
    confidence_score: number
  }
  anomaly_status: {
    overall_anomaly_level: string
    prediction_gate_action: string
    anomalies_detected: Array<{
      type: string
      level: string
      description: string
    }>
  }
  model_confidence: number
  recommendation: {
    action: 'buy' | 'sell' | 'hold'
    reasoning: string
    risk_level: string
    target_price: number
    confidence: number
  }
}

interface MLPredictionCardProps {
  stockCode: string
  currentPrice: number
  onRefresh?: () => void
}

export const MLPredictionCard: React.FC<MLPredictionCardProps> = ({
  stockCode,
  currentPrice,
  onRefresh
}) => {
  const [prediction, setPrediction] = useState<MLPrediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedHorizon, setSelectedHorizon] = useState<'short' | 'medium' | 'long' | 'all'>('all')

  const fetchPrediction = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/ml/predict/${stockCode}?prediction_horizon=${selectedHorizon}&include_confidence=true`
      )
      
      if (response.status === 503) {
        const errorData = await response.json()
        setError(`予測サービス利用不可: ${errorData.detail}`)
        return
      }
      
      if (!response.ok) {
        throw new Error('予測の取得に失敗しました')
      }
      
      const data = await response.json()
      setPrediction(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '予測の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrediction()
  }, [stockCode, selectedHorizon])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'sell': return <TrendingDown className="w-5 h-5 text-red-600" />
      default: return <Target className="w-5 h-5 text-gray-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy': return 'text-green-600 bg-green-50 border-green-200'
      case 'sell': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getAnomalyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case '高': return 'text-red-600 bg-red-50'
      case '中': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-green-600 bg-green-50'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI予測分析</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI予測分析</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
          <button 
            onClick={fetchPrediction}
            className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  if (!prediction) {
    return null
  }

  const predictedChange = prediction.ensemble_prediction.predicted_price - currentPrice
  const predictedChangePercent = (predictedChange / currentPrice) * 100

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI予測分析</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <select 
            value={selectedHorizon}
            onChange={(e) => setSelectedHorizon(e.target.value as any)}
            className="text-sm border-gray-300 rounded-md"
          >
            <option value="all">全期間</option>
            <option value="short">短期</option>
            <option value="medium">中期</option>
            <option value="long">長期</option>
          </select>
          
          <button
            onClick={fetchPrediction}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            更新
          </button>
        </div>
      </div>

      {/* Anomaly Status */}
      {prediction.anomaly_status.overall_anomaly_level !== 'normal' && (
        <div className={`rounded-lg p-3 mb-4 border ${getAnomalyColor(prediction.anomaly_status.overall_anomaly_level)}`}>
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium text-sm">
              市場異常検知: {prediction.anomaly_status.overall_anomaly_level}
            </span>
          </div>
          {prediction.anomaly_status.anomalies_detected.map((anomaly, index) => (
            <p key={index} className="text-xs opacity-80">
              • {anomaly.description}
            </p>
          ))}
        </div>
      )}

      {/* Main Prediction */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">予測価格</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ¥{formatPrice(prediction.ensemble_prediction.predicted_price)}
          </div>
          <div className={`text-sm ${predictedChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {predictedChange >= 0 ? '+' : ''}{formatPrice(predictedChange)} 
            ({predictedChangePercent >= 0 ? '+' : ''}{predictedChangePercent.toFixed(2)}%)
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">信頼度</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatPercentage(prediction.model_confidence)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${prediction.model_confidence * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">対象日</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatDate(prediction.target_date)}
          </div>
          <div className="text-xs text-gray-600">
            予測日: {formatDate(prediction.prediction_date)}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`rounded-lg p-4 border ${getActionColor(prediction.recommendation.action)}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getActionIcon(prediction.recommendation.action)}
            <span className="font-semibold">
              推奨アクション: {prediction.recommendation.action.toUpperCase()}
            </span>
          </div>
          
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(prediction.recommendation.risk_level)}`}>
            リスク: {prediction.recommendation.risk_level}
          </div>
        </div>
        
        <p className="text-sm mb-3">{prediction.recommendation.reasoning}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>目標価格: ¥{formatPrice(prediction.recommendation.target_price)}</span>
          <span>推奨信頼度: {formatPercentage(prediction.recommendation.confidence)}</span>
        </div>
      </div>

      {/* Individual Model Predictions */}
      {Object.keys(prediction.predictions).length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">個別モデル予測</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(prediction.predictions).map(([modelKey, modelPred]: [string, any]) => (
              <div key={modelKey} className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-sm text-gray-900 mb-1">
                  {modelKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div className="text-sm text-gray-600">
                  予測: {formatPercentage(modelPred.prediction)}
                </div>
                <div className="text-xs text-gray-500">
                  信頼度: {formatPercentage(modelPred.confidence)} | 重み: {formatPercentage(modelPred.weight)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <p>
          ⚠️ この予測は機械学習モデルによる分析結果であり、投資の判断材料の一つとしてご活用ください。
          実際の投資判断は自己責任でお願いします。
        </p>
      </div>
    </div>
  )
}

export default MLPredictionCard