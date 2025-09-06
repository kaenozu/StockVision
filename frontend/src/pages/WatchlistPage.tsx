/**
 * Watchlist Page Component
 * 
 * Displays user's watchlist with stock information, price updates,
 * and management capabilities.
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWatchlist } from '../hooks/useWatchlist'
import { useCurrentPrice } from '../hooks/useStock'
import { WatchlistItem } from '../types/stock'
import { formatPrice, formatPriceChange, formatPercentageChange, formatTimestamp } from '../utils/formatters'
import Button, { IconButton } from '../components/ui/Button'
import LoadingSpinner, { LoadingSkeleton } from '../components/ui/LoadingSpinner'
import { EmptyStateMessage, InlineErrorMessage } from '../components/ui/ErrorMessage'
import StockSearch from '../components/stock/StockSearch'
import { EditWatchlistItemModal } from '../components/watchlist/EditWatchlistItemModal'

export function WatchlistPage() {
  const navigate = useNavigate()
  const watchlist = useWatchlist()
  const [showAddForm, setShowAddForm] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  
  // Edit modal state
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleAddToWatchlist = async (stockCode: string) => {
    setAddLoading(true)
    try {
      await watchlist.addToWatchlist({ stock_code: stockCode })
      setShowAddForm(false)
    } catch (error) {
      console.error('Failed to add to watchlist:', error)
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemoveFromWatchlist = async (stockCode: string) => {
    try {
      await watchlist.removeFromWatchlist(stockCode)
    } catch (error) {
      console.error('Failed to remove from watchlist:', error)
    }
  }

  const handleStockClick = (stockCode: string) => {
    navigate(`/stock/${stockCode}`)
  }
  
  const handleEditItemClick = (item: WatchlistItem) => {
    setEditingItem(item)
  }
  
  const handleCloseEditModal = () => {
    setEditingItem(null)
  }
  
  const handleSaveEditItem = async (
    stockCode: string, 
    alertPriceHigh: number | null, 
    alertPriceLow: number | null,
    notes: string | null
  ) => {
    setIsSaving(true)
    try {
      // Update the item in the watchlist
      // Since there's no direct update API, we'll remove and re-add
      await watchlist.removeFromWatchlist(stockCode)
      await watchlist.addToWatchlist({ 
        stock_code: stockCode, 
        alert_price_high: alertPriceHigh,
        alert_price_low: alertPriceLow,
        notes 
      })
    } catch (error) {
      console.error('Failed to update watchlist item:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  if (watchlist.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">ウォッチリスト</h1>
          <LoadingSpinner size="lg" showMessage message="ウォッチリストを取得中..." />
        </div>
      </div>
    )
  }

  if (watchlist.isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">ウォッチリスト</h1>
        </div>
        
        <InlineErrorMessage 
          error={watchlist.error}
        />
        
        <div className="text-center">
          <Button
            variant="primary"
            onClick={watchlist.refresh}
          >
            再読み込み
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ウォッチリスト</h1>
          <p className="text-gray-600 mt-1">
            登録した銘柄の価格変動を追跡できます
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={watchlist.refresh}
            icon="🔄"
            disabled={watchlist.isLoading}
          >
            更新
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowAddForm(!showAddForm)}
            icon="+"
          >
            銘柄を追加
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {watchlist.items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📊</div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {watchlist.items.length}
                </div>
                <div className="text-sm text-gray-600">登録銘柄数</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🚨</div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {watchlist.getWatchlistStats().itemsWithAlerts}
                </div>
                <div className="text-sm text-gray-600">アラート設定数</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📝</div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {watchlist.getWatchlistStats().itemsWithNotes}
                </div>
                <div className="text-sm text-gray-600">メモ付き銘柄数</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Form */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              銘柄をウォッチリストに追加
            </h3>
            <IconButton
              variant="ghost"
              onClick={() => setShowAddForm(false)}
              size="sm"
            >
              ✕
            </IconButton>
          </div>
          
          <StockSearch
            onSearch={handleAddToWatchlist}
            loading={addLoading}
            placeholder="追加する銘柄コードを入力"
            showRealDataOption={false}
          />
        </div>
      )}

      {/* Watchlist Items */}
      {watchlist.isEmpty ? (
        <EmptyStateMessage
          title="ウォッチリストが空です"
          description="気になる銘柄を追加して価格変動を追跡しましょう"
          icon="⭐"
          action={() => setShowAddForm(true)}
          actionText="銘柄を追加"
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      銘柄
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      現在価格
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      変動
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アラート
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      追加日
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {watchlist.items.map((item) => (
                    <WatchlistTableRow
                      key={item.stock_code}
                      item={item}
                      onStockClick={handleStockClick}
                      onRemove={handleRemoveFromWatchlist}
                      onEdit={handleEditItemClick}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {watchlist.items.map((item) => (
              <WatchlistCard
                key={item.stock_code}
                item={item}
                onStockClick={handleStockClick}
                onRemove={handleRemoveFromWatchlist}
                onEdit={handleEditItemClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit Watchlist Item Modal */}
      {editingItem && (
        <EditWatchlistItemModal
          item={editingItem}
          isOpen={!!editingItem}
          onClose={handleCloseEditModal}
          onSave={handleSaveEditItem}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}

/**
 * Watchlist Table Row Component
 */
function WatchlistTableRow({
  item,
  onStockClick,
  onRemove,
  onEdit
}: {
  item: WatchlistItem
  onStockClick: (stockCode: string) => void
  onRemove: (stockCode: string) => void
  onEdit: (item: WatchlistItem) => void
}) {
  const currentPrice = useCurrentPrice(item.stock_code, false)

  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => onStockClick(item.stock_code)}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {item.stock_code}
          </div>
          <div className="text-sm text-gray-500 truncate max-w-32">
            {item.company_name}
          </div>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        {currentPrice.isLoading ? (
          <LoadingSkeleton lines={1} />
        ) : currentPrice.data ? (
          <div className="text-sm font-medium text-gray-900">
            {formatPrice(currentPrice.data.current_price)}
          </div>
        ) : (
          <div className="text-sm text-gray-400">—</div>
        )}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        {currentPrice.data && (
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${
              currentPrice.data.price_change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPriceChange(currentPrice.data.price_change).formatted}
            </span>
            <span className={`text-xs ${
              currentPrice.data.price_change_pct >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentageChange(currentPrice.data.price_change_pct).formatted}
            </span>
          </div>
        )}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex flex-col">
          {item.alert_price_high !== null && (
            <div className="flex items-center text-green-600">
              <span className="mr-1">⬆️</span>
              {formatPrice(item.alert_price_high)}
            </div>
          )}
          {item.alert_price_low !== null && (
            <div className="flex items-center text-red-600">
              <span className="mr-1">⬇️</span>
              {formatPrice(item.alert_price_low)}
            </div>
          )}
          {item.alert_price_high === null && item.alert_price_low === null && (
            <span className="text-gray-400">—</span>
          )}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatTimestamp(item.added_date).split(' ')[0]}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            tooltip="編集"
          >
            ✏️
          </IconButton>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(item.stock_code)
            }}
            tooltip="削除"
          >
            🗑️
          </IconButton>
        </div>
      </td>
    </tr>
  )
}

/**
 * Watchlist Card Component (Mobile)
 */
function WatchlistCard({
  item,
  onStockClick,
  onRemove,
  onEdit
}: {
  item: WatchlistItem
  onStockClick: (stockCode: string) => void
  onRemove: (stockCode: string) => void
  onEdit: (item: WatchlistItem) => void
}) {
  const currentPrice = useCurrentPrice(item.stock_code, false)

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onStockClick(item.stock_code)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900">{item.stock_code}</h3>
            {(item.alert_price_high !== null || item.alert_price_low !== null) && (
              <span className="text-yellow-600 text-sm">🚨</span>
            )}
          </div>
          <p className="text-sm text-gray-600 truncate mb-3">
            {item.company_name}
          </p>
          
          {currentPrice.isLoading ? (
            <LoadingSkeleton lines={1} />
          ) : currentPrice.data ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(currentPrice.data.current_price)}
              </span>
              <span className={`text-sm font-medium ${
                currentPrice.data.price_change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPriceChange(currentPrice.data.price_change).formatted}
                ({formatPercentageChange(currentPrice.data.price_change_pct).formatted})
              </span>
            </div>
          ) : (
            <div className="text-gray-400">価格データなし</div>
          )}

          {/* Alert Prices */}
          <div className="flex flex-wrap gap-2 mt-2">
            {item.alert_price_high !== null && (
              <div className="flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                <span className="mr-1">⬆️</span>
                {formatPrice(item.alert_price_high)}
              </div>
            )}
            {item.alert_price_low !== null && (
              <div className="flex items-center text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                <span className="mr-1">⬇️</span>
                {formatPrice(item.alert_price_low)}
              </div>
            )}
          </div>

          {item.notes && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
              📝 {item.notes}
            </p>
          )}
        </div>
        
        <div className="flex flex-col space-y-1">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            tooltip="編集"
          >
            ✏️
          </IconButton>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(item.stock_code)
            }}
            tooltip="削除"
          >
            🗑️
          </IconButton>
        </div>
      </div>
    </div>
  )
}

export default WatchlistPage