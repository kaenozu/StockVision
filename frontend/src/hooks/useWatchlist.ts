/**
 * Watchlist Hook
 * 
 * Custom React hook for managing watchlist state and operations.
 * Provides CRUD operations, loading states, and optimistic updates.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  WatchlistItemAPI,
  WatchlistItem,
  AddWatchlistRequest,
  AsyncState,
  LoadingState
} from '../types/stock'
import { stockApi, StockApiError, ValidationError } from '../services/stockApi'
import { validateAddWatchlistRequest } from '../utils/validation'
import { formatErrorMessage } from '../utils/formatters'

/**
 * Watchlist state management hook
 */
export function useWatchlist(autoFetch: boolean = true) {
  const [state, setState] = useState<AsyncState<WatchlistItem[]>>({
    data: null,
    status: 'idle',
    error: null
  })

  // Track individual item loading states for optimistic updates
  const [itemStates, setItemStates] = useState<Map<string, {
    isAdding: boolean
    isRemoving: boolean
    hasError: boolean
  }>>(new Map())

  const fetchWatchlist = useCallback(async () => {
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

      setState({
        data: watchlistItems,
        status: 'success',
        error: null
      })
    } catch (error) {
      console.error('Failed to fetch watchlist:', error)
      setState({
        data: null,
        status: 'error',
        error: formatErrorMessage(error)
      })
    }
  }, [])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchWatchlist()
    }
  }, [autoFetch, fetchWatchlist])

  // Add stock to watchlist
  const addToWatchlist = useCallback(async (request: AddWatchlistRequest): Promise<boolean> => {
    // Validate request
    const validation = validateAddWatchlistRequest(request)
    if (!validation.is_valid) {
      throw new ValidationError(`Invalid watchlist request: ${validation.errors.join(', ')}`)
    }

    const stockCode = request.stock_code

    // Set loading state for this item
    setItemStates(prev => new Map(prev).set(stockCode, {
      isAdding: true,
      isRemoving: false,
      hasError: false
    }))

    try {
      const newItem = await stockApi.addToWatchlist(request)
      
      // Convert to client item
      const clientItem: WatchlistItem = {
        ...newItem,
        id: `watchlist-${newItem.stock_code}`,
        isLoading: false,
        hasError: false
      }

      // Optimistically add to current state
      setState(prev => {
        const currentItems = prev.data || []
        const existingIndex = currentItems.findIndex(item => item.stock_code === stockCode)
        
        if (existingIndex >= 0) {
          // Update existing item
          const updatedItems = [...currentItems]
          updatedItems[existingIndex] = clientItem
          return { ...prev, data: updatedItems }
        } else {
          // Add new item
          return { ...prev, data: [...currentItems, clientItem] }
        }
      })

      // Clear loading state
      setItemStates(prev => {
        const newStates = new Map(prev)
        newStates.delete(stockCode)
        return newStates
      })

      return true
    } catch (error) {
      console.error('Failed to add to watchlist:', error)

      // Set error state
      setItemStates(prev => new Map(prev).set(stockCode, {
        isAdding: false,
        isRemoving: false,
        hasError: true
      }))

      throw error
    }
  }, [])

  // Remove stock from watchlist
  const removeFromWatchlist = useCallback(async (stockCode: string): Promise<boolean> => {
    if (!stockCode) {
      throw new ValidationError('Stock code is required for removal')
    }

    // Set loading state for this item
    setItemStates(prev => new Map(prev).set(stockCode, {
      isAdding: false,
      isRemoving: true,
      hasError: false
    }))

    try {
      await stockApi.removeFromWatchlist(stockCode)

      // Optimistically remove from current state
      setState(prev => {
        const currentItems = prev.data || []
        const filteredItems = currentItems.filter(item => item.stock_code !== stockCode)
        return { ...prev, data: filteredItems }
      })

      // Clear loading state
      setItemStates(prev => {
        const newStates = new Map(prev)
        newStates.delete(stockCode)
        return newStates
      })

      return true
    } catch (error) {
      console.error('Failed to remove from watchlist:', error)

      // Set error state
      setItemStates(prev => new Map(prev).set(stockCode, {
        isAdding: false,
        isRemoving: false,
        hasError: true
      }))

      throw error
    }
  }, [])

  // Check if stock is in watchlist
  const isInWatchlist = useCallback((stockCode: string): boolean => {
    if (!state.data) return false
    return state.data.some(item => item.stock_code === stockCode)
  }, [state.data])

  // Get watchlist item by stock code
  const getWatchlistItem = useCallback((stockCode: string): WatchlistItem | null => {
    if (!state.data) return null
    return state.data.find(item => item.stock_code === stockCode) || null
  }, [state.data])

  // Get item loading/error states
  const getItemState = useCallback((stockCode: string) => {
    return itemStates.get(stockCode) || {
      isAdding: false,
      isRemoving: false,
      hasError: false
    }
  }, [itemStates])

  // Clear error state for specific item
  const clearItemError = useCallback((stockCode: string) => {
    setItemStates(prev => {
      const newStates = new Map(prev)
      const current = newStates.get(stockCode)
      if (current) {
        newStates.set(stockCode, { ...current, hasError: false })
      }
      return newStates
    })
  }, [])

  // Get statistics
  const getWatchlistStats = useCallback(() => {
    const items = state.data || []
    const totalItems = items.length
    const itemsWithAlerts = items.filter(item => item.alert_price !== null).length
    const itemsWithNotes = items.filter(item => item.notes && item.notes.trim().length > 0).length

    return {
      totalItems,
      itemsWithAlerts,
      itemsWithNotes
    }
  }, [state.data])

  const refresh = useCallback(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  return {
    ...state,
    items: state.data || [],
    fetch: fetchWatchlist,
    refresh,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    getWatchlistItem,
    getItemState,
    clearItemError,
    getWatchlistStats,
    isLoading: state.status === 'loading',
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
    isEmpty: state.data?.length === 0
  }
}

