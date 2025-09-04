import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { useTheme } from '../../contexts/ThemeContext'

interface WatchListItem {
  id: number
  stock_code: string
  notes: string
  created_at: string
  company_name?: string
  current_price?: number
  change_percent?: number
}

export function WatchList() {
  const [watchList, setWatchList] = useState<WatchListItem[]>([])
  const [newStockCode, setNewStockCode] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    fetchWatchList()
  }, [])

  const fetchWatchList = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/watchlist')
      setWatchList(response.data)
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
      await api.post('/watchlist', {
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

  const removeFromWatchList = async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      await api.delete(`/watchlist/${id}`)
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
      <h2 className="text-2xl font-bold mb-4">ウォッチリスト</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

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
        {watchList.map((item) => (
          <div
            key={item.id}
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
                  追加日: {new Date(item.created_at).toLocaleString('ja-JP')}
                </div>
              </div>
              <button
                onClick={() => removeFromWatchList(item.id)}
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
      </div>
    </div>
  )
}