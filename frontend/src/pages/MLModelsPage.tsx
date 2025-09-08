import React from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import MLModelManager from '../components/ml/MLModelManager'

export function MLModelsPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">機械学習モデル管理</h1>
          <p className="text-gray-600">株価予測に使用するMLモデルの訓練・管理を行います</p>
        </div>
        
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          icon="←"
        >
          ホームに戻る
        </Button>
      </div>

      {/* Model Manager Component */}
      <MLModelManager />

      {/* Documentation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">モデルについて</h3>
        
        <div className="space-y-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">モデルタイプ:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>短期 (Short-term):</strong> 1-5日間の予測に最適化</li>
              <li><strong>中期 (Medium-term):</strong> 1-4週間の予測に最適化</li>
              <li><strong>長期 (Long-term):</strong> 1-3ヶ月の予測に最適化</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">アルゴリズム:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Random Forest:</strong> 非線形パターンの検出に優れている</li>
              <li><strong>Linear Regression:</strong> トレンド追跡に適している</li>
              <li><strong>SVR (Support Vector Regression):</strong> 複雑な市場パターンに対応</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">評価指標:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>R²スコア:</strong> 0.7以上で高精度（1.0が最高）</li>
              <li><strong>RMSE:</strong> 予測誤差の標準偏差（低いほど良い）</li>
              <li><strong>信頼度:</strong> 個別予測の確度（0-100%）</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-100 rounded-md">
          <p className="text-xs text-blue-700">
            <strong>注意:</strong> モデルの訓練には時間がかかります。最初の訓練では数分から数十分かかる場合があります。
            市場の状況や予測精度に応じて定期的な再訓練を推奨します。
          </p>
        </div>
      </div>
    </div>
  )
}

export default MLModelsPage