/**
 * Composite Stock Hook
 * 
 * Unified hook that combines stock data, price, and history for backward compatibility.
 * Uses the new separated hooks internally while maintaining the original API.
 */

import { useCallback } from 'react'
import { StockData, CurrentPriceResponse, PriceHistoryItem, ChartTimeframe } from '../../types/stock'
import { useStockData, UseStockDataOptions } from './useStockData'
import { useStockPrice, UseStockPriceOptions } from './useStockPrice'
import { useStockHistory, UseStockHistoryOptions } from './useStockHistory'

interface UseStockOptions extends UseStockDataOptions, UseStockPriceOptions, UseStockHistoryOptions {
  // Combined options from all hooks
}

export function useStock(options: UseStockOptions = {}) {
  // Extract options for each hook
  const dataOptions: UseStockDataOptions = {
    autoValidation: options.autoValidation,
    cacheTimeout: options.cacheTimeout
  }

  const priceOptions: UseStockPriceOptions = {
    autoRefresh: options.autoRefresh,
    refreshInterval: options.refreshInterval,
    enableWebSocket: options.enableWebSocket
  }

  const historyOptions: UseStockHistoryOptions = {
    defaultTimeframe: options.defaultTimeframe,
    enableCaching: options.enableCaching,
    maxCacheSize: options.maxCacheSize
  }

  // Use the separated hooks
  const {
    data: stockData,
    status: dataStatus,
    error: dataError,
    fetchStockData,
    clearError: clearDataError,
    reset: resetData,
    isLoading: isDataLoading,
    isSuccess: isDataSuccess,
    isError: isDataError,
    isIdle: isDataIdle
  } = useStockData(dataOptions)

  const {
    data: priceData,
    status: priceStatus,
    error: priceError,
    fetchPrice,
    startAutoRefresh,
    stopAutoRefresh,
    connectWebSocket,
    disconnectWebSocket,
    clearError: clearPriceError,
    reset: resetPrice,
    isLoading: isPriceLoading,
    isSuccess: isPriceSuccess,
    isError: isPriceError,
    isIdle: isPriceIdle,
    isAutoRefreshing,
    isWebSocketConnected
  } = useStockPrice(priceOptions)

  const {
    data: historyData,
    status: historyStatus,
    error: historyError,
    currentTimeframe,
    fetchHistory,
    changeTimeframe,
    clearCache,
    clearError: clearHistoryError,
    reset: resetHistory,
    isLoading: isHistoryLoading,
    isSuccess: isHistorySuccess,
    isError: isHistoryError,
    isIdle: isHistoryIdle,
    cacheSize
  } = useStockHistory(historyOptions)

  // Combine loading states
  const isLoading = isDataLoading || isPriceLoading || isHistoryLoading

  // Combine success states
  const isSuccess = isDataSuccess || isPriceSuccess || isHistorySuccess

  // Combine error states
  const isError = isDataError || isPriceError || isHistoryError

  // Combine idle states (all must be idle)
  const isIdle = isDataIdle && isPriceIdle && isHistoryIdle

  // Combine errors (prioritize data error, then price, then history)
  const combinedError = dataError || priceError || historyError

  // Combined status (prioritize loading, then error, then success, finally idle)
  const combinedStatus = isLoading ? 'loading' : 
                        combinedError ? 'error' : 
                        isSuccess ? 'success' : 'idle'

  // Enhanced fetch function that gets all stock data
  const fetchAllStockData = useCallback(async (
    stockCode: string,
    options?: {
      useRealData?: boolean
      forceRefresh?: boolean
      includePrice?: boolean
      includeHistory?: boolean
      timeframe?: ChartTimeframe
    }
  ) => {
    const {
      useRealData = false,
      forceRefresh = false,
      includePrice = true,
      includeHistory = true,
      timeframe
    } = options || {}

    const results = {
      stockData: null as StockData | null,
      priceData: null as CurrentPriceResponse | null,
      historyData: null as PriceHistoryItem[] | null
    }

    try {
      // Fetch basic stock data
      results.stockData = await fetchStockData(stockCode, useRealData, forceRefresh)

      // Fetch current price if requested
      if (includePrice) {
        results.priceData = await fetchPrice(stockCode)
      }

      // Fetch price history if requested
      if (includeHistory) {
        results.historyData = await fetchHistory(stockCode, timeframe, forceRefresh)
      }

      return results
    } catch (error) {
      console.error('Failed to fetch all stock data:', error)
      return results
    }
  }, [fetchStockData, fetchPrice, fetchHistory])

  // Combined clear error function
  const clearError = useCallback(() => {
    clearDataError()
    clearPriceError()
    clearHistoryError()
  }, [clearDataError, clearPriceError, clearHistoryError])

  // Combined reset function
  const reset = useCallback(() => {
    resetData()
    resetPrice()
    resetHistory()
  }, [resetData, resetPrice, resetHistory])

  return {
    // Combined state (original API)
    stockData,
    priceData,
    historyData,
    status: combinedStatus,
    error: combinedError,
    isLoading,
    isSuccess,
    isError,
    isIdle,

    // Data actions (original API)
    fetchStockData,
    fetchAllStockData,

    // Price actions (original API)
    fetchPrice,
    startAutoRefresh,
    stopAutoRefresh,
    connectWebSocket,
    disconnectWebSocket,
    isAutoRefreshing,
    isWebSocketConnected,

    // History actions (original API)
    fetchHistory,
    changeTimeframe,
    currentTimeframe,
    clearCache,
    cacheSize,

    // Combined utility functions
    clearError,
    reset,

    // Individual hook access (for advanced usage)
    data: {
      stockData,
      status: dataStatus,
      error: dataError,
      fetchStockData,
      clearError: clearDataError,
      reset: resetData,
      isLoading: isDataLoading,
      isSuccess: isDataSuccess,
      isError: isDataError,
      isIdle: isDataIdle
    },
    price: {
      priceData,
      status: priceStatus,
      error: priceError,
      fetchPrice,
      startAutoRefresh,
      stopAutoRefresh,
      connectWebSocket,
      disconnectWebSocket,
      clearError: clearPriceError,
      reset: resetPrice,
      isLoading: isPriceLoading,
      isSuccess: isPriceSuccess,
      isError: isPriceError,
      isIdle: isPriceIdle,
      isAutoRefreshing,
      isWebSocketConnected
    },
    history: {
      historyData,
      status: historyStatus,
      error: historyError,
      currentTimeframe,
      fetchHistory,
      changeTimeframe,
      clearCache,
      clearError: clearHistoryError,
      reset: resetHistory,
      isLoading: isHistoryLoading,
      isSuccess: isHistorySuccess,
      isError: isHistoryError,
      isIdle: isHistoryIdle,
      cacheSize
    }
  }
}