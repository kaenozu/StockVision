import { Link } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { usePersistentViewHistory } from '../../hooks/usePersistentState'

export function RecentlyViewed() {
  const { theme } = useTheme()
  const { getRecentlyViewed, clearHistory } = usePersistentViewHistory()

  const recentStocks = getRecentlyViewed(5)

  if (recentStocks.length === 0) {
    return null
  }

  const handleClearHistory = () => {
    clearHistory()
  }

  return (
    <div className={`rounded-lg ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    } shadow-sm border ${
      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
    } p-4`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span role="img" aria-label="履歴">📊</span>
          最近見た銘柄
        </h3>
        <button
          onClick={handleClearHistory}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label="履歴をクリア"
        >
          クリア
        </button>
      </div>

      <div className="space-y-2">
        {recentStocks.map((stock) => (
          <Link
            key={stock.stock_code}
            to={`/stock/${stock.stock_code}`}
            className={`w-full p-3 rounded-md cursor-pointer transition-colors text-left block ${
              theme === 'dark' 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-50'
            }`}
            aria-label={`${stock.stock_code}の詳細を表示`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium">{stock.stock_code}</span>
                {stock.company_name && (
                  <span className="text-sm text-gray-500 truncate">
                    {stock.company_name}
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">
                  {stock.view_count}回表示
                </div>
                <div className="text-xs text-gray-400">
                  {formatTimeAgo(stock.last_viewed)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) {
    return `${minutes}分前`
  } else if (hours < 24) {
    return `${hours}時間前`
  } else {
    return `${days}日前`
  }
}