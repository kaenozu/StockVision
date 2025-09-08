/**
 * Composite Watchlist Hook
 * 
 * Unified hook that combines watchlist data and actions for backward compatibility.
 * Uses the new separated hooks internally while maintaining the original API.
 */

import { useCallback } from 'react'
import { WatchlistItem, AddWatchlistRequest } from '../../types/stock'
import { useWatchlistData, UseWatchlistDataOptions } from './useWatchlistData'
import { useWatchlistActions, UseWatchlistActionsOptions } from './useWatchlistActions'

interface UseWatchlistOptions extends UseWatchlistDataOptions, UseWatchlistActionsOptions {
  // Combined options from both hooks
}

export function useWatchlist(options: UseWatchlistOptions = {}) {
  // Extract options for each hook
  const dataOptions: UseWatchlistDataOptions = {
    enableCaching: options.enableCaching,
    cacheTimeout: options.cacheTimeout,
    autoEnrichData: options.autoEnrichData
  }

  const actionsOptions: UseWatchlistActionsOptions = {
    enableOptimisticUpdates: options.enableOptimisticUpdates,
    onSuccess: options.onSuccess,
    onError: options.onError
  }

  // Use the separated hooks
  const {
    data: watchlist,
    status,
    error,
    fetchWatchlist,
    refreshWatchlist,
    getItemByStockCode,
    isInWatchlist,
    clearError: clearDataError,
    reset: resetData,
    isLoading: isDataLoading,
    isSuccess,
    isError,
    isIdle,
    isEmpty,
    count
  } = useWatchlistData(dataOptions)

  const {
    globalError: actionsError,
    isGlobalLoading: isActionsLoading,
    addToWatchlist,
    removeFromWatchlist,
    getItemState,
    clearItemError,
    clearAllErrors: clearActionsErrors,
    reset: resetActions,
    hasAnyErrors,
    hasAnyLoading,
    isItemAdding,
    isItemRemoving,
    hasItemError,
    getItemError
  } = useWatchlistActions(actionsOptions)

  // Combine loading states
  const isLoading = isDataLoading || isActionsLoading || hasAnyLoading

  // Combine errors
  const combinedError = error || actionsError

  // Enhanced add function that refreshes data after successful addition
  const addToWatchlistWithRefresh = useCallback(async (
    request: AddWatchlistRequest,
    optimisticItem?: Partial<WatchlistItem>
  ): Promise<WatchlistItem | null> => {
    const result = await addToWatchlist(request, optimisticItem)
    
    if (result) {
      // Refresh watchlist data to ensure consistency
      await refreshWatchlist()
    }
    
    return result
  }, [addToWatchlist, refreshWatchlist])

  // Enhanced remove function that refreshes data after successful removal
  const removeFromWatchlistWithRefresh = useCallback(async (
    stockCode: string
  ): Promise<boolean> => {
    const result = await removeFromWatchlist(stockCode)
    
    if (result) {
      // Refresh watchlist data to ensure consistency
      await refreshWatchlist()
    }
    
    return result
  }, [removeFromWatchlist, refreshWatchlist])

  // Combined clear error function
  const clearError = useCallback(() => {
    clearDataError()
    clearActionsErrors()
  }, [clearDataError, clearActionsErrors])

  // Combined reset function
  const reset = useCallback(() => {
    resetData()
    resetActions()
  }, [resetData, resetActions])

  return {
    // Data state (original API)
    watchlist,
    status,
    error: combinedError,
    isLoading,
    isSuccess,
    isError,
    isIdle,
    isEmpty,
    count,

    // Data actions (original API)
    fetchWatchlist,
    refreshWatchlist,
    getItemByStockCode,
    isInWatchlist,

    // Mutation actions (original API with enhanced functionality)
    addToWatchlist: addToWatchlistWithRefresh,
    removeFromWatchlist: removeFromWatchlistWithRefresh,

    // Item state management (new functionality exposed)
    getItemState,
    clearItemError,
    isItemAdding,
    isItemRemoving,
    hasItemError,
    getItemError,

    // Combined utility functions
    hasAnyErrors,
    clearError,
    reset,

    // Individual hook access (for advanced usage)
    data: {
      fetchWatchlist,
      refreshWatchlist,
      getItemByStockCode,
      isInWatchlist,
      clearError: clearDataError,
      reset: resetData
    },
    actions: {
      addToWatchlist,
      removeFromWatchlist,
      getItemState,
      clearItemError,
      clearAllErrors: clearActionsErrors,
      reset: resetActions,
      isItemAdding,
      isItemRemoving,
      hasItemError,
      getItemError
    }
  }
}