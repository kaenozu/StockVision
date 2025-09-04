import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StockSearch from '../components/stock/StockSearch'
import { useTheme } from '../contexts/ThemeContext'

export function SearchPage() {
  const [searchLoading, setSearchLoading] = useState(false)
  const { theme } = useTheme()
  const navigate = useNavigate()

  const handleSearch = async (stockCode: string, useRealData: boolean) => {
    setSearchLoading(true)
    try {
      const params = new URLSearchParams()
      if (useRealData) params.set('real', 'true')
      
      const url = `/stock/${stockCode}${params.toString() ? `?${params.toString()}` : ''}`
      navigate(url)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const popularStocks = [
    { code: '7203', name: 'トヨタ自動車' },
    { code: '6758', name: 'ソニーグループ' },
    { code: '9984', name: 'ソフトバンクグループ' },
    { code: '6861', name: 'キーエンス' },
    { code: '7974', name: '任天堂' },
    { code: '4502', name: '武田薬品工業' },
    { code: '6501', name: '日立製作所' },
    { code: '6098', name: 'リクルートホールディングス' },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">株価検索</h1>
        <p className="text-gray-600">
          銘柄コードまたは企業名で株価情報を検索
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <StockSearch 
          onSearch={handleSearch} 
          loading={searchLoading}
          placeholder="銘柄コードを入力 (例: 7203)"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">人気銘柄</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {popularStocks.map((stock) => (
            <button
              key={stock.code}
              onClick={() => handleSearch(stock.code, false)}
              className={`p-4 rounded-lg border transition-colors text-left ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold">{stock.code}</div>
              <div className="text-sm text-gray-500">{stock.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SearchPage