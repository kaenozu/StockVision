import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// 固定の株価データ
const fixedStockData = [
  { code: '7203', name: 'トヨタ自動車', price: 2340, change: 57, changePercent: 2.5 },
  { code: '9984', name: 'ソフトバンクグループ', price: 5680, change: -104, changePercent: -1.8 },
  { code: '6758', name: 'ソニーグループ', price: 12800, change: 320, changePercent: 2.6 },
  { code: '7974', name: '任天堂', price: 6890, change: 213, changePercent: 3.2 },
  { code: '6861', name: 'キーエンス', price: 48500, change: -725, changePercent: -1.5 },
  { code: '9983', name: 'ファーストリテイリング', price: 8950, change: 178, changePercent: 2.0 }
]

interface Stock {
  code: string
  name: string
  price: number
  change: number
  changePercent: number
}

const StockDashboardInline = () => {
  const [stocks, setStocks] = useState<Stock[]>(fixedStockData)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const refreshData = () => {
    // 簡単な擬似更新（実際のAPIがあれば、ここで呼び出す）
    setLoading(true)
    setTimeout(() => {
      setStocks([...fixedStockData])
      setLoading(false)
    }, 500)
  }

  const upStocks = stocks.filter(s => s.change > 0).length
  const downStocks = stocks.filter(s => s.change < 0).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">
          📊 株価データを読み込み中...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 p-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl p-6 shadow-2xl border border-indigo-300">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
            📊 StockVision ダッシュボード
          </h1>
          <p className="text-xl text-white font-semibold m-0">
            リアルタイム株価情報システム
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div 
            className="cursor-pointer transform transition-transform duration-200 bg-gradient-to-br from-slate-50 to-slate-200 rounded-xl p-6 shadow-lg border border-slate-300 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-600 m-0">上昇銘柄</p>
                <p className="text-3xl font-bold text-slate-800 mt-1 m-0">{upStocks}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-3xl shadow-2xl border-2 border-white">
                📈
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="bg-indigo-500 text-white text-xs py-1 px-3 rounded-full font-bold">
                統計情報
              </span>
            </div>
          </div>

          <div className="cursor-pointer transform transition-transform duration-200 bg-gradient-to-br from-slate-50 to-slate-200 rounded-xl p-6 shadow-lg border border-slate-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-600 m-0">下落銘柄</p>
                <p className="text-3xl font-bold text-slate-800 mt-1 m-0">{downStocks}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-3xl shadow-2xl border-2 border-white">
                📉
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="bg-indigo-500 text-white text-xs py-1 px-3 rounded-full font-bold">
                統計情報
              </span>
            </div>
          </div>

          <div className="cursor-pointer transform transition-transform duration-200 bg-gradient-to-br from-slate-50 to-slate-200 rounded-xl p-6 shadow-lg border border-slate-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-600 m-0">監視銘柄</p>
                <p className="text-3xl font-bold text-slate-800 mt-1 m-0">{stocks.length}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-3xl shadow-2xl border-2 border-white">
                👀
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="bg-indigo-500 text-white text-xs py-1 px-3 rounded-full font-bold">
                統計情報
              </span>
            </div>
          </div>
        </div>

        {/* 株価カード一覧セクション */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white text-center mb-6 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg p-4 shadow-lg">
            🏢 主要銘柄一覧 🏢
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {stocks.map((stock) => {
              const isPositive = stock.change >= 0
              return (
                <div 
                  key={stock.code} 
                  className={`cursor-pointer transform transition-transform duration-200 rounded-xl p-6 shadow-2xl border-2 hover:scale-105 ${
                    isPositive 
                      ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-300' 
                      : 'bg-gradient-to-br from-red-100 to-red-200 border-red-300'
                  }`}
                  onClick={() => navigate(`/stock/${stock.code}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2 m-0">{stock.name}</h3>
                      <p className="text-sm font-semibold text-gray-600 bg-gray-200 py-1 px-2 rounded inline-block m-0">{stock.code}</p>
                    </div>
                    <div className={`py-3 px-4 rounded-full text-sm font-bold shadow-lg text-white ${
                      isPositive ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {isPositive ? '+' : ''}{stock.changePercent}%
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-gray-800 mb-2 m-0">
                        ¥{stock.price.toLocaleString()}
                      </p>
                      <p className={`text-lg font-bold m-0 ${
                        isPositive ? 'text-green-700' : 'text-red-600'
                      }`}>
                        {isPositive ? '+' : ''}¥{Math.abs(stock.change).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-4xl">
                      {isPositive ? '📈' : '📉'}
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <span className="bg-blue-500 text-white text-xs py-1 px-3 rounded-full font-semibold">
                      クリックで詳細
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-12 pt-8 bg-gradient-to-br from-slate-600 to-slate-500 rounded-xl shadow-lg border border-slate-500 p-8">
          <button
            onClick={refreshData}
            className="transform transition-transform duration-200 bg-gradient-to-br from-indigo-500 to-violet-500 text-white py-4 px-8 rounded-full font-bold text-lg shadow-2xl border-2 border-yellow-300 cursor-pointer hover:scale-110"
          >
            🔄 最新データに更新する
          </button>
          <p className="text-lg text-white font-semibold mt-4 m-0">
            最終更新時刻: {new Date().toLocaleTimeString('ja-JP')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default StockDashboardInline