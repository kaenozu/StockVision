/**
 * Watchlist Data Hook
 * 
 * Core hook for watchlist data retrieval and state management.
 * Single responsibility: fetching and caching watchlist data.
 */

import { useState, useCallback } from 'react'
import { WatchlistItem, AsyncState } from '../../types/stock'
import { stockApi } from '../../services/stockApi'

interface UseWatchlistDataOptions {
  enableCaching?: boolean
  cacheTimeout?: number
  autoEnrichData?: boolean
}

export function useWatchlistData(options: UseWatchlistDataOptions = {}) {
  const { 
    enableCaching = true, 
    cacheTimeout = 60000, // 1 minute
    autoEnrichData = true 
  } = options

  const [state, setState] = useState<AsyncState<WatchlistItem[]>>({
    data: null,
    status: 'idle',
    error: null
  })

  const [lastFetch, setLastFetch] = useState<number>(0)

  const fetchWatchlist = useCallback(async (forceRefresh: boolean = false): Promise<WatchlistItem[] | null> => {
    // Check cache timeout
    const now = Date.now()
    if (!forceRefresh && enableCaching && lastFetch && (now - lastFetch < cacheTimeout)) {
      // Return cached data if available
      if (state.data) {
        return state.data
      }
    }

    setState(prev => ({ ...prev, status: 'loading', error: null }))

    try {
      const watchlistData = await stockApi.getWatchlist()
      
      // Convert API items to client items with UI state
      const watchlistItems: WatchlistItem[] = watchlistData.map(item => ({
        ...item,
        id: `watchlist-${item.stock_code}`,
        isLoading: false,
        hasError: false
      }))

      // Enrich with current price data if enabled
      let enrichedItems = watchlistItems
      if (autoEnrichData && watchlistItems.length > 0) {
        try {
          // Fetch current prices for all items in parallel
          const pricePromises = watchlistItems.map(async (item) => {
            try {
              const currentPrice = await stockApi.getCurrentPrice(item.stock_code)
              return {
                ...item,
                current_price: currentPrice.current_price,
                price_change: currentPrice.price_change,
                price_change_pct: currentPrice.price_change_pct
              }
            } catch (error) {
              // If price fetch fails, return item as-is
              return item
            }
          })

          enrichedItems = await Promise.all(pricePromises)
        } catch (error) {
          // If enrichment fails, continue with basic data
          console.warn('Failed to enrich watchlist data with prices:', error)
        }
      }

      setState({
        data: enrichedItems,
        status: 'success',
        error: null
      })

      setLastFetch(now)
      return enrichedItems

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch watchlist'
      
      setState({
        data: null,
        status: 'error',
        error: errorMessage
      })

      return null
    }
  }, [enableCaching, cacheTimeout, autoEnrichData, lastFetch, state.data])

  const refreshWatchlist = useCallback(async () => {
    return await fetchWatchlist(true)
  }, [fetchWatchlist])

  const getItemByStockCode = useCallback((stockCode: string): WatchlistItem | undefined => {
    return state.data?.find(item => item.stock_code === stockCode)
  }, [state.data])

  const isInWatchlist = useCallback((stockCode: string): boolean => {
    return state.data?.some(item => item.stock_code === stockCode) || false
  }, [state.data])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const reset = useCallback(() => {
    setState({
      data: null,
      status: 'idle',
      error: null
    })
    setLastFetch(0)
  }, [])

  return {
    ...state,
    fetchWatchlist,
    refreshWatchlist,
    getItemByStockCode,
    isInWatchlist,
    clearError,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    isIdle: state.status === 'idle',
    isEmpty: state.data?.length === 0,
    count: state.data?.length || 0
  }
}