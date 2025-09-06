import React, { useState, useEffect } from 'react'

// シンプルなモックAPI
const mockApi = {
  getCurrentPrice: async (_code: string) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    const basePrice = 1000 + Math.random() * 5000
    const change = (Math.random() - 0.5) * 200
    return {
      current_price: Math.round(basePrice),
      price_change: Math.round(change),
      price_change_pct: Number(((change / basePrice) * 100).toFixed(2))
    }
  }
}

interface Stock {
  code: string
  name: string
  price: number
  change: number
  changePercent: number
}

const ColorfulDashboard = () => {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStocks()
  }, [])

  const loadStocks = async () => {
    setLoading(true)
    const stockCodes = [
      { code: '7203', name: 'トヨタ自動車' },
      { code: '9984', name: 'ソフトバンクグループ' },
      { code: '6758', name: 'ソニーグループ' },
      { code: '7974', name: '任天堂' },
      { code: '6861', name: 'キーエンス' },
      { code: '9983', name: 'ファーストリテイリング' }
    ]

    try {
      const stockData = await Promise.all(
        stockCodes.map(async ({ code, name }) => {
          const data = await mockApi.getCurrentPrice(code)
          return {
            code,
            name,
            price: data.current_price,
            change: data.price_change,
            changePercent: data.price_change_pct
          }
        })
      )
      setStocks(stockData)
    } catch (error) {
      console.error('データの取得に失敗しました:', error)
    } finally {
      setLoading(false)
    }
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 shadow-xl border-2 border-yellow-300">
          <h1 className="text-4xl font-bold text-white mb-2 shadow-lg">
            📊 NEW COLORFUL DESIGN! 🎨
          </h1>
          <p className="text-xl text-white font-semibold">
            美しいカラフルな株価情報システム
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="cursor-pointer transform hover:scale-105 transition-all duration-200 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 shadow-lg border-2 border-blue-300 hover:border-blue-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">上昇銘柄</p>
                <p className="text-3xl font-bold text-white mt-1">{upStocks}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-3xl shadow-lg border-2 border-white">
                📈
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="bg-white text-blue-600 text-xs px-3 py-1 rounded-full font-bold">
                統計情報
              </span>
            </div>
          </div>

          <div className="cursor-pointer transform hover:scale-105 transition-all duration-200 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 shadow-lg border-2 border-blue-300 hover:border-blue-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">下落銘柄</p>
                <p className="text-3xl font-bold text-white mt-1">{downStocks}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-3xl shadow-lg border-2 border-white">
                📉
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="bg-white text-blue-600 text-xs px-3 py-1 rounded-full font-bold">
                統計情報
              </span>
            </div>
          </div>

          <div className="cursor-pointer transform hover:scale-105 transition-all duration-200 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 shadow-lg border-2 border-blue-300 hover:border-blue-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">監視銘柄</p>
                <p className="text-3xl font-bold text-white mt-1">{stocks.length}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-3xl shadow-lg border-2 border-white">
                👀
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="bg-white text-blue-600 text-xs px-3 py-1 rounded-full font-bold">
                統計情報
              </span>
            </div>
          </div>
        </div>

        {/* 株価カード一覧セクション */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-4 shadow-lg">
            🏢 主要銘柄一覧 🏢
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stocks.map((stock) => {
              const isPositive = stock.change >= 0
              return (
                <div key={stock.code} className={`cursor-pointer transform hover:scale-105 transition-all duration-200 rounded-xl p-6 shadow-lg border-2 ${
                  isPositive 
                    ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300 hover:border-green-400' 
                    : 'bg-gradient-to-br from-red-50 to-red-100 border-red-300 hover:border-red-400'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{stock.name}</h3>
                      <p className="text-sm font-semibold text-gray-600 bg-gray-200 px-2 py-1 rounded">{stock.code}</p>
                    </div>
                    <div className={`px-3 py-2 rounded-full text-sm font-bold shadow-md ${
                      isPositive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {isPositive ? '+' : ''}{stock.changePercent}%
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        ¥{stock.price.toLocaleString()}
                      </p>
                      <p className={`text-lg font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                        {isPositive ? '+' : ''}¥{Math.abs(stock.change).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-4xl">
                      {isPositive ? '📈' : '📉'}
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                      クリックで詳細
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-12 pt-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl shadow-xl border-2 border-green-400">
          <button
            onClick={loadStocks}
            className="transform hover:scale-110 transition-all duration-200 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg border-2 border-yellow-300 hover:border-yellow-200"
          >
            🔄 最新データに更新する
          </button>
          <p className="text-lg text-white font-semibold mt-4">
            最終更新時刻: {new Date().toLocaleTimeString('ja-JP')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ColorfulDashboard