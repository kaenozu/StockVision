import { useState, useEffect, useMemo } from 'react'
import { stockApi } from '../../services/stockApi'
import { useTheme } from '../../contexts/ThemeContext'
import { WatchListControls, FilterOption } from './WatchListControls'
import { WatchlistItemAPI } from '../../types/stock'

interface WatchListItem extends WatchlistItemAPI {
  current_price?: number
  change_percent?: number
}

export function WatchList() {
  const [watchList, setWatchList] = useState<WatchListItem[]>([])
  const [newStockCode, setNewStockCode] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // ソート・フィルタリング・検索の状態
  const [sortBy, setSortBy] = useState('stock_code')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<FilterOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  const { theme } = useTheme()

  useEffect(() => {
    fetchWatchList()
  }, [])

  // フィルタリング、ソート、検索を適用した表示用データ
  const filteredAndSortedWatchList = useMemo(() => {
    let filtered = [...watchList]

    // 検索フィルター
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.stock_code.toLowerCase().includes(term) ||
        (item.company_name && item.company_name.toLowerCase().includes(term)) ||
(item.notes && item.notes.toLowerCase().includes(term))
      )
    }

    // カテゴリフィルター
    const activeFilters = filters.filter(f => f.checked)
    for (const filter of activeFilters) {
      switch (filter.key) {
        case 'has_notes':
          filtered = filtered.filter(item => item.notes && item.notes.trim() !== '')
          break
        case 'has_alert':
          filtered = filtered.filter(item => 
            (item.alert_price_high !== null && item.alert_price_high !== undefined) ||
            (item.alert_price_low !== null && item.alert_price_low !== undefined)
          )
          break
        case 'price_increase':
          filtered = filtered.filter(item => item.change_percent && item.change_percent > 0)
          break
        case 'price_decrease':
          filtered = filtered.filter(item => item.change_percent && item.change_percent < 0)
          break
      }
    }

    // ソート
    filtered.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortBy) {
        case 'stock_code':
          aVal = a.stock_code
          bVal = b.stock_code
          break
        case 'company_name':
          aVal = a.company_name || a.stock_code
          bVal = b.company_name || b.stock_code
          break
        case 'current_price':
          aVal = a.current_price || 0
          bVal = b.current_price || 0
          break
        case 'change_percent':
          aVal = a.change_percent || 0
          bVal = b.change_percent || 0
          break
        case 'created_at':
          aVal = new Date(a.added_date).getTime()
          bVal = new Date(b.added_date).getTime()
          break
        default:
          aVal = a.stock_code
          bVal = b.stock_code
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal)
        return sortOrder === 'asc' ? comparison : -comparison
      } else {
        const comparison = (aVal || 0) - (bVal || 0)
        return sortOrder === 'asc' ? comparison : -comparison
      }
    })

    return filtered
  }, [watchList, searchTerm, filters, sortBy, sortOrder])

  // コントロールハンドラー
  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
  }

  const handleFilterChange = (newFilters: FilterOption[]) => {
    setFilters(newFilters)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  const fetchWatchList = async () => {
    setLoading(true)
    setError(null)
    try {
      const watchlist = await stockApi.getWatchlist()
      setWatchList(watchlist)
    } catch (err) {
      setError('ウォッチリストの取得に失敗しました')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addToWatchList = async () => {
    if (!newStockCode.trim()) return

    setLoading(true)
    setError(null)
    try {
      await stockApi.addToWatchlist({
        stock_code: newStockCode.trim(),
        notes: newNotes.trim()
      })
      setNewStockCode('')
      setNewNotes('')
      await fetchWatchList()
    } catch (err) {
      setError('銘柄の追加に失敗しました')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const removeFromWatchList = async (stockCode: string) => {
    setLoading(true)
    setError(null)
    try {
      await stockApi.removeFromWatchlist(stockCode)
      await fetchWatchList()
    } catch (err) {
      setError('銘柄の削除に失敗しました')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getPriceColor = (changePercent?: number) => {
    if (!changePercent) return ''
    return changePercent > 0 ? 'text-green-600' : changePercent < 0 ? 'text-red-600' : ''
  }

  return (
    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">ウォッチリスト</h2>
        <div className="text-sm text-gray-500">
          {filteredAndSortedWatchList.length} / {watchList.length} 件表示
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* ソート・フィルタリング・検索コントロール */}
      <WatchListControls
        onSortChange={handleSortChange}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
      />

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newStockCode}
          onChange={(e) => setNewStockCode(e.target.value)}
          placeholder="銘柄コード (例: 7203)"
          className={`flex-1 px-3 py-2 border rounded-md ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300'
          }`}
        />
        <input
          type="text"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          placeholder="メモ (任意)"
          className={`flex-1 px-3 py-2 border rounded-md ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300'
          }`}
        />
        <button
          onClick={addToWatchList}
          disabled={loading || !newStockCode.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          追加
        </button>
      </div>

      {loading && <div className="text-center py-4">読み込み中...</div>}

      <div className="space-y-2">
        {filteredAndSortedWatchList.map((item) => (
          <div
            key={item.stock_code}
            className={`p-4 rounded-md border ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold">{item.stock_code}</span>
                  {item.company_name && (
                    <span className="text-sm">{item.company_name}</span>
                  )}
                  {item.current_price && (
                    <span className="font-mono">¥{item.current_price.toLocaleString()}</span>
                  )}
                  {item.change_percent !== undefined && (
                    <span className={`font-mono ${getPriceColor(item.change_percent)}`}>
                      {item.change_percent > 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
                    </span>
                  )}
                </div>
                {item.notes && (
                  <div className="text-sm text-gray-500 mt-1">{item.notes}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  追加日: {new Date(item.added_date).toLocaleString('ja-JP')}
                </div>
              </div>
              <button
                onClick={() => removeFromWatchList(item.stock_code)}
                className="ml-4 px-3 py-1 text-red-600 hover:bg-red-50 rounded-md"
              >
                削除
              </button>
            </div>
          </div>
        ))}
        {watchList.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            ウォッチリストに銘柄がありません
          </div>
        )}
        {watchList.length > 0 && filteredAndSortedWatchList.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            フィルター条件に一致する銘柄がありません
            <div className="text-sm mt-2">検索条件やフィルターを変更してください</div>
          </div>
        )}
      </div>
    </div>
  )
}