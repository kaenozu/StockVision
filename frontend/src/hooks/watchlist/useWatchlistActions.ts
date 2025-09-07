/**
 * Watchlist Actions Hook
 * 
 * Hook for watchlist CRUD operations with optimistic updates.
 * Single responsibility: add/remove operations and state mutations.
 */

import { useState, useCallback } from 'react'
import { WatchlistItem, AddWatchlistRequest, AsyncState } from '../../types/stock'
import { stockApi } from '../../services/stockApi'
import { validateAddWatchlistRequest } from '../../utils/validation'

interface UseWatchlistActionsOptions {
  enableOptimisticUpdates?: boolean
  onSuccess?: (action: 'add' | 'remove', item: WatchlistItem | string) => void
  onError?: (action: 'add' | 'remove', error: string) => void
}

interface ItemState {
  isAdding: boolean
  isRemoving: boolean
  hasError: boolean
  errorMessage?: string
}

export function useWatchlistActions(options: UseWatchlistActionsOptions = {}) {
  const { 
    enableOptimisticUpdates = true,
    onSuccess,
    onError
  } = options

  const [globalState, setGlobalState] = useState<AsyncState<null>>({
    data: null,
    status: 'idle',
    error: null
  })

  // Track individual item states for granular loading indicators
  const [itemStates, setItemStates] = useState<Map<string, ItemState>>(new Map())

  const updateItemState = useCallback((stockCode: string, updates: Partial<ItemState>) => {
    setItemStates(prev => {
      const newStates = new Map(prev)
      const current = newStates.get(stockCode) || {
        isAdding: false,
        isRemoving: false,
        hasError: false
      }
      newStates.set(stockCode, { ...current, ...updates })
      return newStates
    })
  }, [])

  const clearItemState = useCallback((stockCode: string) => {
    setItemStates(prev => {
      const newStates = new Map(prev)
      newStates.delete(stockCode)
      return newStates
    })
  }, [])

  const addToWatchlist = useCallback(async (
    request: AddWatchlistRequest,
    optimisticItem?: Partial<WatchlistItem>
  ): Promise<WatchlistItem | null> => {
    const stockCode = request.stock_code

    // Validate request
    const validation = validateAddWatchlistRequest(request)
    if (!validation.is_valid) {
      const errorMessage = `Validation failed: ${validation.errors.join(', ')}`
      updateItemState(stockCode, { hasError: true, errorMessage })
      onError?.('add', errorMessage)
      return null
    }

    // Update item state to show loading
    updateItemState(stockCode, { 
      isAdding: true, 
      hasError: false, 
      errorMessage: undefined 
    })

    setGlobalState(prev => ({ ...prev, status: 'loading', error: null }))

    try {
      const newItem = await stockApi.addToWatchlist(request)
      
      // Success - clear loading state
      clearItemState(stockCode)
      setGlobalState({
        data: null,
        status: 'success',
        error: null
      })

      onSuccess?.('add', newItem)
      return newItem

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add to watchlist'
      
      // Update item state with error
      updateItemState(stockCode, { 
        isAdding: false, 
        hasError: true, 
        errorMessage 
      })

      setGlobalState({
        data: null,
        status: 'error',
        error: errorMessage
      })

      onError?.('add', errorMessage)
      return null
    }
  }, [updateItemState, clearItemState, onSuccess, onError])

  const removeFromWatchlist = useCallback(async (
    stockCode: string
  ): Promise<boolean> => {
    if (!stockCode?.trim()) {
      const errorMessage = 'Stock code is required'
      updateItemState(stockCode, { hasError: true, errorMessage })
      onError?.('remove', errorMessage)
      return false
    }

    // Update item state to show loading
    updateItemState(stockCode, { 
      isRemoving: true, 
      hasError: false, 
      errorMessage: undefined 
    })

    setGlobalState(prev => ({ ...prev, status: 'loading', error: null }))

    try {
      await stockApi.removeFromWatchlist(stockCode)
      
      // Success - clear loading state
      clearItemState(stockCode)
      setGlobalState({
        data: null,
        status: 'success',
        error: null
      })

      onSuccess?.('remove', stockCode)
      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove from watchlist'
      
      // Update item state with error
      updateItemState(stockCode, { 
        isRemoving: false, 
        hasError: true, 
        errorMessage 
      })

      setGlobalState({
        data: null,
        status: 'error',
        error: errorMessage
      })

      onError?.('remove', errorMessage)
      return false
    }
  }, [updateItemState, clearItemState, onSuccess, onError])

  const getItemState = useCallback((stockCode: string): ItemState => {
    return itemStates.get(stockCode) || {
      isAdding: false,
      isRemoving: false,
      hasError: false
    }
  }, [itemStates])

  const clearItemError = useCallback((stockCode: string) => {
    updateItemState(stockCode, { hasError: false, errorMessage: undefined })
  }, [updateItemState])

  const clearAllErrors = useCallback(() => {
    setItemStates(new Map())
    setGlobalState(prev => ({ ...prev, error: null }))
  }, [])

  const reset = useCallback(() => {
    setItemStates(new Map())
    setGlobalState({
      data: null,
      status: 'idle',
      error: null
    })
  }, [])

  return {
    // Global state
    globalError: globalState.error,
    isGlobalLoading: globalState.status === 'loading',
    
    // Actions
    addToWatchlist,
    removeFromWatchlist,
    
    // Item state management
    getItemState,
    clearItemError,
    clearAllErrors,
    reset,
    
    // Computed states
    hasAnyErrors: globalState.error !== null || Array.from(itemStates.values()).some(state => state.hasError),
    hasAnyLoading: globalState.status === 'loading' || Array.from(itemStates.values()).some(state => state.isAdding || state.isRemoving),
    
    // Helper functions
    isItemAdding: (stockCode: string) => getItemState(stockCode).isAdding,
    isItemRemoving: (stockCode: string) => getItemState(stockCode).isRemoving,
    hasItemError: (stockCode: string) => getItemState(stockCode).hasError,
    getItemError: (stockCode: string) => getItemState(stockCode).errorMessage
  }
}