import React, { useState, useEffect } from 'react'
import { Brain, Play, Trash2, RefreshCw, AlertCircle, CheckCircle, Clock, Settings } from 'lucide-react'

// Types based on backend API
interface MLModel {
  model_id: string
  name: string
  model_type: string
  algorithm: string
  version: string
  is_trained: boolean
  feature_count: number
  performance_metrics: {
    validation_metrics?: {
      r2_score: number
      mae: number
      rmse: number
    }
    trained_at?: string
  }
}

interface TrainingRequest {
  stock_codes?: string[]
  model_types: string[]
  algorithms: string[]
  days_history: number
  force_retrain: boolean
}

export const MLModelManager: React.FC = () => {
  const [models, setModels] = useState<MLModel[]>([])
  const [loading, setLoading] = useState(false)
  const [training, setTraining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Training configuration
  const [trainingConfig, setTrainingConfig] = useState<TrainingRequest>({
    model_types: ['short_term', 'medium_term', 'long_term'],
    algorithms: ['random_forest', 'linear_regression'],
    days_history: 365,
    force_retrain: false
  })

  const [showTrainingForm, setShowTrainingForm] = useState(false)

  const fetchModels = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ml/models')
      if (!response.ok) {
        throw new Error('モデル一覧の取得に失敗しました')
      }
      
      const data = await response.json()
      setModels(data.models)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'モデル一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const startTraining = async () => {
    setTraining(true)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch('/api/ml/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trainingConfig)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'トレーニングの開始に失敗しました')
      }
      
      const data = await response.json()
      setSuccess(`トレーニングを開始しました (ID: ${data.training_job_id})。推定完了時間: ${data.estimated_duration_minutes}分`)
      setShowTrainingForm(false)
      
      // Refresh models after a delay
      setTimeout(fetchModels, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'トレーニングの開始に失敗しました')
    } finally {
      setTraining(false)
    }
  }

  const deleteModel = async (modelId: string) => {
    if (!confirm('このモデルを削除してもよろしいですか？')) {
      return
    }

    try {
      const response = await fetch(`/api/ml/models/${modelId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('モデルの削除に失敗しました')
      }
      
      setSuccess('モデルを削除しました')
      fetchModels()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'モデルの削除に失敗しました')
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  const getModelStatusIcon = (model: MLModel) => {
    if (model.is_trained) {
      return <CheckCircle className="w-5 h-5 text-green-600" />
    } else {
      return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600'
    if (score >= 0.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'なし'
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">MLモデル管理</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchModels}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>更新</span>
          </button>
          
          <button
            onClick={() => setShowTrainingForm(!showTrainingForm)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Play className="w-4 h-4" />
            <span>モデル訓練</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Training Form */}
      {showTrainingForm && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">モデル訓練設定</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                モデルタイプ
              </label>
              <div className="space-y-2">
                {['short_term', 'medium_term', 'long_term'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={trainingConfig.model_types.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTrainingConfig(prev => ({
                            ...prev,
                            model_types: [...prev.model_types, type]
                          }))
                        } else {
                          setTrainingConfig(prev => ({
                            ...prev,
                            model_types: prev.model_types.filter(t => t !== type)
                          }))
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                アルゴリズム
              </label>
              <div className="space-y-2">
                {['random_forest', 'linear_regression', 'svr'].map(algorithm => (
                  <label key={algorithm} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={trainingConfig.algorithms.includes(algorithm)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTrainingConfig(prev => ({
                            ...prev,
                            algorithms: [...prev.algorithms, algorithm]
                          }))
                        } else {
                          setTrainingConfig(prev => ({
                            ...prev,
                            algorithms: prev.algorithms.filter(a => a !== algorithm)
                          }))
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{algorithm}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                履歴日数
              </label>
              <input
                type="number"
                value={trainingConfig.days_history}
                onChange={(e) => setTrainingConfig(prev => ({
                  ...prev,
                  days_history: parseInt(e.target.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="30"
                max="1095"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={trainingConfig.force_retrain}
                  onChange={(e) => setTrainingConfig(prev => ({
                    ...prev,
                    force_retrain: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">強制再訓練</span>
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={startTraining}
              disabled={training || trainingConfig.model_types.length === 0 || trainingConfig.algorithms.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {training ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{training ? '訓練中...' : '訓練開始'}</span>
            </button>
            
            <button
              onClick={() => setShowTrainingForm(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Models List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">モデル情報を読み込み中...</p>
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">訓練済みモデルがありません</p>
            <p className="text-sm text-gray-500">「モデル訓練」ボタンから新しいモデルを作成してください</p>
          </div>
        ) : (
          models.map((model) => (
            <div key={model.model_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getModelStatusIcon(model)}
                  <div>
                    <h3 className="font-medium text-gray-900">{model.name}</h3>
                    <p className="text-sm text-gray-600">
                      {model.algorithm} | {model.model_type} | v{model.version}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => deleteModel(model.model_id)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                    title="モデルを削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">ステータス:</span>
                  <p className="font-medium">
                    {model.is_trained ? (
                      <span className="text-green-600">訓練済み</span>
                    ) : (
                      <span className="text-gray-500">未訓練</span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-gray-600">特徴量数:</span>
                  <p className="font-medium">{model.feature_count}</p>
                </div>

                {model.performance_metrics.validation_metrics && (
                  <>
                    <div>
                      <span className="text-gray-600">R²スコア:</span>
                      <p className={`font-medium ${getPerformanceColor(model.performance_metrics.validation_metrics.r2_score)}`}>
                        {model.performance_metrics.validation_metrics.r2_score.toFixed(4)}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-600">RMSE:</span>
                      <p className="font-medium">
                        {model.performance_metrics.validation_metrics.rmse.toFixed(4)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {model.performance_metrics.trained_at && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                  最終訓練: {formatDate(model.performance_metrics.trained_at)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{models.length}</p>
            <p className="text-gray-600">総モデル数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {models.filter(m => m.is_trained).length}
            </p>
            <p className="text-gray-600">訓練済み</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {models.filter(m => m.performance_metrics.validation_metrics?.r2_score >= 0.7).length}
            </p>
            <p className="text-gray-600">高精度モデル</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MLModelManager