/**
 * Hook for managing watchlist operations on a specific stock
 */
export function useWatchlistItem(stockCode: string) {
  const watchlist = useWatchlist()
  const item = watchlist.getWatchlistItem(stockCode)
  const itemState = watchlist.getItemState(stockCode)
  const isInWatchlist = watchlist.isInWatchlist(stockCode)

  const addToWatchlist = useCallback(async (
    alertPrice?: number | null,
    notes?: string | null
  ): Promise<boolean> => {
    const request: AddWatchlistRequest = {
      stock_code: stockCode,
      alert_price: alertPrice || null,
      notes: notes || null
    }

    return watchlist.addToWatchlist(request)
  }, [stockCode, watchlist])

  const removeFromWatchlist = useCallback(async (): Promise<boolean> => {
    return watchlist.removeFromWatchlist(stockCode)
  }, [stockCode, watchlist])

  const toggleWatchlist = useCallback(async (
    alertPrice?: number | null,
    notes?: string | null
  ): Promise<boolean> => {
    if (isInWatchlist) {
      return removeFromWatchlist()
    } else {
      return addToWatchlist(alertPrice, notes)
    }
  }, [isInWatchlist, addToWatchlist, removeFromWatchlist])

  return {
    item,
    isInWatchlist,
    isAdding: itemState.isAdding,
    isRemoving: itemState.isRemoving,
    hasError: itemState.hasError,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    clearError: () => watchlist.clearItemError(stockCode)
  }
}

/**
 * Hook for watchlist bulk operations
 */
export function useWatchlistBulk() {
  const watchlist = useWatchlist()
  const [bulkState, setBulkState] = useState<{
    isProcessing: boolean
    processed: number
    total: number
    errors: string[]
  }>({
    isProcessing: false,
    processed: 0,
    total: 0,
    errors: []
  })

  const addMultiple = useCallback(async (requests: AddWatchlistRequest[]): Promise<{
    successful: number
    failed: number
    errors: string[]
  }> => {
    setBulkState({
      isProcessing: true,
      processed: 0,
      total: requests.length,
      errors: []
    })

    const results = { successful: 0, failed: 0, errors: [] as string[] }

    for (let i = 0; i < requests.length; i++) {
      try {
        await watchlist.addToWatchlist(requests[i])
        results.successful++
      } catch (error) {
        results.failed++
        results.errors.push(`${requests[i].stock_code}: ${formatErrorMessage(error)}`)
      }

      setBulkState(prev => ({ ...prev, processed: i + 1 }))
    }

    setBulkState(prev => ({ ...prev, isProcessing: false, errors: results.errors }))
    
    // Refresh watchlist after bulk operation
    watchlist.refresh()

    return results
  }, [watchlist])

  const removeMultiple = useCallback(async (stockCodes: string[]): Promise<{
    successful: number
    failed: number
    errors: string[]
  }> => {
    setBulkState({
      isProcessing: true,
      processed: 0,
      total: stockCodes.length,
      errors: []
    })

    const results = { successful: 0, failed: 0, errors: [] as string[] }

    for (let i = 0; i < stockCodes.length; i++) {
      try {
        await watchlist.removeFromWatchlist(stockCodes[i])
        results.successful++
      } catch (error) {
        results.failed++
        results.errors.push(`${stockCodes[i]}: ${formatErrorMessage(error)}`)
      }

      setBulkState(prev => ({ ...prev, processed: i + 1 }))
    }

    setBulkState(prev => ({ ...prev, isProcessing: false, errors: results.errors }))
    
    // Refresh watchlist after bulk operation
    watchlist.refresh()

    return results
  }, [watchlist])

  return {
    ...bulkState,
    addMultiple,
    removeMultiple,
    progress: bulkState.total > 0 ? (bulkState.processed / bulkState.total) * 100 : 0
  }
}